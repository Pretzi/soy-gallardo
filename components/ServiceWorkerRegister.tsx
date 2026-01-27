'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // next-pwa handles registration automatically via register: true in config
    // This component now focuses on update notifications and cache management

    const handleServiceWorkerUpdate = () => {
      navigator.serviceWorker.ready.then((registration) => {
        // Check for updates periodically
        const checkForUpdates = () => {
          registration.update().catch((err) => {
            console.log('[SW] Update check failed:', err);
          });
        };

        // Check every 5 minutes
        const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

        // Listen for new service worker installation
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log('[SW] New version available');
                setUpdateAvailable(true);
              }
            });
          }
        });

        return () => clearInterval(interval);
      });
    };

    // Handle controller change (new service worker activated)
    const handleControllerChange = () => {
      console.log('[SW] Controller changed, reloading page');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Set up update checking once SW is ready
    if (navigator.serviceWorker.controller) {
      handleServiceWorkerUpdate();
    } else {
      navigator.serviceWorker.ready.then(handleServiceWorkerUpdate);
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Show update notification if available
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-orange-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <p className="font-medium mb-2">Nueva versión disponible</p>
        <p className="text-sm mb-3 opacity-90">
          Recarga la página para obtener las últimas actualizaciones.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-white text-orange-600 px-4 py-2 rounded font-medium text-sm hover:bg-orange-50 transition-colors"
        >
          Actualizar Ahora
        </button>
      </div>
    );
  }

  return null;
}
