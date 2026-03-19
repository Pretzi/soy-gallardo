import { Suspense } from 'react';
import EntriesPageClient from './EntriesPageClient';

export default function EntriesPage() {
  // `useSearchParams()` must be wrapped in a Suspense boundary for prerender/build.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <p className="text-base md:text-lg text-gray-600">Cargando entradas...</p>
          </div>
        </div>
      }
    >
      <EntriesPageClient />
    </Suspense>
  );
}
