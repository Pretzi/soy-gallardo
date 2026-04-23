'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { REPORT_TYPES } from '@/lib/report-types';
import type { Reporte, ReporteEstado } from '@/lib/aws/reportes';

const STATUS_OPTIONS: { value: ReporteEstado; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cancelado', label: 'Cancelado' },
];

const STATUS_BADGE: Record<ReporteEstado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  resuelto: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-600',
};

export default function ReporteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notasAdmin, setNotasAdmin] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<ReporteEstado>('pendiente');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reportes/${id}`);
        if (!res.ok) { router.push('/reportes'); return; }
        const data = await res.json();
        setReporte(data.reporte);
        setNotasAdmin(data.reporte.notasAdmin || '');
        setSelectedEstado(data.reporte.estado);
      } catch {
        router.push('/reportes');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

  const handleSave = async () => {
    if (!reporte) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/reportes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: selectedEstado, notasAdmin }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const data = await res.json();
      setReporte(data.reporte);
      setSaveMsg('Guardado exitosamente');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando reporte...</p>
      </div>
    );
  }

  if (!reporte) return null;

  const rt = REPORT_TYPES.find((t) => t.id === reporte.tipo);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Back */}
        <div className="mb-6">
          <Link href="/reportes" className="text-sm text-gray-500 hover:text-orange-600 transition-colors">
            ← Volver a reportes
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{rt?.emoji || '📋'}</span>
                <h1 className="text-xl font-black text-gray-900">{rt?.label || reporte.tipo}</h1>
              </div>
              <p className="font-mono text-sm font-bold text-gray-500">{reporte.folio}</p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[reporte.estado]}`}>
              {STATUS_OPTIONS.find((o) => o.value === reporte.estado)?.label}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: Report details */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Descripción</h2>
              <p className="text-gray-800 text-sm leading-relaxed">{reporte.descripcion}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Ubicación</h2>
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-medium">Calle:</span> {reporte.calle}</p>
                {reporte.colonia && <p><span className="font-medium">Colonia:</span> {reporte.colonia}</p>}
                {reporte.referencia && <p><span className="font-medium">Referencia:</span> {reporte.referencia}</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Ciudadano</h2>
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-medium">Nombre:</span> {reporte.nombre}</p>
                {reporte.telefono && <p><span className="font-medium">Teléfono:</span> {reporte.telefono}</p>}
                {reporte.email && <p><span className="font-medium">Email:</span> {reporte.email}</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Fechas</h2>
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-medium">Creado:</span> {new Date(reporte.createdAt).toLocaleString('es-MX')}</p>
                <p><span className="font-medium">Actualizado:</span> {new Date(reporte.updatedAt).toLocaleString('es-MX')}</p>
              </div>
            </div>
          </div>

          {/* Right: Admin actions + photos */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Gestión</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={selectedEstado}
                  onChange={(e) => setSelectedEstado(e.target.value as ReporteEstado)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                <textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  placeholder="Notas del administrador..."
                  rows={4}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              {saveMsg && (
                <p className={`text-sm text-center mt-2 ${saveMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
            </div>

            {reporte.fotosUrls && reporte.fotosUrls.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">
                  Fotos ({reporte.fotosUrls.length})
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {reporte.fotosUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-28 object-cover rounded-xl hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
