/// <reference lib="webworker" />

const CACHE_NAME = 'crm-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json',
  '/assets/*'
];

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Asegura que el service worker se active inmediatamente
});

self.addEventListener('activate', (event) => {
  // Elimina caches antiguos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Toma el control de todas las páginas inmediatamente
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora las solicitudes que no son GET
  if (event.request.method !== 'GET') return;

  // Ignora las solicitudes de desarrollo de Vite
  if (event.request.url.includes('/@vite') || 
      event.request.url.includes('hmr') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      // Network-first strategy for API calls
      if (event.request.url.includes('/api/')) {
        return fetch(event.request)
          .then(response => {
            // Solo cachea respuestas exitosas
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            return new Response(JSON.stringify({ error: 'Sin conexión' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
      }

      // Cache-first strategy for static assets
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

export {};