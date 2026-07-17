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

// ── Web Push: STS Reactivation System Phase 1 ─────────────────────────────
// See supabase/functions/_shared/webpush.ts for the payload shape this
// expects (STSPushPayload). Never trusts the payload blindly — parses
// defensively, falls back to safe generic content on any malformed data,
// and only ever opens an allow-listed in-app route (never an arbitrary
// external URL from the payload).

const ALLOWED_NOTIFICATION_ROUTES = new Set(['/', '/play']);

function safeRoute(route) {
  if (typeof route === 'string' && ALLOWED_NOTIFICATION_ROUTES.has(route)) return route;
  return '/';
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = typeof data.title === 'string' && data.title ? data.title : 'Survive the Streak';
  const body = typeof data.body === 'string' && data.body ? data.body : "There's an update waiting for you.";
  const route = safeRoute(data.route);
  const tag = typeof data.tag === 'string' && data.tag ? data.tag : 'sts-notification';
  const notificationId = typeof data.notificationId === 'string' ? data.notificationId : '';
  const notificationType = typeof data.type === 'string' ? data.type : 'test';

  const options = {
    body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag,
    // Replacing an unseen notification with the same tag is intentional —
    // a player should never see two stacked "today's challenge" pushes.
    renotify: false,
    data: { route, notificationId, notificationType },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const route = safeRoute(event.notification.data && event.notification.data.route);
  const notificationId = (event.notification.data && event.notification.data.notificationId) || '';
  const notificationType = (event.notification.data && event.notification.data.notificationType) || '';

  const targetUrl = notificationId
    ? `${route}${route.includes('?') ? '&' : '?'}notification=${encodeURIComponent(notificationId)}&type=${encodeURIComponent(notificationType)}`
    : route;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // Focus an existing STS window/tab rather than opening a new one,
        // and navigate it to the target route.
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl).catch(() => {});
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
