import {
  getPendingQueueItems,
  updateQueueItem,
  deleteQueueItem,
  getPhotosLocal,
  deletePhotosLocal,
  saveEntryLocal,
  deleteEntryLocal,
  setLastSyncTime,
  type QueuedAction,
} from './indexeddb';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

export type SyncCallback = (progress: SyncProgress) => void;

// Convert Blob to File for FormData
async function blobToFile(blob: Blob, filename: string): Promise<File> {
  return new File([blob], filename, { type: blob.type });
}

// Upload photo to S3
async function uploadPhoto(blob: Blob, filename: string, endpoint: string): Promise<{ url: string; s3Key: string }> {
  const formData = new FormData();
  const file = await blobToFile(blob, filename);
  formData.append(endpoint === '/api/selfie/upload' ? 'selfie' : 'ine', file);
  
  if (endpoint === '/api/ine/upload') {
    // Determine side based on filename
    const side = filename.includes('front') ? 'front' : 'back';
    formData.append('side', side);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

// Process a single queue item
async function processQueueItem(item: QueuedAction): Promise<void> {
  // Mark as syncing
  item.status = 'syncing';
  await updateQueueItem(item);

  try {
    if (item.type === 'CREATE') {
      // Get photos from local storage
      const tempId = item.tempId || item.data.id;
      const photos = tempId ? await getPhotosLocal(tempId) : null;

      let selfieUrl = item.data.selfieUrl;
      let selfieS3Key = item.data.selfieS3Key;
      let ineFrontUrl = item.data.ineFrontUrl;
      let ineFrontS3Key = item.data.ineFrontS3Key;
      let ineBackUrl = item.data.ineBackUrl;
      let ineBackS3Key = item.data.ineBackS3Key;

      // Upload photos if they exist as blobs
      if (photos) {
        if (photos.selfie) {
          const result = await uploadPhoto(photos.selfie, 'selfie.jpg', '/api/selfie/upload');
          selfieUrl = result.url;
          selfieS3Key = result.s3Key;
        }

        if (photos.ineFront) {
          const result = await uploadPhoto(photos.ineFront, 'ine-front.jpg', '/api/ine/upload');
          ineFrontUrl = result.url;
          ineFrontS3Key = result.s3Key;
        }

        if (photos.ineBack) {
          const result = await uploadPhoto(photos.ineBack, 'ine-back.jpg', '/api/ine/upload');
          ineBackUrl = result.url;
          ineBackS3Key = result.s3Key;
        }
      }

      // Retry logic for folio conflicts (max 5 attempts)
      let folio: string = '';
      let createResponse: Response | null = null;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;
        
        // Get next folio from server
        const folioResponse = await fetch('/api/entries/next-folio');
        if (!folioResponse.ok) {
          throw new Error('Failed to get next folio');
        }
        const folioData = await folioResponse.json();
        folio = folioData.folio;

        // Create entry on server with real folio
        const entryData = {
          ...item.data,
          folio, // Replace with real folio
          selfieUrl,
          selfieS3Key,
          ineFrontUrl,
          ineFrontS3Key,
          ineBackUrl,
          ineBackS3Key,
        };

        createResponse = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          const errorMessage = error.error || 'Failed to create entry';
          
          // Check if it's a folio conflict
          if (errorMessage.toLowerCase().includes('folio') && 
              (errorMessage.toLowerCase().includes('existe') || 
               errorMessage.toLowerCase().includes('exists') ||
               errorMessage.toLowerCase().includes('duplicate'))) {
            console.warn(`Folio ${folio} conflict on attempt ${attempts}, retrying...`);
            
            // If we haven't reached max attempts, continue loop to retry
            if (attempts < maxAttempts) {
              // Add a small delay to reduce race condition likelihood
              await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
              continue;
            }
          }
          
          // Non-folio error or max retries reached
          throw new Error(errorMessage);
        }

        // Success! Break out of retry loop
        break;
      }

      if (!createResponse || !createResponse.ok) {
        throw new Error(`Failed to create entry after ${maxAttempts} attempts`);
      }

      const serverEntry = await createResponse.json();

      // Update local entry with server data
      if (tempId) {
        // Delete temp entry
        await deleteEntryLocal(tempId);
      }

      // Save with real ID and mark as synced
      await saveEntryLocal({
        ...serverEntry,
        syncStatus: 'synced',
      });

      // Clean up photos
      if (tempId && photos) {
        await deletePhotosLocal(tempId);
      }

    } else if (item.type === 'UPDATE') {
      // Update existing entry
      const updateResponse = await fetch(`/api/entries/${item.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Failed to update entry');
      }

      const serverEntry = await updateResponse.json();

      // Update local entry
      await saveEntryLocal({
        ...serverEntry,
        syncStatus: 'synced',
      });

    } else if (item.type === 'DELETE') {
      // Delete entry on server
      const deleteResponse = await fetch(`/api/entries/${item.data.id}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const error = await deleteResponse.json();
        throw new Error(error.error || 'Failed to delete entry');
      }

      // Delete from local storage
      await deleteEntryLocal(item.data.id!);
    }

    // Remove from queue
    await deleteQueueItem(item.id);

  } catch (error) {
    console.error('Error processing queue item:', error);
    
    // Mark as failed and increment retry count
    item.status = 'failed';
    item.retryCount++;
    await updateQueueItem(item);

    throw error;
  }
}

// Process entire queue
export async function processQueue(onProgress?: SyncCallback): Promise<{ success: number; failed: number }> {
  const pendingItems = await getPendingQueueItems();
  
  let completed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      onProgress?.({
        total: pendingItems.length,
        completed,
        failed,
        current: `${item.type}: ${item.data.nombre || 'Entry'}`,
      });

      await processQueueItem(item);
      completed++;
    } catch (error) {
      console.error('Failed to process item:', error);
      failed++;
    }
  }

  // Update last sync time
  await setLastSyncTime(new Date());

  onProgress?.({
    total: pendingItems.length,
    completed,
    failed,
  });

  return { success: completed, failed };
}

// Retry failed items (with exponential backoff)
export async function retryFailedItems(maxRetries: number = 3): Promise<void> {
  const db = await import('./indexeddb').then(m => m.getDB());
  const queue = await db.getAll('queue');
  const failedItems = queue.filter(item => item.status === 'failed' && item.retryCount < maxRetries);

  for (const item of failedItems) {
    // Reset status to pending
    item.status = 'pending';
    await updateQueueItem(item);
  }
}
