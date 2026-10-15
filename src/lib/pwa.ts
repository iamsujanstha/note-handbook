/**
 * PWA Service Worker Registration and Utilities
 */

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  // Allow registration on HTTPS or localhost/127.0.0.1
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );

  if (window.location.protocol !== 'https:' && !isLocalhost) {
    console.info('[PWA] Service Worker skipped: insecure context');
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[PWA] Service Worker registered with scope:', registration.scope);

      // Check for updates
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('[PWA] New content is available; please refresh.');
              window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: registration }));
            } else {
              console.log('[PWA] Content is cached for offline use.');
            }
          }
        };
      };

      return registration;
    })
    .catch((error) => {
      console.warn('[PWA] Service Worker registration failed:', error);
      return null;
    });
}
