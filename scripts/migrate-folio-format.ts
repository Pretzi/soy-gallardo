/**
 * Migration Script: Convert Folio Format from XXX.XXX.XXX to XXXXXX
 * 
 * This script migrates all existing entries in DynamoDB to the new 6-digit folio format.
 * Old format: 000.000.001 (9 digits with dots)
 * New format: 000001 (6 digits)
 * 
 * Usage: npx tsx scripts/migrate-folio-format.ts
 */

import { docClient, TABLE_NAME } from '../lib/aws/dynamo';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

interface OldEntry {
  id: string;
  folio: string;
  PK: string;
  SK: string;
  GSI1PK: string;
}

/**
 * Convert old folio format (XXX.XXX.XXX) to new format (XXXXXX)
 * Examples:
 * - "000.000.001" -> "000001"
 * - "000.000.123" -> "000123"
 * - "000.000.1116" -> "001116" (4-digit last segment, prepend 00)
 * - "001.234.567" -> "999999" (cap at 999999 for 6 digits)
 */
function convertFolio(oldFolio: string): string {
  const parts = oldFolio.split('.');
  
  // Check if last segment is 4 digits (e.g., "000.000.1116")
  if (parts.length === 3 && parts[2].length === 4) {
    // Just prepend "00" to the 4-digit segment
    return '00' + parts[2];
  }
  
  // Otherwise, use the original logic: remove dots and convert to number
  const numericValue = parseInt(oldFolio.replace(/\./g, ''), 10);
  
  // For 6-digit format, max is 999999
  const cappedValue = Math.min(numericValue, 999999);
  
  // Convert back to 6-digit string with leading zeros
  return cappedValue.toString().padStart(6, '0');
}

async function migrateEntries() {
  console.log('🔄 Starting folio format migration...\n');
  console.log('Old format: XXX.XXX.XXX (9 digits with dots)');
  console.log('New format: XXXXXX (6 digits)\n');

  try {
    // Step 1: Scan all entries
    console.log('📊 Step 1: Scanning all entries from DynamoDB...');
    const allItems: OldEntry[] = [];
    let lastKey: Record<string, any> | undefined = undefined;
    let result;

    do {
      result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :prefix)',
          ExpressionAttributeValues: {
            ':prefix': 'ENTRY#',
          },
          ExclusiveStartKey: lastKey,
        })
      );

      if (result.Items) {
        allItems.push(...(result.Items as OldEntry[]));
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    console.log(`✅ Found ${allItems.length} entries to migrate\n`);

    if (allItems.length === 0) {
      console.log('✨ No entries to migrate. Exiting.');
      return;
    }

    // Step 2: Convert and update each entry
    console.log('🔧 Step 2: Converting folios and updating entries...\n');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; oldFolio: string; error: string }> = [];

    for (let i = 0; i < allItems.length; i++) {
      const entry = allItems[i];
      const oldFolio = entry.folio;
      
      // Skip if already in new format (6 digits without dots)
      if (/^\d{6}$/.test(oldFolio)) {
        console.log(`⏭️  [${i + 1}/${allItems.length}] Entry ${entry.id} already has new format: ${oldFolio}`);
        successCount++;
        continue;
      }

      // Skip if invalid old format (accept both XXX.XXX.XXX and XXX.XXX.XXXX)
      if (!/^\d{3}\.\d{3}\.\d{3,4}$/.test(oldFolio)) {
        console.log(`⚠️  [${i + 1}/${allItems.length}] Entry ${entry.id} has invalid format: ${oldFolio} - SKIPPING`);
        errors.push({ id: entry.id, oldFolio, error: 'Invalid format' });
        errorCount++;
        continue;
      }

      const newFolio = convertFolio(oldFolio);

      try {
        // Update the entry with new folio
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: entry.PK,
              SK: entry.SK,
            },
            UpdateExpression: 'SET folio = :newFolio, GSI1PK = :newGSI1PK, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':newFolio': newFolio,
              ':newGSI1PK': `FOLIO#${newFolio}`,
              ':updatedAt': new Date().toISOString(),
            },
          })
        );

        console.log(`✅ [${i + 1}/${allItems.length}] Updated entry ${entry.id}: ${oldFolio} → ${newFolio}`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ [${i + 1}/${allItems.length}] Error updating entry ${entry.id}:`, error.message);
        errors.push({ id: entry.id, oldFolio, error: error.message });
        errorCount++;
      }
    }

    // Step 3: Report results
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total entries: ${allItems.length}`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS:');
      errors.forEach(({ id, oldFolio, error }) => {
        console.log(`  - Entry ${id} (${oldFolio}): ${error}`);
      });
    }

    console.log('\n✨ Migration complete!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateEntries()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
