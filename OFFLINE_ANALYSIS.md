# Offline Capability Analysis - Soy Gallardo App

**Generated:** January 25, 2026  
**Purpose:** Analyze offline capabilities for zones without internet connection

---

## 📋 Executive Summary

Your app is a **citizen registration system** for capturing INE (Mexican ID) data and selfies, storing them in AWS cloud services. Currently, **the app is 100% dependent on internet connectivity** and will not function offline. This document outlines what works/doesn't work offline and provides recommendations for enabling offline operation.

---

## 🏗️ Current App Architecture

### Core Technologies
- **Frontend:** Next.js 16 (React 19) - Server-side rendering
- **Backend:** Next.js API Routes (serverless functions)
- **Database:** AWS DynamoDB (cloud-based NoSQL)
- **Storage:** AWS S3 (cloud object storage)
- **AI Services:** OpenAI GPT-4o Vision API (INE parsing)
- **Image Processing:** @imgly/background-removal-node (selfie backgrounds)

### Key Features
1. **INE Upload & Parsing** - Upload front/back INE images, extract data via OpenAI
2. **Manual Data Entry** - Fill form with dropdowns (localidades, secciones)
3. **Selfie Upload** - Take selfie with background removal
4. **Entry Management** - Create, read, update, delete entries
5. **Search** - Search by folio or name
6. **PDF Generation** - Generate PDF with entry data and selfie
7. **Authentication** - Cookie-based auth via middleware

---

## 🔴 Features That REQUIRE Internet (Current State)

### ❌ Critical Dependencies (App Won't Work)

| Feature | Dependency | Reason |
|---------|-----------|---------|
| **Load Entries List** | AWS DynamoDB | Fetches all entries from cloud database |
| **Create New Entry** | AWS DynamoDB | Saves entry to cloud database |
| **Edit Entry** | AWS DynamoDB | Updates entry in cloud database |
| **View Entry Details** | AWS DynamoDB | Retrieves single entry from cloud |
| **Search Entries** | AWS DynamoDB | Queries database using GSI indexes |
| **Upload Selfie** | AWS S3 | Stores image in cloud bucket |
| **Upload INE Images** | AWS S3 | Stores INE images in cloud bucket |
| **INE Auto-Parsing** | OpenAI API | Requires API call to GPT-4o Vision |
| **Background Removal** | Server Processing | Runs on server (could be problematic) |
| **PDF Generation** | Server Processing | Generated server-side on-demand |
| **Authentication** | Server Cookies | Middleware checks auth token |

### 📊 Breakdown by User Flow

#### Flow 1: Creating a New Entry
```
Step 1: Upload INE → ❌ Requires S3 + OpenAI API
Step 2: Fill Form → ⚠️ Requires API to fetch dropdowns (localidades, secciones)
Step 3: Upload Selfie → ❌ Requires S3 upload + background processing
Step 4: Submit → ❌ Requires DynamoDB write + get next folio
```

#### Flow 2: Viewing/Searching Entries
```
Load List → ❌ Requires DynamoDB scan/query
Search → ❌ Requires DynamoDB GSI query
View Details → ❌ Requires DynamoDB get
Download PDF → ❌ Requires server-side PDF generation + S3 image fetch
```

#### Flow 3: Editing Entry
```
Load Entry → ❌ Requires DynamoDB get
Load Dropdowns → ❌ Requires API call
Update Entry → ❌ Requires DynamoDB update
```

---

## 🟢 What COULD Work Offline (With Implementation)

### Static Data (No Backend Required)
- Form UI rendering
- Input validation (client-side Zod schemas)
- Dropdowns (if cached locally)

### Features That Could Be Offline-First
- **✅ View Entries** - If synced to localStorage/IndexedDB
- **✅ Create Entries** - Queue for later sync
- **✅ Edit Entries** - Queue changes for sync
- **✅ Search Entries** - Search local cache
- **✅ Capture Photos** - Store locally first
- **⚠️ INE Parsing** - Manual entry only (no AI)
- **⚠️ PDF Generation** - Could use client-side library
- **❌ Background Removal** - Requires heavy processing (skip offline)

---

## 💡 Recommendations for Offline Support

### Strategy 1: **Progressive Web App (PWA) with Sync Queue** ⭐ RECOMMENDED

This approach allows the app to work fully offline and sync when connection returns.

#### Implementation Steps

##### 1. Add Service Worker for Offline Caching
```javascript
// public/service-worker.js
// Cache app shell, static assets, and API responses
```

##### 2. Use IndexedDB for Local Storage
Replace localStorage with IndexedDB (can store much more data):
- Store entries (up to 50-100 MB)
- Store dropdown options (localidades, secciones)
- Store captured photos as base64/blobs
- Store sync queue

##### 3. Implement Sync Queue
```typescript
interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: number;
  data: Entry;
  photos?: {
    selfie?: Blob;
    ineFront?: Blob;
    ineBack?: Blob;
  };
}
```

##### 4. Background Sync API
Use Background Sync API to automatically sync when connection returns:
```javascript
// Register background sync
navigator.serviceWorker.ready.then(registration => {
  registration.sync.register('sync-entries');
});
```

#### User Flow (Offline Mode)
```
1. User creates entry → Saved to IndexedDB
2. User captures selfie → Saved as Blob in IndexedDB
3. User uploads INE → Saved as Blob in IndexedDB
4. Entry marked as "pending sync" with yellow badge
5. When connection returns → Auto-sync to AWS
6. Update UI to show "synced" with green badge
```

---

### Strategy 2: **Download Full Dataset at Start** ⚠️ SIMPLER BUT LIMITED

Download all entries when app loads (with internet), then work offline.

#### Pros
- Simpler to implement
- Can view all existing entries offline
- Can search offline

#### Cons
- Initial sync requires internet
- Entries created offline won't appear on other devices until sync
- Large datasets (1000+ entries) may be slow to download
- Photos take significant storage space

#### Implementation
```typescript
// Download on app load (with internet)
useEffect(() => {
  const syncData = async () => {
    try {
      const entries = await fetch('/api/entries?limit=10000');
      const localidades = await fetch('/api/options/localidades');
      const secciones = await fetch('/api/options/secciones');
      
      // Store in IndexedDB
      await saveToIndexedDB('entries', entries);
      await saveToIndexedDB('localidades', localidades);
      await saveToIndexedDB('secciones', secciones);
      
      setOfflineMode(false);
    } catch (error) {
      setOfflineMode(true);
      // Load from IndexedDB
      const cachedData = await loadFromIndexedDB();
      setEntries(cachedData);
    }
  };
  
  syncData();
}, []);
```

---

### Strategy 3: **Hybrid Mode** ⭐⭐ BEST FOR YOUR USE CASE

Combine both strategies for maximum flexibility.

#### Features
1. **Download existing entries** on first load (requires internet once)
2. **Work fully offline** after initial sync
3. **Create/edit entries offline** with sync queue
4. **Periodic sync** when internet available
5. **Manual sync button** for user control

#### UI Indicators
```
🟢 Online - Connected to server
🟡 Offline - Working with cached data
🔴 Never Synced - No data available
⏳ Syncing - Uploading changes
✅ Synced - All changes saved
```

---

## 📝 Detailed Implementation Guide

### Phase 1: Local Storage Setup (2-3 days)

#### 1.1 Install Dependencies
```bash
npm install idb workbox-webpack-plugin next-pwa
```

#### 1.2 Create IndexedDB Helper
```typescript
// lib/indexeddb.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface EntryDB extends DBSchema {
  entries: {
    key: string;
    value: Entry;
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
}

export async function getDB(): Promise<IDBPDatabase<EntryDB>> {
  return openDB<EntryDB>('soy-gallardo-db', 1, {
    upgrade(db) {
      // Create entries store
      const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
      entryStore.createIndex('by-folio', 'folio');
      entryStore.createIndex('by-name', 'searchableName');
      
      // Create sync queue store
      db.createObjectStore('queue', { keyPath: 'id' });
      
      // Create metadata store (for last sync time, etc.)
      db.createObjectStore('metadata', { keyPath: 'key' });
    },
  });
}

// CRUD operations
export async function saveEntryLocal(entry: Entry): Promise<void> {
  const db = await getDB();
  await db.put('entries', entry);
}

export async function getEntriesLocal(): Promise<Entry[]> {
  const db = await getDB();
  return db.getAll('entries');
}

export async function searchEntriesLocal(query: string): Promise<Entry[]> {
  const db = await getDB();
  const entries = await db.getAll('entries');
  const normalized = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return entries.filter(entry => {
    const searchText = `${entry.folio} ${entry.nombre} ${entry.apellidos}`.toLowerCase();
    return searchText.includes(normalized);
  });
}
```

#### 1.3 Create Sync Queue Manager
```typescript
// lib/sync-queue.ts
interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: number;
  data: Entry;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
}

export async function addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<void> {
  const db = await getDB();
  const queueItem: QueuedAction = {
    ...action,
    id: generateId(),
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };
  await db.add('queue', queueItem);
}

export async function processQueue(): Promise<void> {
  const db = await getDB();
  const queue = await db.getAll('queue');
  const pending = queue.filter(item => item.status === 'pending');
  
  for (const item of pending) {
    try {
      // Update status to syncing
      item.status = 'syncing';
      await db.put('queue', item);
      
      // Attempt to sync
      if (item.type === 'CREATE') {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
      } else if (item.type === 'UPDATE') {
        await fetch(`/api/entries/${item.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
      }
      
      // Mark as synced and remove from queue
      await db.delete('queue', item.id);
    } catch (error) {
      console.error('Sync failed:', error);
      item.status = 'failed';
      item.retryCount++;
      await db.put('queue', item);
    }
  }
}
```

### Phase 2: Update App Components (3-4 days)

#### 2.1 Create Offline Context
```typescript
// contexts/OfflineContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
  lastSyncTime: Date | null;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  useEffect(() => {
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true);
      syncNow(); // Auto-sync when connection returns
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const syncNow = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await processQueue();
      setLastSyncTime(new Date());
      // Update pending count
      const db = await getDB();
      const queue = await db.getAll('queue');
      setPendingCount(queue.filter(i => i.status === 'pending').length);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <OfflineContext.Provider value={{ isOnline, isSyncing, pendingCount, syncNow, lastSyncTime }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOffline must be used within OfflineProvider');
  return context;
};
```

#### 2.2 Update Entry List Page
```typescript
// app/entries/page.tsx (modifications)
export default function EntriesPage() {
  const { isOnline, isSyncing, syncNow } = useOffline();
  
  useEffect(() => {
    const loadEntries = async () => {
      try {
        if (isOnline) {
          // Fetch from server
          const response = await fetch('/api/entries?limit=1000');
          const data = await response.json();
          
          // Save to IndexedDB
          for (const entry of data.entries) {
            await saveEntryLocal(entry);
          }
          
          setEntries(data.entries);
        } else {
          // Load from IndexedDB
          const localEntries = await getEntriesLocal();
          setEntries(localEntries);
        }
      } catch (error) {
        // Fallback to local
        const localEntries = await getEntriesLocal();
        setEntries(localEntries);
      }
    };
    
    loadEntries();
  }, [isOnline]);
  
  return (
    <div>
      {/* Online status indicator */}
      <div className={`p-3 mb-4 rounded-lg ${isOnline ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <div className="flex items-center justify-between">
          <span className={isOnline ? 'text-green-800' : 'text-yellow-800'}>
            {isOnline ? '🟢 Conectado' : '🟡 Modo Offline'}
          </span>
          {!isOnline && (
            <span className="text-sm text-yellow-600">
              Trabajando con datos guardados localmente
            </span>
          )}
          {isSyncing && (
            <span className="text-sm text-blue-600">⏳ Sincronizando...</span>
          )}
          <Button onClick={syncNow} disabled={!isOnline || isSyncing}>
            Sincronizar
          </Button>
        </div>
      </div>
      
      {/* Rest of the component */}
    </div>
  );
}
```

#### 2.3 Update Entry Form to Queue Saves
```typescript
// components/forms/EntryForm.tsx (modifications)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const { isOnline } = useOffline();
  
  if (isOnline) {
    // Normal save to server
    await onSubmit(formData as EntryCreate);
  } else {
    // Save locally and queue for sync
    const entry: Entry = {
      ...formData as EntryCreate,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending', // New field
    };
    
    // Save to IndexedDB
    await saveEntryLocal(entry);
    
    // Add to sync queue
    await addToQueue({
      type: 'CREATE',
      data: entry,
    });
    
    // Show success message
    alert('Entrada guardada localmente. Se sincronizará cuando haya conexión.');
    
    // Navigate back
    router.push('/entries');
  }
};
```

### Phase 3: Service Worker & PWA (1-2 days)

#### 3.1 Configure next-pwa
```javascript
// next.config.ts
import withPWA from 'next-pwa';

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})({
  // Your existing Next.js config
});

export default config;
```

#### 3.2 Add Web Manifest
```json
// public/manifest.json
{
  "name": "Soy Gallardo - Registro de Afiliados",
  "short_name": "Soy Gallardo",
  "description": "Sistema de registro de entradas con INE y selfie",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Phase 4: Testing & Optimization (2-3 days)

#### Test Scenarios
1. **Full Offline Creation**
   - Turn off internet
   - Create new entry with photos
   - Verify saved to IndexedDB
   - Turn on internet
   - Verify auto-sync

2. **Offline Search**
   - Load entries while online
   - Turn off internet
   - Search and verify results

3. **Conflict Resolution**
   - Create entry offline on device A
   - Create entry offline on device B
   - Sync both
   - Handle folio conflicts

4. **Large Dataset**
   - Test with 1000+ entries
   - Measure sync time
   - Optimize query performance

---

## 📊 Storage Capacity Analysis

### IndexedDB Storage Limits (per browser)
- **Chrome/Edge:** ~60% of available disk space
- **Firefox:** ~50% of available disk space  
- **Safari:** ~1 GB (more restrictive)

### Data Size Estimates
- **Single Entry (text only):** ~1 KB
- **Single Entry (with 3 photos @ 500KB each):** ~1.5 MB
- **1,000 Entries (text only):** ~1 MB
- **1,000 Entries (with photos):** ~1.5 GB
- **Dropdown Options (localidades + secciones):** ~50 KB

### Recommendations
1. **Store text data for all entries** - Very small footprint
2. **Store photos only for pending sync entries** - Reduces storage
3. **Compress photos before storing** - Use JPEG quality 80%
4. **Implement cache cleanup** - Remove synced photos after 7 days
5. **Show storage usage to users** - Let them manage cache

---

## 🚀 Quick Wins (Low Effort, High Impact)

If you want to start small, implement these first:

### 1. Cache Dropdown Options (30 minutes)
```typescript
// On first load
const localidades = await fetch('/api/options/localidades');
localStorage.setItem('localidades', JSON.stringify(localidades));

// On subsequent loads
const cached = localStorage.getItem('localidades');
if (cached) {
  setLocalidades(JSON.parse(cached));
}
```

### 2. Offline Indicator (15 minutes)
```typescript
const [isOnline, setIsOnline] = useState(true);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  setIsOnline(navigator.onLine);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### 3. Save Draft Locally (1 hour)
```typescript
// Auto-save form to localStorage every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    localStorage.setItem('entry-draft', JSON.stringify(formData));
  }, 30000);
  
  return () => clearInterval(interval);
}, [formData]);

// Restore on mount
useEffect(() => {
  const draft = localStorage.getItem('entry-draft');
  if (draft) {
    setFormData(JSON.parse(draft));
  }
}, []);
```

---

## 🎯 Recommended Implementation Timeline

### Week 1: Foundation
- ✅ Install dependencies (idb, next-pwa)
- ✅ Create IndexedDB helper functions
- ✅ Create sync queue system
- ✅ Add offline indicator to UI

### Week 2: Core Features
- ✅ Update entry list to use IndexedDB
- ✅ Update entry form to queue saves
- ✅ Implement local search
- ✅ Add sync button

### Week 3: Polish
- ✅ Add service worker & PWA support
- ✅ Implement background sync
- ✅ Add conflict resolution
- ✅ Test on mobile devices

### Week 4: Testing & Deployment
- ✅ Test all offline scenarios
- ✅ Performance optimization
- ✅ User training/documentation
- ✅ Production deployment

---

## ⚠️ Important Considerations

### 1. INE Parsing Will NOT Work Offline
- OpenAI API requires internet
- **Solution:** Provide manual entry mode (already implemented with "Skip" button)
- **Alternative:** Use on-device OCR (tesseract.js) - Less accurate but works offline

### 2. Photo Background Removal May Not Work Offline
- Currently done server-side
- **Solution:** Skip background removal when offline, upload original photo
- **Alternative:** Use client-side background removal (slower, may crash on low-end devices)

### 3. PDF Generation
- Currently server-side
- **Solution:** Use pdf-lib on client-side (already in dependencies!)
- **Implementation:** Generate PDF in browser, download directly

### 4. Folio Conflicts
- Two users create entries offline with same folio
- **Solution:** Use timestamp-based IDs offline, assign folio on sync
- **Alternative:** Pre-allocate folio ranges to devices

### 5. Authentication
- Cookie-based auth won't work offline
- **Solution:** Skip auth check when offline (risky)
- **Better:** Implement token-based auth with long expiration

---

## 🎓 Learning Resources

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [idb Library](https://github.com/jakearchibald/idb)

---

## 📞 Next Steps

1. **Decide on strategy** (I recommend Hybrid Mode - Strategy 3)
2. **Estimate development time** (2-4 weeks for full implementation)
3. **Prioritize features** (Start with Quick Wins if time is limited)
4. **Assign developer resources**
5. **Create detailed user stories**
6. **Begin implementation**

Would you like me to:
1. Start implementing the offline features?
2. Create a proof-of-concept with IndexedDB?
3. Generate code for specific components?
4. Help plan the project timeline?

Let me know how you'd like to proceed!
