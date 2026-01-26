'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EntryForm } from '@/components/forms/EntryForm';
import type { Entry, EntryCreate } from '@/lib/validation';
import { useOffline } from '@/contexts/OfflineContext';
import { getEntryLocal, saveEntryLocal, addToQueue, savePhotosLocal, getPhotosLocal, cacheLocalidades, cacheSecciones } from '@/lib/indexeddb';

type EntryWithSync = Entry & { syncStatus?: 'synced' | 'pending' | 'failed' };

export default function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isOnline, refreshStats } = useOffline();
  const [entry, setEntry] = useState<EntryWithSync | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useSelfieProcessing, setUseSelfieProcessing] = useState(false);
  
  // Store photos as blobs for offline use
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [ineFrontBlob, setIneFrontBlob] = useState<Blob | null>(null);
  const [ineBackBlob, setIneBackBlob] = useState<Blob | null>(null);

  useEffect(() => {
    loadEntry();
  }, [id, isOnline]);

  // Cache dropdown options when online
  useEffect(() => {
    const cacheDropdownOptions = async () => {
      if (isOnline) {
        try {
          const [localidadesRes, seccionesRes] = await Promise.all([
            fetch('/api/options/localidades'),
            fetch('/api/options/secciones')
          ]);
          
          if (localidadesRes.ok && seccionesRes.ok) {
            const localidades = await localidadesRes.json();
            const secciones = await seccionesRes.json();
            await cacheLocalidades(localidades.localidades || localidades);
            await cacheSecciones(secciones.secciones || secciones);
          }
        } catch (error) {
          console.warn('Failed to cache dropdown options:', error);
        }
      }
    };
    
    cacheDropdownOptions();
  }, [isOnline]);

  const loadEntry = async () => {
    try {
      setIsLoading(true);
      
      if (isOnline) {
        // Try to fetch from server
        try {
          const response = await fetch(`/api/entries/${id}`);
          if (!response.ok) {
            throw new Error('Entrada no encontrada');
          }
          const data = await response.json();
          setEntry(data);
          
          // Save to IndexedDB
          await saveEntryLocal({ ...data, syncStatus: 'synced' });
        } catch (fetchError) {
          console.warn('Failed to fetch from server, loading from cache:', fetchError);
          const localEntry = await getEntryLocal(id);
          if (localEntry) {
            setEntry(localEntry);
          } else {
            throw fetchError;
          }
        }
      } else {
        // Load from IndexedDB
        const localEntry = await getEntryLocal(id);
        if (localEntry) {
          setEntry(localEntry);
          
          // Load photos from IndexedDB if they exist as blobs
          const photos = await getPhotosLocal(id);
          if (photos) {
            setSelfieBlob(photos.selfie || null);
            setIneFrontBlob(photos.ineFront || null);
            setIneBackBlob(photos.ineBack || null);
          }
        } else {
          throw new Error('Entrada no encontrada en modo offline');
        }
      }
    } catch (error: any) {
      alert(error.message || 'Error al cargar la entrada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data: EntryCreate) => {
    if (!isOnline) {
      // OFFLINE MODE: Save locally and queue for sync
      const updatedEntry: any = {
        ...entry,
        ...data,
        id,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      
      // Save entry to IndexedDB
      await saveEntryLocal(updatedEntry);
      
      // Save photos as blobs if they changed
      if (selfieBlob || ineFrontBlob || ineBackBlob) {
        await savePhotosLocal(id, {
          selfie: selfieBlob || undefined,
          ineFront: ineFrontBlob || undefined,
          ineBack: ineBackBlob || undefined,
        });
      }
      
      // Add to sync queue
      await addToQueue({
        type: 'UPDATE',
        data: { ...data, id },
      });
      
      // Refresh stats
      await refreshStats();
      
      router.push(`/entries/${id}`);
      return;
    }
    
    // ONLINE MODE: Update on server
    const response = await fetch(`/api/entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }
    
    const updatedEntry = await response.json();
    
    // Save to IndexedDB as synced
    await saveEntryLocal({ ...updatedEntry, syncStatus: 'synced' });

    router.push(`/entries/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Entrada no encontrada</p>
          <Link href="/entries">
            <Button>Volver a la lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Entrada</h1>
          <Link href={`/entries/${id}`}>
            <Button variant="secondary">Cancelar</Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {entry.syncStatus === 'pending' && (
            <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                🟡 Esta entrada tiene cambios pendientes de sincronización
              </p>
            </div>
          )}
          
          <EntryForm
            initialData={entry}
            ineFrontUrl={entry.ineFrontUrl}
            ineBackUrl={entry.ineBackUrl}
            onSelfieBlob={setSelfieBlob}
            onIneFrontBlob={setIneFrontBlob}
            onIneBackBlob={setIneBackBlob}
            isOnline={isOnline}
            useSelfieProcessing={useSelfieProcessing}
            onSelfieProcessingChange={setUseSelfieProcessing}
            onSubmit={handleFormSubmit}
            submitLabel="Guardar Cambios"
          />
        </div>
      </div>
    </div>
  );
}
