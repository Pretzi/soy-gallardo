'use client';

import { usePathname } from 'next/navigation';
import { HeaderNav } from '@/components/HeaderNav';

export function AppHeader() {
  const pathname = usePathname();

  // Hide on all public-facing pages
  if (
    pathname === '/' ||
    pathname?.startsWith('/reportar') ||
    pathname?.startsWith('/folio') ||
    pathname === '/admin/login' ||
    pathname === '/municipio'
  ) {
    return null;
  }

  return (
    <header className="bg-white border-b-4 border-orange-500 shadow-md">
      <div className="container mx-auto px-4 py-3 md:py-2">
        <div className="flex items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <img
              src="/logo-2.png"
              alt="Soy Gallardo Logo"
              className="h-12 w-auto flex-shrink-0"
            />
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 leading-tight">
              Soy <span className="text-orange-600">Gallardo</span>
            </h1>
          </div>
          <HeaderNav />
        </div>
      </div>
    </header>
  );
}
