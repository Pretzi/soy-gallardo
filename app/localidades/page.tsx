'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Autocomplete } from '@/components/ui/Autocomplete';
import type { Entry } from '@/lib/validation';

export default function LocalidadesPage() {
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [selectedLocalidad, setSelectedLocalidad] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);

  // Load localidades on mount
  useEffect(() => {
    loadLocalidades();
  }, []);

  const loadLocalidades = async () => {
    try {
      const response = await fetch('/api/options/localidades');
      const data = await response.json();
      setLocalidades(data.localidades);
    } catch (error) {
      console.error('Error loading localidades:', error);
      alert('Error al cargar comunidades');
    }
  };

  const handleLocalidadChange = (value: string) => {
    setSelectedLocalidad(value);
    setEntries([]);
    setAllEntries([]);
    setTotalCount(0);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setEntries(allEntries.slice(startIndex, endIndex));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedLocalidad) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const params = new URLSearchParams({
            localidad: selectedLocalidad,
            limit: '1000', // Load all entries
          });

          const response = await fetch(`/api/localidades?${params.toString()}`);
          const data = await response.json();

          setAllEntries(data.entries);
          setTotalCount(data.totalCount);
          setCurrentPage(1); // Reset to first page
          
          // Set first page entries
          setEntries(data.entries.slice(0, itemsPerPage));
        } catch (error) {
          console.error('Error loading entries:', error);
          alert('Error al cargar las entradas');
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    } else {
      // Clear entries when no localidad selected
      setEntries([]);
      setAllEntries([]);
      setTotalCount(0);
    }
  }, [selectedLocalidad, itemsPerPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        {/* Back button for mobile */}
        <Link href="/entries" className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 md:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="font-medium">Volver</span>
        </Link>

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Entradas por Comunidad</h1>
            <Link href="/entries" className="hidden md:block">
              <Button variant="secondary">Volver</Button>
            </Link>
          </div>
          <p className="text-sm md:text-base text-gray-600">
            Selecciona una localidad para ver todos los afiliados registrados
          </p>
        </div>

        {/* Comunidad Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="max-w-full">
            <Autocomplete
              label="Buscar Comunidad"
              placeholder="Escribe el nombre de la comunidad..."
              value={selectedLocalidad}
              onChange={handleLocalidadChange}
              options={localidades}
              required
            />
          </div>

          {/* Metrics */}
          {selectedLocalidad && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Comunidad Seleccionada</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{selectedLocalidad}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Total de Afiliados</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{totalCount}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 font-medium">Mostrando</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{entries?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Entries List */}
        {isLoading && (!entries || entries.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-600">Cargando...</p>
          </div>
        )}

        {!isLoading && selectedLocalidad && (!entries || entries.length === 0) && (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-600">No hay entradas para esta localidad</p>
          </div>
        )}

        {entries && entries.length > 0 && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.folio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.nombre} {entry.segundoNombre} {entry.apellidos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.seccionElectoral || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/entries/${entry.id}`}>
                          <Button variant="secondary" className="text-sm py-1">
                            Ver detalles
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow p-4 relative">
                  <Link href={`/entries/${entry.id}`}>
                    <button className="absolute top-4 right-4 text-orange-500 hover:text-orange-600">
                      👁️
                    </button>
                  </Link>
                  <div className="space-y-2 pr-10">
                    <div>
                      <span className="text-xs text-gray-500 font-medium">Folio:</span>
                      <p className="text-sm font-semibold text-gray-900">{entry.folio}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium">Nombre:</span>
                      <p className="text-sm text-gray-900">
                        {entry.nombre} {entry.segundoNombre} {entry.apellidos}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium">Sección:</span>
                      <p className="text-sm text-gray-900">{entry.seccionElectoral || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > itemsPerPage && (
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
