'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { processQueue, type SyncProgress } from '@/lib/sync-queue';
import { getQueue, getLastSyncTime, getStorageStats } from '@/lib/indexeddb';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncProgress: SyncProgress | null;
  lastSyncTime: Date | null;
  storageStats: { entriesCount: number; queueCount: number; photosCount: number } | null;
  syncNow: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [storageStats, setStorageStats] = useState<{ entriesCount: number; queueCount: number; photosCount: number } | null>(null);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const [queue, stats, lastSync] = await Promise.all([
        getQueue(),
        getStorageStats(),
        getLastSyncTime(),
      ]);
      
      setPendingCount(queue.filter(item => item.status === 'pending').length);
      setStorageStats(stats);
      setLastSyncTime(lastSync);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  }, []);

  // Sync now function
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setSyncProgress({ total: 0, completed: 0, failed: 0 });

    try {
      await processQueue((progress) => {
        setSyncProgress(progress);
      });

      // Refresh stats after sync
      await refreshStats();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isOnline, isSyncing, refreshStats]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when connection returns
      setTimeout(() => syncNow(), 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // Load initial stats
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        syncProgress,
        lastSyncTime,
        storageStats,
        syncNow,
        refreshStats,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}
