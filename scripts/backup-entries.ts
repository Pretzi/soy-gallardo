/**
 * Backup Script: Export all entries from DynamoDB to JSON
 *
 * Creates a timestamped backup file before running migrations or risky operations.
 *
 * Usage: npx tsx scripts/backup-entries.ts
 * Output: backups/entries-YYYY-MM-DD-HHmmss.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { docClient, TABLE_NAME } from '../lib/aws/dynamo';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

async function backupEntries() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19); // YYYY-MM-DDTHHmmss
  const backupDir = join(process.cwd(), 'backups');
  const backupPath = join(backupDir, `entries-${timestamp}.json`);

  console.log('📦 Starting DynamoDB entries backup...\n');

  try {
    const allItems: Record<string, unknown>[] = [];
    let lastKey: Record<string, unknown> | undefined = undefined;
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
        allItems.push(...result.Items);
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    mkdirSync(backupDir, { recursive: true });
    writeFileSync(backupPath, JSON.stringify(allItems, null, 2), 'utf-8');

    console.log(`✅ Backed up ${allItems.length} entries`);
    console.log(`📁 Saved to: ${backupPath}\n`);
  } catch (error: unknown) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backupEntries()
  .then(() => {
    console.log('✨ Backup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  });
