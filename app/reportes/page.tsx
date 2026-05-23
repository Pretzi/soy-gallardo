'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getReportClassification } from '@/lib/report-types';
import type { Reporte, ReporteEstado } from '@/lib/aws/reportes';

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resueltos' },
  { value: 'cancelado', label: 'Cancelados' },
];

const STATUS_BADGE: Record<ReporteEstado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  resuelto: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<ReporteEstado, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
};

export default function ReportesPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('');

  const fetchReportes = async (estado: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (estado) params.set('estado', estado);
      const res = await fetch(`/api/reportes?${params}`);
      if (!res.ok) throw new Error('Error loading');
      const data = await res.json();
      setReportes(data.reportes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes(activeStatus);
  }, [activeStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Reportes Ciudadanos</h1>
          <p className="text-gray-500 text-sm mt-1">{reportes.length} reporte{reportes.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeStatus === tab.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-slate-200 text-gray-600 hover:border-orange-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : reportes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p>No hay reportes{activeStatus ? ' con este estado' : ''}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Folio</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Categoría</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Ciudadano</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Fecha</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportes.map((r) => {
                  const classification = getReportClassification(r);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-gray-800">{r.folio}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{classification.emoji}</span>
                          <div className="min-w-0">
                            <span className="text-sm text-gray-700 hidden sm:block truncate">{classification.categoryLabel}</span>
                            {classification.subcategoryLabel && (
                              <span className="text-xs text-gray-400 hidden sm:block truncate">{classification.subcategoryLabel}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-700">{r.nombre}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[r.estado]}`}>
                          {STATUS_LABEL[r.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reportes/${r.id}`}
                          className="text-sm text-orange-600 hover:text-orange-800 font-semibold"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
