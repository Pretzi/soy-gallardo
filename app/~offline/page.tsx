'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function OfflineFallbackPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
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
    if (isOnline) {
      // Give a moment to reconnect, then go back
      const timeout = setTimeout(() => {
        router.back();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-orange-500"
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
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Sin Conexión
        </h1>

        <p className="text-gray-600 mb-8 text-lg">
          Esta página no está disponible sin conexión a internet. 
          Las páginas que ya visitaste deberían seguir funcionando.
        </p>

        {isOnline && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-pulse">
            <p className="text-green-800 font-medium">
              ✅ Conexión restaurada. Redirigiendo...
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 text-lg font-semibold"
          >
            🔄 Reintentar
          </Button>
          
          <Link href="/entries" className="block">
            <Button variant="secondary" className="w-full py-3">
              📋 Ver Entradas Guardadas
            </Button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-orange-50 rounded-lg border border-orange-100">
          <p className="text-sm text-orange-800">
            <strong>💡 Tip:</strong> Las entradas que hayas visto mientras tenías conexión 
            estarán disponibles sin internet. Los cambios que hagas se sincronizarán 
            automáticamente cuando vuelvas a conectarte.
          </p>
        </div>
      </div>
    </div>
  );
}
