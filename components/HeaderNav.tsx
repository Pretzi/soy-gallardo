'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();

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
    <Button
      onClick={handleLogout}
      variant="secondary"
      className="text-sm py-1 px-3"
    >
      Cerrar Sesión
    </Button>
  );
}
