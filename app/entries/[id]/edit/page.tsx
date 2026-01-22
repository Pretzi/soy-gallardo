'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EntryForm } from '@/components/forms/EntryForm';
import type { Entry, EntryCreate } from '@/lib/validation';

export default function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
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

  const handleFormSubmit = async (data: EntryCreate) => {
    const response = await fetch(`/api/entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    router.push(`/entries/${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Entrada no encontrada</p>
          <Link href="/entries">
            <Button>Volver a la lista</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Entrada</h1>
          <Link href={`/entries/${id}`}>
            <Button variant="secondary">Cancelar</Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <EntryForm
            initialData={entry}
            ineFrontUrl={entry.ineFrontUrl}
            ineBackUrl={entry.ineBackUrl}
            onSubmit={handleFormSubmit}
            submitLabel="Guardar Cambios"
          />
        </div>
      </div>
    </div>
  );
}
