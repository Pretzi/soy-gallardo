/**
 * Migration Script: Normalize GSI2PK for accent-insensitive name search
 *
 * Updates all existing entries so GSI2PK uses normalized names (accents removed).
 * This enables searching for "German" to find "Germán", "Jose" to find "José", etc.
 *
 * Usage: npx tsx scripts/migrate-name-search.ts
 */

import { docClient, TABLE_NAME } from '../lib/aws/dynamo';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { normalizeForSearch } from '../lib/validation';

interface EntryItem {
  PK: string;
  SK: string;
  id: string;
  nombre: string;
  segundoNombre?: string;
  apellidos: string;
  GSI2PK?: string;
}

function formatFullName(entry: {
  nombre: string;
  segundoNombre?: string;
  apellidos: string;
}): string {
  const parts = [entry.nombre, entry.segundoNombre, entry.apellidos].filter(
    Boolean
  );
  return parts.join(' ');
}

async function migrateEntries() {
  console.log('🔄 Starting name search migration...\n');
  console.log(
    'This will normalize GSI2PK for all entries so name search works with/without accents.\n'
  );

  try {
    // Step 1: Scan all entries
    console.log('📊 Step 1: Scanning all entries from DynamoDB...');
    const allItems: EntryItem[] = [];
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
        allItems.push(...(result.Items as EntryItem[]));
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    console.log(`✅ Found ${allItems.length} entries\n`);

    if (allItems.length === 0) {
      console.log('✨ No entries to migrate. Exiting.');
      return;
    }

    // Step 2: Update GSI2PK for each entry
    console.log('🔧 Step 2: Normalizing GSI2PK for name search...\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allItems.length; i++) {
      const entry = allItems[i];
      const fullName = formatFullName({
        nombre: entry.nombre || '',
        segundoNombre: entry.segundoNombre,
        apellidos: entry.apellidos || '',
      });
      const normalizedName = normalizeForSearch(fullName).toUpperCase();
      const newGSI2PK = `NAME#${normalizedName}`;

      // Skip if already normalized (no accents in current GSI2PK)
      const currentGSI2PK = entry.GSI2PK || '';
      if (currentGSI2PK === newGSI2PK) {
        skippedCount++;
        if ((i + 1) % 100 === 0) {
          console.log(`⏭️  Progress: ${i + 1}/${allItems.length}`);
        }
        continue;
      }

      try {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: entry.PK,
              SK: entry.SK,
            },
            UpdateExpression: 'SET GSI2PK = :newGSI2PK, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':newGSI2PK': newGSI2PK,
              ':updatedAt': new Date().toISOString(),
            },
          })
        );

        updatedCount++;
        if (updatedCount <= 10 || (i + 1) % 100 === 0) {
          console.log(
            `✅ [${i + 1}/${allItems.length}] ${entry.id}: "${currentGSI2PK}" → "${newGSI2PK}"`
          );
        }
      } catch (error: any) {
        console.error(
          `❌ [${i + 1}/${allItems.length}] Error updating ${entry.id}:`,
          error.message
        );
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total entries: ${allItems.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Already correct (skipped): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n✨ Migration complete! Name search should now work for German/Germán, Jose/José, etc.');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateEntries()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
