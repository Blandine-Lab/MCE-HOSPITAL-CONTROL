// frontend/public/sw.js
const CACHE_VERSION = 'v3';
const CACHE_NAME = `mce-cache-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo.jpeg',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  console.log('📦 Service Worker : Installation v3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Mise en cache des assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker : Activation v3');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`🗑️ Suppression de l'ancien cache : ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 🔥 Gestion des requêtes avec correction pour les réponses partielles (206)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorer toutes les requêtes API (elles restent gérées par le navigateur)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Si la requête contient un en-tête 'Range', ne pas la mettre en cache
  //    (réponses partielles = status 206, non supporté par Cache API)
  if (event.request.headers.has('range')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3. Stratégie cache-first avec mise à jour en arrière-plan
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          // Mise à jour en arrière-plan (seulement si la réponse est OK)
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
            }
          }).catch(() => {});
          return cached;
        }

        // Pas de cache : on va chercher sur le réseau
        return fetch(event.request).then((response) => {
          // On ne met en cache que les réponses avec un statut 200
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // En cas d'échec réseau, retourner une page d'erreur hors ligne
          return new Response('Contenu indisponible hors ligne', { status: 404 });
        });
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('🔄 Synchronisation...');
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_START' }));
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    event.ports[0].postMessage({ type: 'PONG' });
  }
});