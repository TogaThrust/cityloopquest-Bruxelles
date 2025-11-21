const PRECACHE = 'precache-v3';
const RUNTIME  = 'runtime-v3';

const PRECACHE_URLS = [
  './',                       // ok si tu sers à la racine du dossier
  './index.html',
  './language-selection.html',
  './style.css',
  './app.js',
  './secure-content.js',
  './content-loader.js',
  './manifest.json',
  // './images/logo.png',      // ❌ supprimé car 404 chez toi
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    const results = await Promise.allSettled(
      PRECACHE_URLS.map(url => cache.add(new Request(url, { cache: 'reload' })))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn('[SW] precache fail:', PRECACHE_URLS[i]);
    });
  })());
});

self.addEventListener('activate', (event) => {
  clients.claim();
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== PRECACHE && k !== RUNTIME).map(k => caches.delete(k)));
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne pas intercepter l’API
  if (url.origin === 'http://localhost:8080') return;

  if (req.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        const runtime = await caches.open(RUNTIME);
        runtime.put(req, res.clone());
        return res;
      } catch (e) {
        // Optionnel: renvoyer une page offline si tu en as une
        // return caches.match('./offline.html');
        throw e;
      }
    })());
  }
});
