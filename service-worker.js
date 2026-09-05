const CACHE_NAME = 'cellar-cup-v4';
const ASSETS = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const PASSTHROUGH_DOMAINS = ['openfoodfacts.org','jsdelivr.net','unpkg.com','tessdata.projectnaptha.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never intercept external OCR / barcode lookup resources - pure network pass-through,
  // no caching attempts, to avoid opaque-response cache errors breaking Tesseract.js loads.
  if (PASSTHROUGH_DOMAINS.some(d => req.url.includes(d))) {
    event.respondWith(fetch(req));
    return;
  }

  // Network-first for the HTML shell so app updates are picked up immediately.
  if (req.mode === 'navigate' || req.url.endsWith('index.html') || req.url.endsWith('/')) {
    event.respondWith(
      fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    const resClone = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
    return res;
  }).catch(() => cached)));
});
