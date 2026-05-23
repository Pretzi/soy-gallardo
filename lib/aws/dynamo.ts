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
import type { EntryNameRow } from '../duplicate-names';
import { isFolioQuery, normalizeFolioForLookup } from '../folio-search';
import { normalizeLocalidadForLookup } from '../localidad-search';
import type { Entry, EntryCreate, EntryUpdate } from '../validation';
import { normalizeForSearch, formatFullName } from '../validation';
import { randomBytes } from 'crypto';

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

// Generate unguessable public ID for member URLs (12 chars, lowercase + digits)
export function generatePublicId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) id += chars[bytes[i]! % chars.length];
  return id;
}

// Get the next available folio (max existing 6-digit folio + 1).
// Scan must paginate: a single Scan page can omit items (1MB limit) so Math.max would be wrong.
// ConsistentRead helps the newest entry appear immediately after create (avoids suggesting the same folio twice).
export async function getLatestFolio(): Promise<string> {
  try {
    const allFolioItems: { folio?: string }[] = [];
    let startKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :prefix) AND attribute_exists(folio)',
          ExpressionAttributeValues: {
            ':prefix': 'ENTRY#',
          },
          ProjectionExpression: 'folio',
          ExclusiveStartKey: startKey,
          ConsistentRead: true,
        })
      );

      if (result.Items?.length) {
        allFolioItems.push(...result.Items);
      }
      startKey = result.LastEvaluatedKey;
    } while (startKey);

    if (allFolioItems.length === 0) {
      return '000001';
    }

    const folios = allFolioItems
      .map((item) => item.folio as string)
      .filter((folio) => folio && /^\d{6}$/.test(folio));

    if (folios.length === 0) {
      return '000001';
    }

    const numericFolios = folios.map((folio) => parseInt(folio, 10));
    const maxFolio = Math.max(...numericFolios);
    const nextFolio = maxFolio + 1;

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

// Get entry by folio (for public member view)
export async function getEntryByFolio(folio: string): Promise<Entry | null> {
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

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];
    const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, ...entry } = item;
    return entry as Entry;
  } catch (error) {
    console.error('Error getting entry by folio:', error);
    return null;
  }
}

// Get entry by public ID (for public member URL - not guessable)
export async function getEntryByPublicId(publicId: string): Promise<Entry | null> {
  try {
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'begins_with(PK, :prefix) AND publicId = :publicId',
          ExpressionAttributeValues: {
            ':prefix': 'ENTRY#',
            ':publicId': publicId,
          },
          ExclusiveStartKey: lastKey,
          // No Limit: must scan pages until we find a match (Limit is applied before filter)
        })
      );

      if (result.Items && result.Items.length > 0) {
        const item = result.Items[0];
        const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, GSI3PK, GSI3SK, GSI4PK, GSI4SK, ...entry } = item;
        return entry as Entry;
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    return null;
  } catch (error) {
    console.error('Error getting entry by publicId:', error);
    return null;
  }
}

// Ensure entry has a publicId (generate and save if missing). Returns updated entry.
export async function ensureEntryPublicId(id: string): Promise<Entry | null> {
  const entry = await getEntry(id);
  if (!entry) return null;
  if (entry.publicId) return entry;
  const updated = await updateEntry(id, { publicId: generatePublicId() });
  return updated;
}

export async function createEntry(data: EntryCreate): Promise<Entry> {
  const id = generateId();
  const now = new Date().toISOString();
  
  const fullName = normalizeForSearch(
    formatFullName({
      nombre: data.nombre,
      segundoNombre: data.segundoNombre,
      apellidos: data.apellidos,
    })
  ).toUpperCase();

  const entry: Entry = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
    publicId: generatePublicId(),
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
  // Preserve publicId if not being updated (so partial updates don't clear it)
  if (updatedEntry.publicId === undefined && existing.publicId) {
    updatedEntry.publicId = existing.publicId;
  }

  // Recalculate full name for search (normalized + uppercase for accent-insensitive search)
  const fullName = normalizeForSearch(
    formatFullName({
      nombre: updatedEntry.nombre,
      segundoNombre: updatedEntry.segundoNombre,
      apellidos: updatedEntry.apellidos,
    })
  ).toUpperCase();

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

/**
 * Lightweight scan for duplicate / fuzzy-name tooling (fewer projected attributes).
 */
export async function scanEntriesForDuplicateAnalysis(): Promise<EntryNameRow[]> {
  const rows: EntryNameRow[] = [];
  let scanLastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
        },
        ExpressionAttributeNames: {
          '#eid': 'id',
          '#nom': 'nombre',
        },
        ProjectionExpression: '#eid, #nom, segundoNombre, apellidos, folio, telefono, localidad, createdAt',
        ExclusiveStartKey: scanLastKey,
      })
    );

    for (const item of result.Items ?? []) {
      const id = item.id != null ? String(item.id) : '';
      if (!id) continue;
      rows.push({
        id,
        nombre: item.nombre != null ? String(item.nombre) : '',
        segundoNombre:
          item.segundoNombre != null && item.segundoNombre !== ''
            ? String(item.segundoNombre)
            : undefined,
        apellidos: item.apellidos != null ? String(item.apellidos) : '',
        folio: item.folio != null ? String(item.folio) : undefined,
        telefono:
          item.telefono != null && item.telefono !== ''
            ? String(item.telefono)
            : undefined,
        localidad:
          item.localidad != null && item.localidad !== ''
            ? String(item.localidad)
            : undefined,
        createdAt: item.createdAt != null ? String(item.createdAt) : '',
      });
    }

    scanLastKey = result.LastEvaluatedKey;
  } while (scanLastKey);

  return rows;
}

// Search entries by folio (exact) or name (substring)
export async function searchEntries(query: string): Promise<Entry[]> {
  const trimmed = query.trim();

  // Folio: exact match only — no fuzzy / name fallback
  if (isFolioQuery(trimmed)) {
    const entry = await getEntryByFolio(normalizeFolioForLookup(trimmed));
    if (!entry) return [];
    sortByFolioDescending([entry]);
    return [entry];
  }

  // Name search (normalize to match stored GSI2PK format)
  const normalizedQuery = normalizeForSearch(trimmed).toUpperCase();
  const nameResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :prefix) AND contains(GSI2PK, :query)',
      ExpressionAttributeValues: {
        ':prefix': 'ENTRY#',
        ':query': normalizedQuery,
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
      const normalizedName = normalizeForSearch(fullName).toUpperCase();

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

// Get entries by localidad with pagination (full table scan pages — no Scan Limit)
export async function getEntriesByLocalidad(
  localidad: string,
  limit: number = 20,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  entries: Entry[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
}> {
  const normalized = normalizeLocalidadForLookup(localidad);
  const allEntries: Entry[] = [];
  let scanLastKey: Record<string, any> | undefined = lastEvaluatedKey;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix) AND localidad = :localidad',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
          ':localidad': normalized,
        },
        ExclusiveStartKey: scanLastKey,
      })
    );

    for (const item of result.Items ?? []) {
      const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, ...entry } = item;
      allEntries.push(entry as Entry);
      if (limit > 0 && allEntries.length >= limit) break;
    }

    scanLastKey = result.LastEvaluatedKey;
    if (limit > 0 && allEntries.length >= limit) break;
  } while (scanLastKey);

  sortByFolioDescending(allEntries);
  const entries = limit > 0 ? allEntries.slice(0, limit) : allEntries;

  return {
    entries,
    lastEvaluatedKey: scanLastKey,
    count: entries.length,
  };
}

// Get entries by sección electoral with pagination (full scan pages — no Scan Limit)
export async function getEntriesBySeccion(
  seccion: string,
  limit: number = 20,
  lastEvaluatedKey?: Record<string, any>
): Promise<{
  entries: Entry[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
}> {
  const allEntries: Entry[] = [];
  let scanLastKey: Record<string, any> | undefined = lastEvaluatedKey;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix) AND seccionElectoral = :seccion',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
          ':seccion': seccion,
        },
        ExclusiveStartKey: scanLastKey,
      })
    );

    for (const item of result.Items ?? []) {
      const { PK, SK, GSI1PK, GSI2PK, GSI1SK, GSI2SK, ...entry } = item;
      allEntries.push(entry as Entry);
      if (limit > 0 && allEntries.length >= limit) break;
    }

    scanLastKey = result.LastEvaluatedKey;
    if (limit > 0 && allEntries.length >= limit) break;
  } while (scanLastKey);

  sortByFolioDescending(allEntries);
  const entries = limit > 0 ? allEntries.slice(0, limit) : allEntries;

  return {
    entries,
    lastEvaluatedKey: scanLastKey,
    count: entries.length,
  };
}

// Get total count by localidad
export async function getCountByLocalidad(localidad: string): Promise<number> {
  const normalized = normalizeLocalidadForLookup(localidad);
  let total = 0;
  let scanLastKey: Record<string, any> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix) AND localidad = :localidad',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
          ':localidad': normalized,
        },
        Select: 'COUNT',
        ExclusiveStartKey: scanLastKey,
      })
    );

    total += result.Count ?? 0;
    scanLastKey = result.LastEvaluatedKey;
  } while (scanLastKey);

  return total;
}

// Get total count by sección
export async function getCountBySeccion(seccion: string): Promise<number> {
  let total = 0;
  let scanLastKey: Record<string, any> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix) AND seccionElectoral = :seccion',
        ExpressionAttributeValues: {
          ':prefix': 'ENTRY#',
          ':seccion': seccion,
        },
        Select: 'COUNT',
        ExclusiveStartKey: scanLastKey,
      })
    );

    total += result.Count ?? 0;
    scanLastKey = result.LastEvaluatedKey;
  } while (scanLastKey);

  return total;
}

// ========== CUSTOM LOCALIDADES (COMUNIDADES) ==========
// Stored in same table with PK OPTION#LOCALIDAD for user-added communities

const OPTION_LOCALIDAD_PK = 'OPTION#LOCALIDAD';

function localidadToSK(name: string): string {
  const normalized = (name || '').trim().toUpperCase();
  return `LOCALIDAD#${normalized}`;
}

export async function getCustomLocalidades(): Promise<string[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': OPTION_LOCALIDAD_PK,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    const names = result.Items.map((item) => (item.name as string) || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'));
    return names;
  } catch (error) {
    console.error('Error getting custom localidades:', error);
    return [];
  }
}

export async function addCustomLocalidad(name: string): Promise<string> {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('El nombre de la comunidad es requerido');
  }

  const displayName = trimmed;
  const sk = localidadToSK(displayName);
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: OPTION_LOCALIDAD_PK,
        SK: sk,
        name: displayName,
        createdAt: now,
      },
    })
  );

  return displayName;
}

export async function customLocalidadExists(name: string): Promise<boolean> {
  const sk = localidadToSK(name);
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: OPTION_LOCALIDAD_PK,
        SK: sk,
      },
    })
  );
  return !!result.Item;
}
