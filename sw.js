const CACHE_NAME = 'psicoagenda-ota-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia Network-First únicamente para los archivos propios de la app (HTML/JS/CSS/SVG).
// Nunca intercepta peticiones a Firebase, ARCA ni APIs externas.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });
        }
        return networkRes;
      })
      .catch(async () => {
        const cachedRes = await caches.match(req);
        if (cachedRes) return cachedRes;
        if (req.mode === 'navigate') {
          const indexCached = await caches.match('./index.html');
          if (indexCached) return indexCached;
        }
        throw new Error('Offline y sin caché previo');
      })
  );
});
