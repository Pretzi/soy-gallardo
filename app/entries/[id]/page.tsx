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

  const handleDownloadImage = async () => {
    try {
      // Fetch the image as a blob
      const response = await fetch(`/api/entries/${id}/image`);
      if (!response.ok) {
        throw new Error('Error al descargar la imagen');
      }
      
      const blob = await response.blob();
      const fileName = `entry-${entry?.folio || id}.jpg`;
      
      // Check if Web Share API is available (better for mobile)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile && navigator.share && navigator.canShare) {
        try {
          // Convert blob to File for Web Share API
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          
          // Check if we can share files
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Entrada ${entry?.folio || id}`,
              text: 'Guardar imagen de entrada',
            });
            return; // Successfully shared/saved
          }
        } catch (shareError: any) {
          // If share fails or user cancels, fall through to download method
          console.log('Web Share API not available or cancelled, using fallback');
        }
      }
      
      // Fallback: Create blob URL and download/open
      const blobUrl = URL.createObjectURL(blob);
      
      if (isMobile) {
        // On mobile, open image in new tab - users can long-press to save to photos
        // This is the most reliable way for iOS/Android to save to photo album
        window.open(blobUrl, '_blank');
      } else {
        // On desktop, trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error: any) {
      alert(error.message || 'Error al descargar la imagen');
    }
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

        {/* Header with title */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Detalles de Entrada</h1>
          
          {/* Toolbar - Desktop */}
          <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
            {/* Primary Actions */}
            <div className="flex items-center gap-2 border-r border-gray-200 pr-2">
              <OfflineLink href={`/entries/${id}/edit`} offlineMessage="La edición no está disponible sin conexión.">
                <Button variant="secondary" className="h-9 px-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Editar
                </Button>
              </OfflineLink>
            </div>

            {/* PDF Actions */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button 
                onClick={() => isOnline ? handleDownloadPDF() : alert('PDF no disponible sin conexión.')}
                disabled={!isOnline}
                variant="secondary"
                className={`h-9 px-3 flex items-center ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6.75m6 3a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v8.25A2.25 2.25 0 004.5 19.5h15z" />
                </svg>
                PDF
              </Button>
            </div>

            {/* Image Actions */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
              <Button 
                onClick={() => isOnline ? handleDownloadImage() : alert('Imagen no disponible sin conexión.')}
                disabled={!isOnline}
                variant="secondary"
                className={`h-9 px-3 flex items-center ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Imagen
              </Button>
            </div>

            {/* Danger Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
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

        {/* Mobile toolbar */}
        <div className="md:hidden mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
            {/* Primary Actions */}
            <div className="flex flex-col gap-2 mb-2 pb-2 border-b border-gray-200">
              <OfflineLink href={`/entries/${id}/edit`} className="w-full" offlineMessage="La edición no está disponible sin conexión.">
                <Button variant="secondary" className="w-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Editar
                </Button>
              </OfflineLink>
            </div>

            {/* PDF Actions */}
            <div className="flex flex-col gap-2 mb-2 pb-2 border-b border-gray-200">
              <Button 
                onClick={() => isOnline ? handleDownloadPDF() : alert('PDF no disponible sin conexión.')} 
                variant="secondary" 
                disabled={!isOnline}
                className={`w-full flex items-center justify-center ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6.75m6 3a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v8.25A2.25 2.25 0 004.5 19.5h15z" />
                </svg>
                Descargar PDF
              </Button>
            </div>

            {/* Image Actions */}
            <div className="flex flex-col gap-2 mb-2 pb-2 border-b border-gray-200">
              <Button 
                onClick={() => isOnline ? handleDownloadImage() : alert('Imagen no disponible sin conexión.')} 
                variant="secondary" 
                disabled={!isOnline}
                className={`w-full flex items-center justify-center ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Descargar Imagen
              </Button>
            </div>

            {/* Danger Actions */}
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
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
                <label className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Comunidad</label>
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
