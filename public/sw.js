/**
 * Personal Notes CMS Service Worker
 * Provides offline viewing of notes, chapters, themes, and application shell.
 */

const CACHE_NAME = 'pnotes-static-v8';
const API_CACHE_NAME = 'pnotes-api-v8';
const ASSETS_CACHE_NAME = 'pnotes-assets-v8';

// Core static assets to precache immediately
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/notes-theme.css',
];

// Install: precache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: 'no-cache' })
              .then((res) => {
                if (res.ok) return cache.put(url, res);
              })
              .catch((err) => {
                console.warn('[SW] Could not precache url:', url, err);
              })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up outdated caches and claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, API_CACHE_NAME, ASSETS_CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!currentCaches.includes(name)) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: intercept requests for offline resilience
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension / non-http requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML documents) -> Network-First with Cache Fallback to '/' or '/index.html'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse =
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            (await caches.match('/index.html'));
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            '<html><head><title>Offline - Personal Notes CMS</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;padding:2rem;text-align:center;background:#050608;color:#f5f2eb;"><h2>Notes CMS Offline</h2><p>You are currently offline. Please reconnect or open a previously cached page.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Read-only API Endpoints for topics, chapters, and theme CSS
  //    Network-first: fetch fresh notes, save to API cache. If network fails (offline), serve cached version!
  const isCmsReadApi =
    url.pathname === '/api/topics' ||
    url.pathname === '/api/chapters' ||
    url.pathname === '/api/css' ||
    url.pathname === '/api/css/files' ||
    url.pathname.startsWith('/api/css/') ||
    url.pathname === '/notes-theme.css';

  if (isCmsReadApi && url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({ error: 'Offline mode: Network request failed and no cache available' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 3. Static assets: JS, CSS, images, Web Fonts (Google Fonts or local)
  //    Stale-While-Revalidate or Cache-First
  const isStaticAsset =
    url.origin === self.location.origin &&
    (/\.(js|css|svg|png|jpg|jpeg|webp|ico|woff|woff2|ttf|json)$/i.test(url.pathname) ||
      url.pathname.startsWith('/assets/'));

  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isStaticAsset || isGoogleFont) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
              const clone = networkResponse.clone();
              caches.open(ASSETS_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default: Network with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
