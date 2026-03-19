'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // next-pwa handles registration automatically via register: true in config
    // This component now focuses on update notifications and cache management

    const promptIfWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        console.log('[SW] New version waiting');
        setUpdateAvailable(true);
      }
    };

    const forceActivateWaitingWorker = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      if (registration.waiting) {
        // Workbox listens for this message and will call skipWaiting().
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        promptIfWaiting(registration);
      } catch (err) {
        console.log('[SW] Update check failed:', err);
      }
    };

    // Handle controller change (new service worker activated)
    const handleControllerChange = () => {
      console.log('[SW] Controller changed, reloading page');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    let interval: number | undefined;
    let mounted = true;

    // One immediate check on load (helps right-after-deploy users).
    checkForUpdates();

    // Periodic checks.
    interval = window.setInterval(checkForUpdates, 5 * 60 * 1000);

    // Also listen for updates discovered by the browser.
    navigator.serviceWorker.ready.then((registration) => {
      if (!mounted) return;
      promptIfWaiting(registration);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            promptIfWaiting(registration);
          }
        });
      });
    });

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
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
          onClick={async () => {
            setIsUpdating(true);
            try {
              // Ask the waiting SW to activate immediately, then controllerchange will reload.
              const registration = await navigator.serviceWorker.getRegistration();
              if (registration?.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                return;
              }
              // Fallback: if nothing is waiting, just hard reload.
              window.location.reload();
            } finally {
              setIsUpdating(false);
            }
          }}
          className="bg-white text-orange-600 px-4 py-2 rounded font-medium text-sm hover:bg-orange-50 transition-colors disabled:opacity-60"
          disabled={isUpdating}
        >
          {isUpdating ? 'Actualizando...' : 'Actualizar Ahora'}
        </button>
      </div>
    );
  }

  return null;
}
