'use client';

import Link from 'next/link';
import { useOffline } from '@/contexts/OfflineContext';
import { ReactNode } from 'react';

interface OfflineLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  offlineMessage?: string;
}

/**
 * A link component that blocks navigation to dynamic routes when offline.
 * Shows a toast/alert when clicked while offline.
 */
export function OfflineLink({ 
  href, 
  children, 
  className = '',
  offlineMessage = 'Esta página no está disponible sin conexión a internet.'
}: OfflineLinkProps) {
  const { isOnline } = useOffline();

  const handleOfflineClick = (e: React.MouseEvent) => {
    if (!isOnline) {
      e.preventDefault();
      alert(offlineMessage);
    }
  };

  if (!isOnline) {
    return (
      <span 
        onClick={handleOfflineClick}
        className={`${className} opacity-50 cursor-not-allowed`}
        title="No disponible sin conexión"
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
