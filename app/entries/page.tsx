'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Entry } from '@/lib/validation';

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/entries?limit=100');
      const data = await response.json();
      setEntries(data.entries);
    } catch (error) {
      console.error('Error loading entries:', error);
      alert('Error al cargar las entradas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.entries);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error al buscar');
    } finally {
      setIsSearching(false);
    }
  };

  const displayEntries = searchQuery.trim() ? searchResults : entries;

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
              {(displayEntries || []).slice(0, 20).map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Folio</p>
                      <p className="text-lg font-bold text-orange-600">{entry.folio}</p>
                    </div>
                    <Link href={`/entries/${entry.id}`}>
                      <button className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </Link>
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
              {(displayEntries || []).length > 20 && (
                <div className="text-center py-4 text-gray-600 text-sm">
                  Mostrando 20 de {(displayEntries || []).length} entradas. 
                  <br />
                  Usa la búsqueda o consulta desde escritorio para ver más.
                </div>
              )}
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
                        {entry.folio}
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
                        <Link href={`/entries/${entry.id}`}>
                          <span className="text-orange-600 hover:text-orange-700 font-medium cursor-pointer">
                            Ver detalles →
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
