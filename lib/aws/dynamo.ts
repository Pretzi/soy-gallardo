import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Entry, EntryCreate, EntryUpdate } from '../validation';
import { normalizeForSearch, formatFullName } from '../validation';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME || 'PRETZI_ENTRIES';

// Export for external scripts
export { docClient, TABLE_NAME };

// Helper function for numerical folio sorting
function sortByFolioDescending(entries: Entry[]): void {
  entries.sort((a, b) => {
    const folioA = parseInt(a.folio || '0', 10);
    const folioB = parseInt(b.folio || '0', 10);
    return folioB - folioA; // Descending order (latest first)
  });
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get the latest folio number
export async function getLatestFolio(): Promise<string> {
  try {
    // Query using GSI1 to get entries sorted by folio (descending)
    // This is more efficient than scanning all entries
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix) AND attribute_exists(folio)',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
        },
        ProjectionExpression: 'folio',
      })
    );

    if (!result.Items || result.Items.length === 0) {
      // No entries yet, start with 000001
      return '000001';
    }

    // Sort folios numerically to get the highest
    const folios = result.Items.map(item => item.folio as string)
      .filter(folio => folio && /^\d{6}$/.test(folio)); // Validate 6-digit format

    if (folios.length === 0) {
      return '000001';
    }

    // Convert to numbers for sorting and get max
    const numericFolios = folios.map(folio => parseInt(folio, 10));
    const maxFolio = Math.max(...numericFolios);
    const nextFolio = maxFolio + 1;

    // Convert back to 6-digit format (e.g., 000001, 000002, etc.)
    return nextFolio.toString().padStart(6, '0');
  } catch (error) {
    console.error('Error getting latest folio:', error);
    throw new Error('No se pudo obtener el último folio');
  }
}

// Check if folio already exists
export async function folioExists(folio: string): Promise<boolean> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :folio',
        ExpressionAttributeValues: {
          ':folio': `FOLIO#${folio}`,
        },
        Limit: 1,
      })
    );

    return (result.Items?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking folio existence:', error);
    return false;
  }
}

// Create entry
export async function createEntry(data: EntryCreate): Promise<Entry> {
  const id = generateId();
  const now = new Date().toISOString();
  
  const fullName = formatFullName({
    nombre: data.nombre,
    segundoNombre: data.segundoNombre,
    apellidos: data.apellidos,
  }).toUpperCase();

  const entry: Entry = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ENTRY#${id}`,
        SK: `METADATA`,
        GSI1PK: `FOLIO#${data.folio}`,
        GSI1SK: `ENTRY#${id}`,
        GSI2PK: `NAME#${fullName}`,
        GSI2SK: `ENTRY#${id}`,
        GSI3PK: entry.localidad ? `LOCALIDAD#${entry.localidad}` : undefined,
        GSI3SK: entry.localidad ? `ENTRY#${id}` : undefined,
        GSI4PK: entry.seccionElectoral ? `SECCION#${entry.seccionElectoral}` : undefined,
        GSI4SK: entry.seccionElectoral ? `ENTRY#${id}` : undefined,
        ...entry,
      },
    })
  );

  return entry;
}

// Get entry by ID
export async function getEntry(id: string): Promise<Entry | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ENTRY#${id}`,
        SK: `METADATA`,
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, ...entry } = result.Item;
  return entry as Entry;
}

// Update entry
export async function updateEntry(id: string, data: EntryUpdate): Promise<Entry | null> {
  const existing = await getEntry(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedEntry = { ...existing, ...data, updatedAt: now };

  // Recalculate full name for search (use UPPERCASE to match import script)
  const fullName = formatFullName({
    nombre: updatedEntry.nombre,
    segundoNombre: updatedEntry.segundoNombre,
    apellidos: updatedEntry.apellidos,
  }).toUpperCase();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ENTRY#${id}`,
        SK: `METADATA`,
        GSI1PK: `FOLIO#${updatedEntry.folio}`,
        GSI1SK: `ENTRY#${id}`,
        GSI2PK: `NAME#${fullName}`,
        GSI2SK: `ENTRY#${id}`,
        GSI3PK: updatedEntry.localidad ? `LOCALIDAD#${updatedEntry.localidad}` : undefined,
        GSI3SK: updatedEntry.localidad ? `ENTRY#${id}` : undefined,
        GSI4PK: updatedEntry.seccionElectoral ? `SECCION#${updatedEntry.seccionElectoral}` : undefined,
        GSI4SK: updatedEntry.seccionElectoral ? `ENTRY#${id}` : undefined,
        ...updatedEntry,
      },
    })
  );

  return updatedEntry;
}

// Delete entry
export async function deleteEntry(id: string): Promise<boolean> {
  const existing = await getEntry(id);
  if (!existing) {
    return false;
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ENTRY#${id}`,
        SK: `METADATA`,
      },
    })
  );

  return true;
}

// List entries with pagination
export async function listEntries(limit: number = 50, lastEvaluatedKey?: Record<string, any>): Promise<{
  entries: Entry[];
  lastEvaluatedKey?: Record<string, any>;
}> {
  // Scan all items first (without limit) to sort properly
  const allItems: any[] = [];
  let scanLastKey: Record<string, any> | undefined = undefined;
  let result: any;

  do {
    result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
        },
        ExclusiveStartKey: scanLastKey,
      })
    );

    if (result.Items) {
      allItems.push(...result.Items);
    }

    scanLastKey = result.LastEvaluatedKey;
  } while (scanLastKey);

  // Map and sort all entries by folio (descending - latest first)
  const allEntries = allItems.map((item) => {
    const { PK, SK, GSI1PK, GSI2PK, ...entry } = item;
    return entry as Entry;
  });

  allEntries.sort((a, b) => {
    // Parse folios as integers for proper sorting (e.g., "000001" -> 1, "000123" -> 123)
    const folioA = parseInt(a.folio || '0', 10);
    const folioB = parseInt(b.folio || '0', 10);
    return folioB - folioA; // Descending order (latest first)
  });

  // Implement pagination after sorting
  const startIndex = lastEvaluatedKey ? (lastEvaluatedKey.index as number) : 0;
  const endIndex = startIndex + limit;
  const entries = allEntries.slice(startIndex, endIndex);

  // Create pagination token
  const newLastKey = endIndex < allEntries.length ? { index: endIndex } : undefined;

  return {
    entries,
    lastEvaluatedKey: newLastKey,
  };
}

// Search entries by folio or name
export async function searchEntries(query: string): Promise<Entry[]> {
  // Try folio search first (exact match)
  const folioResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :folio',
      ExpressionAttributeValues: {
        ':folio': `FOLIO#${query}`,
      },
    })
  );

  if (folioResult.Items && folioResult.Items.length > 0) {
    const entries = folioResult.Items.map((item) => {
      const { PK, SK, GSI1PK, GSI2PK, ...entry } = item;
      return entry as Entry;
    });
    sortByFolioDescending(entries);
    return entries;
  }

  // If no folio match, do a scan with name filter (use uppercase for matching imported data)
  const upperQuery = query.toUpperCase();
  const nameResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND contains(GSI2PK, :query)',
      ExpressionAttributeValues: {
        ':prefix': 'ENTRY#',
        ':query': upperQuery,
      },
    })
  );

  const entries = (nameResult.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI2PK, ...entry } = item;
    return entry as Entry;
  });
  
  sortByFolioDescending(entries);
  return entries;
}

// Batch write entries (for seeding)
export async function batchWriteEntries(entries: EntryCreate[]): Promise<void> {
  const BATCH_SIZE = 25; // DynamoDB limit

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const putRequests = batch.map((data) => {
      const id = generateId();
      const now = new Date().toISOString();
      
      const fullName = formatFullName({
        nombre: data.nombre,
        segundoNombre: data.segundoNombre,
        apellidos: data.apellidos,
      });
      const normalizedName = normalizeForSearch(fullName);

      const entry: Entry = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };

      return {
        PutRequest: {
          Item: {
            PK: `ENTRY#${id}`,
            SK: `METADATA#${id}`,
            GSI1PK: `FOLIO#${data.folio}`,
            GSI2PK: `NAME#${normalizedName.substring(0, 50)}`,
            ...entry,
          },
        },
      };
    });

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      })
    );

    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} written (${batch.length} items)`);
  }
}

// Get entries by localidad with pagination
export async function getEntriesByLocalidad(
  localidad: string,
  limit: number = 20,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  entries: Entry[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
}> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND localidad = :localidad',
      ExpressionAttributeValues: {
        ':prefix': 'ENTRY#',
        ':localidad': localidad,
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const entries: Entry[] = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, ...entry } = item;
    return entry as Entry;
  });

  sortByFolioDescending(entries);

  return {
    entries,
    lastEvaluatedKey: result.LastEvaluatedKey,
    count: result.Count || 0,
  };
}

// Get entries by sección electoral with pagination
export async function getEntriesBySeccion(
  seccion: string,
  limit: number = 20,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  entries: Entry[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
}> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND seccionElectoral = :seccion',
      ExpressionAttributeValues: {
        ':prefix': 'ENTRY#',
        ':seccion': seccion,
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const entries: Entry[] = (result.Items || []).map((item) => {
    const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, ...entry } = item;
    return entry as Entry;
  });

  sortByFolioDescending(entries);

  return {
    entries,
    lastEvaluatedKey: result.LastEvaluatedKey,
    count: result.Count || 0,
  };
}

// Get total count by localidad
export async function getCountByLocalidad(localidad: string): Promise<number> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND localidad = :localidad',
      ExpressionAttributeValues: {
        ':prefix': 'ENTRY#',
        ':localidad': localidad,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}

// Get total count by sección
export async function getCountBySeccion(seccion: string): Promise<number> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND seccionElectoral = :seccion',
      ExpressionAttributeValues: {
        ':prefix': 'ENTRY#',
        ':seccion': seccion,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}
