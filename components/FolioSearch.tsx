'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';


export function FolioSearch() {
  const [folio, setFolio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folio.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/reportes/folio/${encodeURIComponent(trimmed)}`);
      if (res.status === 404) {
        setError('No encontramos ningún reporte con ese folio.');
        return;
      }
      if (!res.ok) throw new Error();
      router.push(`/folio/${encodeURIComponent(trimmed)}`);
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
    </div>
  );
}
