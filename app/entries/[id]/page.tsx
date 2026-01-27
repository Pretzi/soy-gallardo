'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { OfflineLink } from '@/components/ui/OfflineLink';
import type { Entry } from '@/lib/validation';
import { useOffline } from '@/contexts/OfflineContext';
import { getEntryLocal, saveEntryLocal, deleteEntryLocal, addToQueue, deletePhotosLocal } from '@/lib/indexeddb';

export default function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isOnline, refreshStats } = useOffline();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadEntry();
  }, [id, isOnline]);

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

  const handleDownloadPDF = () => {
    window.open(`/api/entries/${id}/pdf`, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta entrada? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    try {
      if (!isOnline) {
        // OFFLINE MODE: Queue for deletion
        await addToQueue({
          type: 'DELETE',
          data: { id } as any,
        });

        // Delete locally
        await deleteEntryLocal(id);
        await deletePhotosLocal(id);

        // Refresh stats
        await refreshStats();

        alert('Entrada marcada para eliminación. Se eliminará del servidor cuando haya conexión.');
        // Use window.location for offline-friendly navigation
        window.location.href = '/entries';
      } else {
        // ONLINE MODE: Delete from server
        const response = await fetch(`/api/entries/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al eliminar la entrada');
        }

        // Delete locally
        await deleteEntryLocal(id);
        await deletePhotosLocal(id);

        // Use window.location for offline-friendly navigation
        window.location.href = '/entries';
      }
    } catch (error: any) {
      alert(error.message || 'Error al eliminar la entrada');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-base md:text-lg text-gray-800 font-medium">Cargando...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-base md:text-lg text-gray-800 mb-6 font-medium">Entrada no encontrada</p>
          <Link href="/entries">
            <Button className="px-6 py-3">Volver a la lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        {/* Back button for mobile */}
        <Link href="/entries" className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 md:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="font-medium">Volver</span>
        </Link>

        {/* Header with title and desktop buttons */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Detalles de Entrada</h1>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex gap-2">
            <OfflineLink href={`/entries/${id}/edit`} offlineMessage="La edición no está disponible sin conexión.">
              <Button variant="secondary">Editar</Button>
            </OfflineLink>
            <Button 
              onClick={() => isOnline ? window.open(`/api/entries/${id}/pdf?preview=true`, '_blank') : alert('PDF no disponible sin conexión.')}
              disabled={!isOnline}
              className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Vista Previa PDF
            </Button>
            <Button 
              onClick={() => isOnline ? handleDownloadPDF() : alert('PDF no disponible sin conexión.')}
              disabled={!isOnline}
              className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Descargar PDF
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
            <Link href="/entries">
              <Button variant="secondary">Volver</Button>
            </Link>
          </div>
        </div>

        {/* Sync Status Banners */}
        {(entry as any).syncStatus === 'pending' && (
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              🟡 Esta entrada tiene cambios pendientes de sincronización
            </p>
          </div>
        )}
        
        {!isOnline && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
            <p className="text-sm font-medium text-blue-800">
              📱 Modo Offline - Viendo datos guardados localmente
            </p>
          </div>
        )}

        {/* Mobile action buttons */}
        <div className="flex flex-col gap-3 mb-6 md:hidden">
          <Button 
            onClick={() => isOnline ? window.open(`/api/entries/${id}/pdf?preview=true`, '_blank') : alert('PDF no disponible sin conexión.')} 
            disabled={!isOnline}
            className={`w-full text-base py-3 ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Vista Previa PDF {!isOnline && '(Sin conexión)'}
          </Button>
          <Button 
            onClick={() => isOnline ? handleDownloadPDF() : alert('PDF no disponible sin conexión.')} 
            variant="secondary" 
            disabled={!isOnline}
            className={`w-full text-base py-3 ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Descargar PDF {!isOnline && '(Sin conexión)'}
          </Button>
          <OfflineLink href={`/entries/${id}/edit`} className="w-full" offlineMessage="La edición no está disponible sin conexión.">
            <Button variant="secondary" className="w-full text-base py-3">
              Editar Entrada
            </Button>
          </OfflineLink>
          <Button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full text-base py-3 bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar Entrada'}
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Folio</label>
                <p className="text-base md:text-lg font-medium text-gray-900 mt-1">{entry.folio}</p>
              </div>

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Nombre Completo</label>
                <p className="text-base md:text-lg font-medium text-gray-900 mt-1">
                  {entry.nombre} {entry.segundoNombre} {entry.apellidos}
                </p>
              </div>

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Teléfono</label>
                <p className="text-base md:text-lg font-medium text-gray-900 mt-1">{entry.telefono || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Método de Contacto</label>
                <p className="text-base md:text-lg font-medium text-gray-900 capitalize mt-1">{entry.metodoContacto || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Fecha de Nacimiento</label>
                <p className="text-base md:text-lg font-medium text-gray-900 mt-1">{entry.fechaNacimiento || 'N/A'}</p>
              </div>

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Sección Electoral</label>
                <p className="text-base md:text-lg font-medium text-gray-900 mt-1">{entry.seccionElectoral || 'N/A'}</p>
              </div>

              {(entry as any).casilla && (
                <div>
                  <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Casilla</label>
                  <p className="text-sm md:text-base font-medium text-gray-900 mt-1">{(entry as any).casilla}</p>
                </div>
              )}

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Localidad</label>
                <p className="text-base md:text-lg font-medium text-gray-900 mt-1">{entry.localidad || 'N/A'}</p>
              </div>

              {(entry as any).cargo && (
                <div>
                  <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Cargo</label>
                  <p className="text-base md:text-lg font-medium text-gray-900 mt-1">{(entry as any).cargo}</p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {(entry as any).ineFrontUrl && (
                <div>
                  <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">INE Frontal</label>
                  <img
                    src={(entry as any).ineFrontUrl}
                    alt="INE Frontal"
                    className="mt-2 w-full max-w-md rounded-lg shadow-md mx-auto md:mx-0"
                  />
                </div>
              )}

              {(entry as any).ineBackUrl && (
                <div>
                  <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">INE Trasera</label>
                  <img
                    src={(entry as any).ineBackUrl}
                    alt="INE Trasera"
                    className="mt-2 w-full max-w-md rounded-lg shadow-md mx-auto md:mx-0"
                  />
                </div>
              )}

              {entry.selfieUrl && (
                <div>
                  <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Selfie</label>
                  <img
                    src={entry.selfieUrl}
                    alt="Selfie"
                    className="mt-2 w-full max-w-xs rounded-lg shadow-md mx-auto md:mx-0"
                  />
                </div>
              )}

              <div>
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Notas de Apoyos</label>
                <p className="text-base font-medium text-gray-900 whitespace-pre-wrap mt-1">
                  {entry.notasApoyos || 'Sin notas'}
                </p>
              </div>

              <div className="text-xs md:text-sm text-gray-600 pt-4 border-t border-gray-200">
                <p className="mb-1"><span className="font-semibold">Creado:</span> {new Date(entry.createdAt).toLocaleString('es-MX')}</p>
                <p><span className="font-semibold">Actualizado:</span> {new Date(entry.updatedAt).toLocaleString('es-MX')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
