'use client';

import { useState } from 'react';

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  en_proceso: 'bg-blue-100 text-blue-800 border-blue-200',
  resuelto: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-gray-100 text-gray-600 border-gray-200',
};

type FolioResult = {
  folio: string;
  id: string;
  tipoLabel: string;
  tipoEmoji: string;
  estado: string;
  calle: string;
  colonia: string | null;
  createdAt: string;
};

export function FolioSearch() {
  const [folio, setFolio] = useState('');
  const [result, setResult] = useState<FolioResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folio.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch(`/api/reportes/folio/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setError('No encontramos ningún reporte con ese folio.');
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
    } catch {
      setError('Error al buscar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <input
          type="text"
          value={folio}
          onChange={(e) => {
            setFolio(e.target.value);
            setResult(null);
            setError('');
          }}
          placeholder="REP-XXXXXX"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
        />
        <button
          type="submit"
          disabled={loading || !folio.trim()}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}

      {result && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{result.tipoEmoji}</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{result.tipoLabel}</p>
                <p className="text-xs font-mono text-gray-400">{result.folio}</p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLOR[result.estado] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABEL[result.estado] || result.estado}
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>{result.calle}{result.colonia ? `, ${result.colonia}` : ''}</p>
            <p>{new Date(result.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      )}
    </div>
  );
}
