'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useOffline } from '@/contexts/OfflineContext';

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOnline, pendingCount } = useOffline();

  // Don't show logout button on login page
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Offline Status Indicator */}
      <div className="flex items-center gap-1 md:gap-2">
        <span className={`text-xs md:text-sm ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
          {isOnline ? '🟢' : '🟡'}
        </span>
        {pendingCount > 0 && (
          <span className="hidden md:inline text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
            {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Settings Link */}
      <Link href="/settings">
        <Button variant="secondary" className="text-sm py-1 px-2 md:px-3">
          <span className="hidden md:inline">⚙️ Ajustes</span>
          <span className="md:hidden">⚙️</span>
        </Button>
      </Link>

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        variant="secondary"
        className="text-sm py-1 px-2 md:px-3"
      >
        <span className="hidden md:inline">Cerrar Sesión</span>
        <span className="md:hidden">👋</span>
      </Button>
    </div>
  );
}
