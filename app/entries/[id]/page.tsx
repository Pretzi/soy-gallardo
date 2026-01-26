'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { Entry } from '@/lib/validation';

export default function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntry();
  }, [id]);

  const loadEntry = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/entries/${id}`);
      if (!response.ok) {
        throw new Error('Entrada no encontrada');
      }
      const data = await response.json();
      setEntry(data);
    } catch (error: any) {
      alert(error.message || 'Error al cargar la entrada');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(`/api/entries/${id}/pdf`, '_blank');
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
            <Link href={`/entries/${id}/edit`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Button onClick={() => window.open(`/api/entries/${id}/pdf?preview=true`, '_blank')}>
              Vista Previa PDF
            </Button>
            <Button onClick={handleDownloadPDF}>Descargar PDF</Button>
            <Link href="/entries">
              <Button variant="secondary">Volver</Button>
            </Link>
          </div>
        </div>

        {/* Mobile action buttons */}
        <div className="flex flex-col gap-3 mb-6 md:hidden">
          <Button 
            onClick={() => window.open(`/api/entries/${id}/pdf?preview=true`, '_blank')} 
            className="w-full text-base py-3"
          >
            Vista Previa PDF
          </Button>
          <Button onClick={handleDownloadPDF} variant="secondary" className="w-full text-base py-3">
            Descargar PDF
          </Button>
          <Link href={`/entries/${id}/edit`} className="w-full">
            <Button variant="secondary" className="w-full text-base py-3">
              Editar Entrada
            </Button>
          </Link>
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
