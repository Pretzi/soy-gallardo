import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Entry, EntryCreate } from './validation';

// Database schema
interface EntryDB extends DBSchema {
  entries: {
    key: string;
    value: Entry & { syncStatus: 'synced' | 'pending' | 'failed' };
    indexes: { 'by-folio': string; 'by-name': string };
  };
  queue: {
    key: string;
    value: QueuedAction;
  };
  metadata: {
    key: string;
    value: any;
  };
  photos: {
    key: string;
    value: PhotoStore;
  };
}

export interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: number;
  data: EntryCreate & { id?: string }; // id is required for UPDATE and DELETE
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  tempId?: string; // For CREATE actions with temp IDs
}

interface PhotoStore {
  entryId: string;
  selfie?: Blob;
  ineFront?: Blob;
  ineBack?: Blob;
}

const DB_NAME = 'soy-gallardo-db';
const DB_VERSION = 1;

// Get database instance
export async function getDB(): Promise<IDBPDatabase<EntryDB>> {
  return openDB<EntryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Entries store
      if (!db.objectStoreNames.contains('entries')) {
        const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
        entryStore.createIndex('by-folio', 'folio');
        entryStore.createIndex('by-name', 'searchableName');
      }

      // Queue store
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'entryId' });
      }
    },
  });
}

// Generate temporary ID
export function generateTempId(): string {
  return `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ========== ENTRIES CRUD ==========

export async function saveEntryLocal(entry: Entry & { syncStatus: 'synced' | 'pending' | 'failed' }): Promise<void> {
  const db = await getDB();
  await db.put('entries', entry);
}

export async function getEntryLocal(id: string): Promise<(Entry & { syncStatus: 'synced' | 'pending' | 'failed' }) | undefined> {
  const db = await getDB();
  return db.get('entries', id);
}

export async function getEntriesLocal(): Promise<(Entry & { syncStatus: 'synced' | 'pending' | 'failed' })[]> {
  const db = await getDB();
  const entries = await db.getAll('entries');
  
  // Sort by folio descending (latest first), matching server behavior
  entries.sort((a, b) => {
    // Pending entries without folio come first
    if (!a.folio && !b.folio) {
      // Sort by createdAt for temp entries
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (!a.folio) return -1; // Pending entries first
    if (!b.folio) return 1;
    
    // Sort by folio number descending
    const folioA = parseInt(a.folio, 10) || 0;
    const folioB = parseInt(b.folio, 10) || 0;
    return folioB - folioA;
  });
  
  return entries;
}

export async function deleteEntryLocal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('entries', id);
}

export async function searchEntriesLocal(query: string): Promise<(Entry & { syncStatus: 'synced' | 'pending' | 'failed' })[]> {
  const db = await getDB();
  const entries = await db.getAll('entries');
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = entries.filter(entry => {
    const searchText = `${entry.folio || ''} ${entry.nombre} ${entry.segundoNombre || ''} ${entry.apellidos}`;
    const normalizedText = searchText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedText.includes(normalizedQuery);
  });
  
  // Sort results by folio descending (matching server behavior)
  filtered.sort((a, b) => {
    if (!a.folio && !b.folio) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (!a.folio) return -1;
    if (!b.folio) return 1;
    
    const folioA = parseInt(a.folio, 10) || 0;
    const folioB = parseInt(b.folio, 10) || 0;
    return folioB - folioA;
  });
  
  return filtered;
}

// ========== QUEUE OPERATIONS ==========

export async function addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<string> {
  const db = await getDB();
  const queueItem: QueuedAction = {
    ...action,
    id: `QUEUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };
  await db.add('queue', queueItem);
  return queueItem.id;
}

export async function getQueue(): Promise<QueuedAction[]> {
  const db = await getDB();
  return db.getAll('queue');
}

export async function getPendingQueueItems(): Promise<QueuedAction[]> {
  const db = await getDB();
  const queue = await db.getAll('queue');
  return queue.filter(item => item.status === 'pending');
}

export async function updateQueueItem(item: QueuedAction): Promise<void> {
  const db = await getDB();
  await db.put('queue', item);
}

export async function deleteQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('queue', id);
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function retryFailedItems(maxRetries: number = 3): Promise<void> {
  const db = await getDB();
  const queue = await db.getAll('queue');
  const failedItems = queue.filter(item => item.status === 'failed' && item.retryCount < maxRetries);

  for (const item of failedItems) {
    // Reset status to pending
    item.status = 'pending';
    await db.put('queue', item);
  }
}

// ========== PHOTOS ==========

export async function savePhotosLocal(entryId: string, photos: Partial<PhotoStore>): Promise<void> {
  const db = await getDB();
  const existing = await db.get('photos', entryId);
  await db.put('photos', {
    entryId,
    selfie: photos.selfie || existing?.selfie,
    ineFront: photos.ineFront || existing?.ineFront,
    ineBack: photos.ineBack || existing?.ineBack,
  });
}

export async function getPhotosLocal(entryId: string): Promise<PhotoStore | undefined> {
  const db = await getDB();
  return db.get('photos', entryId);
}

export async function deletePhotosLocal(entryId: string): Promise<void> {
  const db = await getDB();
  await db.delete('photos', entryId);
}

// ========== METADATA ==========

export async function setMetadata(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('metadata', { key, value });
}

export async function getMetadata(key: string): Promise<any> {
  const db = await getDB();
  const item = await db.get('metadata', key);
  return item?.value;
}

// Cache dropdown options
export async function cacheLocalidades(localidades: string[]): Promise<void> {
  await setMetadata('localidades', localidades);
}

export async function getCachedLocalidades(): Promise<string[] | null> {
  return await getMetadata('localidades');
}

export async function cacheSecciones(secciones: string[]): Promise<void> {
  await setMetadata('secciones', secciones);
}

export async function getCachedSecciones(): Promise<string[] | null> {
  return await getMetadata('secciones');
}

export async function setLastSyncTime(time: Date): Promise<void> {
  await setMetadata('lastSyncTime', time.toISOString());
}

export async function getLastSyncTime(): Promise<Date | null> {
  const time = await getMetadata('lastSyncTime');
  return time ? new Date(time) : null;
}

// ========== UTILITIES ==========

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['entries', 'queue', 'metadata', 'photos'], 'readwrite');
  await Promise.all([
    tx.objectStore('entries').clear(),
    tx.objectStore('queue').clear(),
    tx.objectStore('metadata').clear(),
    tx.objectStore('photos').clear(),
  ]);
  await tx.done;
}

export async function getStorageStats(): Promise<{
  entriesCount: number;
  queueCount: number;
  photosCount: number;
}> {
  const db = await getDB();
  const [entriesCount, queueCount, photosCount] = await Promise.all([
    db.count('entries'),
    db.count('queue'),
    db.count('photos'),
  ]);
  return { entriesCount, queueCount, photosCount };
}
