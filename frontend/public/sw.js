// frontend/public/sw.js
const CACHE_VERSION = 'v5';   // Bump pour forcer le remplacement de l'ancien SW
const CACHE_NAME = `globalmind-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.jpeg',
  '/globalmind-logo.png',
  // '/manifest.json',  // décommente si tu crées le fichier
];

self.addEventListener('install', (event) => {
  console.log('Service Worker : Installation v5');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) =>
              console.warn(`Asset non caché : ${url}`, err.message)
            )
          )
        )
      )
      .then(() => {
        console.log('Assets pré-cachés (échecs ignorés)');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker : Activation v5');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`Suppression de l'ancien cache : ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. API et requêtes non-GET (POST, PUT, DELETE...) : bypass total du cache
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') return;

  // 2. Range/206 : pas de cache
  if (event.request.headers.has('range')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3. Navigation HTML : network-first (évite de servir un vieil index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  // 4. Assets statiques : cache-first + revalidation
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('Contenu indisponible hors ligne', { status: 404 }));
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Synchronisation...');
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_START' }));
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    event.ports[0].postMessage({ type: 'PONG' });
  }
});