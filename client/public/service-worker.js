/// <reference lib="webworker" />
/// <reference lib="es2015" />
/// <reference lib="webworker.importscripts" />

const CACHE_NAME = 'crm-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto exitosamente');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('Error durante la instalación del Service Worker:', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        console.log('Service Worker activado exitosamente');
        self.clients.claim();
      })
      .catch(error => {
        console.error('Error durante la activación del Service Worker:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('/@vite') || 
      event.request.url.includes('hmr') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Error al cachear el recurso:', error);
              });

            return response;
          })
          .catch(error => {
            console.error('Error al obtener recurso:', error);

            if (event.request.url.includes('/api/')) {
              return new Response(
                JSON.stringify({
                  error: 'Sin conexión',
                  message: 'No se pudo conectar con el servidor'
                }), 
                {
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }

            return caches.match('/offline.html');
          });
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'syncData') {
    event.waitUntil(Promise.resolve());
  }
});