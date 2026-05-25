// Cache name — bump this string on each deploy if you need to force-evict old caches.
// Hashed JS/CSS bundles are always fetched network-first so this only matters for
// the static asset cache (images, icons, manifest).
const STATIC_CACHE = 'sts-static-v2';

// Assets that are safe to serve from cache (long-lived, content-addressed or rarely changed)
const PRECACHE_ASSETS = [
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.json',
];

// ── Install: precache only truly static assets ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: delete any old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: differentiated strategy per request type ───────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept non-GET or cross-origin API calls
  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/supabase') || url.pathname.startsWith('/functions')) return;
  if (url.hostname !== self.location.hostname) return;

  const isDocument = req.mode === 'navigate' || req.destination === 'document';
  const isBundle = /\.(js|css)$/.test(url.pathname) && url.pathname.startsWith('/assets/');
  const isStaticAsset = /\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i.test(url.pathname);

  if (isDocument || isBundle) {
    // Network-first: always try to get the latest app shell and bundles.
    // Falls back to cache only when completely offline.
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => caches.match(req).then((cached) => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  if (isStaticAsset) {
    // Cache-first: images and fonts are content-addressed or very stable.
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-only (no caching)
});
