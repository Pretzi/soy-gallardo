import { docClient, TABLE_NAME } from '../lib/aws/dynamo';
import { ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

async function clearTable() {
  console.log('🗑️  Clearing table...\n');
  
  let itemsDeleted = 0;
  let lastEvaluatedKey: any = undefined;
  
  do {
    // Scan for items
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: 'PK, SK',
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
      break;
    }
    
    // Batch delete in chunks of 25
    const items = scanResult.Items;
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map((item) => ({
              DeleteRequest: {
                Key: {
                  PK: item.PK,
                  SK: item.SK,
                },
              },
            })),
          },
        })
      );
      
      itemsDeleted += batch.length;
      console.log(`Deleted ${itemsDeleted} items...`);
    }
    
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`\n✅ Total items deleted: ${itemsDeleted}`);
}

clearTable().catch(console.error);
