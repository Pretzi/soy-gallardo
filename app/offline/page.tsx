'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    const checkOnline = () => {
      setIsOnline(navigator.onLine);
    };

    checkOnline();

    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, []);

  useEffect(() => {
    // If we come back online, try to reload the original page
    if (isOnline) {
      router.back();
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Sin Conexión
        </h1>

        <p className="text-gray-600 mb-6">
          Esta página requiere conexión a internet para cargar por primera vez.
          Por favor, verifica tu conexión e intenta de nuevo.
        </p>

        {isOnline && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              ✅ Conexión restaurada. Redirigiendo...
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={() => router.back()} className="w-full">
            Intentar de Nuevo
          </Button>
          
          <Link href="/entries">
            <Button variant="secondary" className="w-full">
              Ir a Entradas
            </Button>
          </Link>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>💡 Consejo: Las páginas visitadas mientras estabas en línea estarán disponibles sin conexión.</p>
        </div>
      </div>
    </div>
  );
}
