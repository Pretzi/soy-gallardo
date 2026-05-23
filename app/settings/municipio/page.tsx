'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { REPORT_CATEGORIES } from '@/lib/report-types';
import type { MunicipioConfig, Director } from '@/lib/municipio-config';

export default function MunicipioConfigPage() {
  const [config, setConfig] = useState<MunicipioConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/config/municipio')
      .then((r) => r.json())
      .then((d) => setConfig(d.config))
      .catch(() => setMessage('Error al cargar configuración'))
      .finally(() => setIsLoading(false));
  }, []);

  const updateDirector = (index: number, field: keyof Director, value: string) => {
    if (!config) return;
    const directores = [...config.directores];
    directores[index] = { ...directores[index], [field]: value };
    setConfig({ ...config, directores });
  };

  const setCategoryDirector = (categoriaId: string, directorId: string) => {
    if (!config) return;
    setConfig({
      ...config,
      categoryDirectorMap: { ...config.categoryDirectorMap, [categoriaId]: directorId },
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/config/municipio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const data = await res.json();
      setConfig(data.config);
      setMessage('Configuración guardada');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuración Municipal</h1>
            <p className="text-gray-500 text-sm mt-1">
              Nombres para oficios de reportes ciudadanos
            </p>
          </div>
          <Link href="/settings">
            <Button variant="secondary">Volver</Button>
          </Link>
        </div>

        {/* Alcalde */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Presidente Municipal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={config.alcaldeName}
                onChange={(e) => setConfig({ ...config, alcaldeName: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <input
                type="text"
                value={config.alcaldeCargo}
                onChange={(e) => setConfig({ ...config, alcaldeCargo: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta del municipio</label>
              <input
                type="text"
                value={config.municipioLabel}
                onChange={(e) => setConfig({ ...config, municipioLabel: e.target.value })}
                placeholder="Tierra Blanca, Ver."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Directores */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Directores</h2>
          <div className="space-y-6">
            {config.directores.map((director, i) => (
              <div key={director.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                  {director.id.replace(/-/g, ' ')}
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={director.name}
                    onChange={(e) => updateDirector(i, 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <input
                    type="text"
                    value={director.cargo}
                    onChange={(e) => updateDirector(i, 'cargo', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category mapping */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Categoría → Director</h2>
          <p className="text-sm text-gray-500 mb-4">
            Cada categoría de reporte se dirige al director correspondiente en el oficio.
          </p>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {REPORT_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
              >
                <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate">
                  {cat.label}
                </span>
                <select
                  value={config.categoryDirectorMap[cat.id] || ''}
                  onChange={(e) => setCategoryDirector(cat.id, e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-[200px]"
                >
                  {config.directores.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.cargo.replace('DIRECTOR DE ', '')}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? 'Guardando...' : 'Guardar configuración'}
        </Button>

        {message && (
          <p className={`text-sm text-center mt-3 ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
