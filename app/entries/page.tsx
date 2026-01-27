'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OfflineLink } from '@/components/ui/OfflineLink';
import type { Entry } from '@/lib/validation';
import { useOffline } from '@/contexts/OfflineContext';
import { getEntriesLocal, saveEntryLocal, searchEntriesLocal, cacheLocalidades, cacheSecciones } from '@/lib/indexeddb';

export default function EntriesPage() {
  const { isOnline, isSyncing, pendingCount, syncNow, refreshStats } = useOffline();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadEntries();
  }, [isOnline]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      
      if (isOnline) {
        // Try to fetch from server
        try {
          const response = await fetch('/api/entries?limit=10000');
      const data = await response.json();
          
          // Save to IndexedDB
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
          
      setAllEntries(data.entries);
      setTotalCount(data.entries.length);
      setCurrentPage(1);
      setEntries(data.entries.slice(0, itemsPerPage));
          
          // Refresh stats after loading
          await refreshStats();
          
        } catch (fetchError) {
          console.warn('Failed to fetch from server, loading from cache:', fetchError);
          await loadFromCache();
        }
      } else {
        // Load from IndexedDB
        await loadFromCache();
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      alert('Error al cargar las entradas');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadFromCache = async () => {
    const localEntries = await getEntriesLocal();
    setAllEntries(localEntries);
    setTotalCount(localEntries.length);
    setCurrentPage(1);
    setEntries(localEntries.slice(0, itemsPerPage));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setEntries(allEntries.slice(startIndex, endIndex));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      if (isOnline) {
        // Try server search first
        try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.entries);
        } catch (fetchError) {
          console.warn('Server search failed, searching locally:', fetchError);
          const localResults = await searchEntriesLocal(searchQuery);
          setSearchResults(localResults);
        }
      } else {
        // Search locally
        const localResults = await searchEntriesLocal(searchQuery);
        setSearchResults(localResults);
      }
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error al buscar');
    } finally {
      setIsSearching(false);
    }
  };

  const displayEntries = searchQuery.trim() ? searchResults : entries;

  // Helper to render sync status badge
  const renderSyncBadge = (entry: any) => {
    if (!entry.syncStatus || entry.syncStatus === 'synced') return null;
    
    if (entry.syncStatus === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
          🟡 Pendiente
        </span>
      );
    }
    
    if (entry.syncStatus === 'failed') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
          ❌ Error
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Registro de Afiliados</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Gestiona tu base de datos de afiliados</p>
          </div>
          <Link href="/entries/new" className="w-full md:w-auto">
            <Button className="w-full md:w-auto text-base md:text-lg font-bold py-4 md:py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              + Nueva Entrada
            </Button>
          </Link>
        </div>

        {/* Offline Status Banner */}
        {!isOnline && (
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  🟡 Modo Offline - Trabajando con datos locales
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Los cambios se sincronizarán automáticamente cuando haya conexión
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sync Status Banner */}
        {isOnline && pendingCount > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {isSyncing ? (
                    <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">
                    {isSyncing ? '🔄 Sincronizando...' : `⏳ ${pendingCount} ${pendingCount === 1 ? 'entrada pendiente' : 'entradas pendientes'} de sincronización`}
                  </p>
                </div>
              </div>
              {!isSyncing && (
                <Button
                  onClick={syncNow}
                  disabled={isSyncing}
                  className="ml-4 text-sm px-4 py-2"
                >
                  Sincronizar Ahora
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2 items-stretch">
            <Input
              placeholder="Buscar por folio o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-base md:text-sm"
            />
            <Button type="submit" isLoading={isSearching} className="text-sm md:text-base px-4 md:px-6">
              Buscar
            </Button>
            {searchQuery && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-sm md:text-base px-4 md:px-6"
              >
                ✕
              </Button>
            )}
          </div>
        </form>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6">
          <Link href="/localidades" className="flex-1 md:flex-none">
            <Button variant="secondary" className="w-full text-sm md:text-base">
              Ver por Localidades
            </Button>
          </Link>
          <Link href="/secciones" className="flex-1 md:flex-none">
            <Button variant="secondary" className="w-full text-sm md:text-base">
              Ver por Secciones
            </Button>
          </Link>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-base md:text-lg text-gray-600">Cargando entradas...</p>
          </div>
        ) : !displayEntries || displayEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base md:text-lg text-gray-600">
              {searchQuery ? 'No se encontraron resultados' : 'No hay entradas registradas'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {(displayEntries || []).map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold">Folio</p>
                        {renderSyncBadge(entry)}
                      </div>
                      <p className="text-lg font-bold text-orange-600">{entry.folio || 'Pendiente'}</p>
                    </div>
                    <OfflineLink href={`/entries/${entry.id}`} offlineMessage="Los detalles de entrada no están disponibles sin conexión.">
                      <button className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </OfflineLink>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Nombre</p>
                      <p className="text-base font-medium text-gray-900">
                        {entry.nombre} {entry.segundoNombre} {entry.apellidos}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Teléfono</p>
                        <p className="text-sm text-gray-700">{entry.telefono}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Localidad</p>
                        <p className="text-sm text-gray-700">{entry.localidad || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-orange-50 to-orange-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Localidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-orange-900 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(displayEntries || []).map((entry) => (
                    <tr key={entry.id} className="hover:bg-orange-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{entry.folio || 'Pendiente'}</span>
                          {renderSyncBadge(entry)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.nombre} {entry.segundoNombre} {entry.apellidos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.telefono}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entry.localidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <OfflineLink href={`/entries/${entry.id}`} offlineMessage="Los detalles de entrada no están disponibles sin conexión.">
                          <span className="text-orange-600 hover:text-orange-700 font-medium cursor-pointer">
                            Ver detalles →
                          </span>
                        </OfflineLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!searchQuery && totalCount > itemsPerPage && (
              <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} entradas
                </p>
                
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm"
                  >
                    ← Anterior
                  </Button>
                  
                  {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      const totalPages = Math.ceil(totalCount / itemsPerPage);
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 py-2 text-gray-500">...</span>
                        )}
                        <Button
                          variant={page === currentPage ? 'primary' : 'secondary'}
                          onClick={() => handlePageChange(page)}
                          className="px-3 py-2 text-sm min-w-[40px]"
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))}
                  
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                    className="px-3 py-2 text-sm"
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
