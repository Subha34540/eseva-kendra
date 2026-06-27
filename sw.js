/* E-Seva Kendra - Service Worker
   Provides basic offline support by caching the app shell. */

const CACHE_NAME = 'eseva-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './dashboard.html',
  './manifest.json',
  './logo.png'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            /* ignore missing files (e.g. logo.png not yet uploaded) */
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network first for Firebase/API calls, cache-first for app shell
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never cache Firebase / external API calls - always go to network
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('unpkg.com') ||
    url.includes('api.qrserver.com') ||
    url.includes('barcodeapi.org')
  ) {
    return; // let browser handle normally
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache successful same-origin responses
          if (response.ok && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
