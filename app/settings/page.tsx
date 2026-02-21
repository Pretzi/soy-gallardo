'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useOffline } from '@/contexts/OfflineContext';
import { 
  getStorageStats, 
  clearAllData, 
  getQueue,
  retryFailedItems,
  cacheLocalidades,
  cacheSecciones,
  getCachedLocalidades,
  getCachedSecciones,
} from '@/lib/indexeddb';

export default function SettingsPage() {
  const { isOnline, isSyncing, syncNow, refreshStats, storageStats, pendingCount, lastSyncTime } = useOffline();
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [cachedLocalidades, setCachedLocalidades] = useState(0);
  const [cachedSecciones, setCachedSecciones] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    loadStats();
  }, [storageStats]);

  const loadStats = async () => {
    // Get failed queue items
    const queue = await getQueue();
    const failed = queue.filter(item => item.status === 'failed').length;
    setFailedCount(failed);

    // Get cached dropdown stats
    const localidades = await getCachedLocalidades();
    const secciones = await getCachedSecciones();
    setCachedLocalidades(localidades?.length || 0);
    setCachedSecciones(secciones?.length || 0);

    // Get browser storage estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      setStorageEstimate({
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!isOnline) {
      alert('Necesitas estar en línea para descargar datos');
      return;
    }

    setIsDownloading(true);
    try {
      // Fetch all entries
      const response = await fetch('/api/entries?limit=10000');
      const data = await response.json();

      // Import to IndexedDB
      const { saveEntryLocal } = await import('@/lib/indexeddb');
      for (const entry of data.entries) {
        await saveEntryLocal({ ...entry, syncStatus: 'synced' });
      }

      // Cache dropdown options
      const [localidadesRes, seccionesRes] = await Promise.all([
        fetch('/api/options/localidades'),
        fetch('/api/options/secciones'),
      ]);

      if (localidadesRes.ok && seccionesRes.ok) {
        const localidades = await localidadesRes.json();
        const secciones = await seccionesRes.json();
        await cacheLocalidades(localidades.localidades || localidades);
        await cacheSecciones(secciones.secciones || secciones);
      }

      await refreshStats();
      await loadStats();
      alert(`✅ ${data.entries.length} entradas descargadas para uso offline`);
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Error al descargar datos');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todos los datos guardados localmente? Los cambios pendientes se perderán.')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearAllData();
      await refreshStats();
      await loadStats();
      alert('✅ Cache limpiado correctamente');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error al limpiar cache');
    } finally {
      setIsClearing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!isOnline) {
      alert('Necesitas estar en línea para reintentar sincronización');
      return;
    }

    try {
      await retryFailedItems();
      await syncNow();
      await loadStats();
    } catch (error) {
      console.error('Error retrying failed items:', error);
      alert('Error al reintentar sincronización');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  };

  const usagePercent = storageEstimate 
    ? Math.round((storageEstimate.usage / storageEstimate.quota) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración Offline</h1>
          <Link href="/entries">
            <Button variant="secondary">Volver</Button>
          </Link>
        </div>

        {/* Connection Status */}
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          isOnline ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold ${isOnline ? 'text-green-800' : 'text-yellow-800'}`}>
                {isOnline ? '🟢 Conectado' : '🟡 Modo Offline'}
              </p>
              <p className={`text-xs mt-1 ${isOnline ? 'text-green-700' : 'text-yellow-700'}`}>
                Última sincronización: {formatDate(lastSyncTime)}
              </p>
            </div>
            {isOnline && pendingCount > 0 && (
              <Button onClick={syncNow} disabled={isSyncing} className="text-sm">
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
              </Button>
            )}
          </div>
        </div>

        {/* Storage Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Estadísticas de Almacenamiento</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Entradas guardadas</span>
              <span className="font-bold text-gray-900">{storageStats?.entriesCount || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="text-gray-700">Cambios pendientes</span>
              <span className="font-bold text-yellow-800">{pendingCount}</span>
            </div>

            {failedCount > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="text-gray-700">Sincronizaciones fallidas</span>
                <span className="font-bold text-red-800">{failedCount}</span>
              </div>
            )}

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Fotos guardadas</span>
              <span className="font-bold text-gray-900">{storageStats?.photosCount || 0}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Comunidades cacheadas</span>
              <span className="font-bold text-gray-900">{cachedLocalidades}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Secciones cacheadas</span>
              <span className="font-bold text-gray-900">{cachedSecciones}</span>
            </div>

            {storageEstimate && (
              <div className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Espacio utilizado</span>
                  <span className="font-bold text-gray-900">
                    {formatBytes(storageEstimate.usage)} / {formatBytes(storageEstimate.quota)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">{usagePercent}% utilizado</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Acciones</h2>
          
          <div className="space-y-3">
            <Button
              onClick={handleDownloadAll}
              disabled={!isOnline || isDownloading}
              className="w-full"
            >
              {isDownloading ? '📥 Descargando...' : '📥 Descargar Todo para Offline'}
            </Button>
            <p className="text-xs text-gray-600">
              Descarga todas las entradas para trabajar sin conexión
            </p>

            {failedCount > 0 && (
              <>
                <Button
                  onClick={handleRetryFailed}
                  disabled={!isOnline || isSyncing}
                  variant="secondary"
                  className="w-full"
                >
                  🔄 Reintentar Sincronizaciones Fallidas ({failedCount})
                </Button>
                <p className="text-xs text-gray-600">
                  Intenta sincronizar nuevamente los cambios que fallaron
                </p>
              </>
            )}

            <Button
              onClick={handleClearCache}
              disabled={isClearing}
              variant="secondary"
              className="w-full text-red-600 hover:text-red-700"
            >
              {isClearing ? '🗑️ Limpiando...' : '🗑️ Limpiar Cache Local'}
            </Button>
            <p className="text-xs text-red-600">
              ⚠️ Esto eliminará todos los datos guardados localmente. Los cambios no sincronizados se perderán.
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Consejos para Modo Offline</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Descarga todas las entradas antes de ir a zonas sin conexión</li>
            <li>• Los cambios se sincronizarán automáticamente cuando recuperes conexión</li>
            <li>• Puedes crear, editar y ver entradas sin conexión</li>
            <li>• Las fotos se suben cuando hay conexión disponible</li>
            <li>• Limpia el cache periódicamente para liberar espacio</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
