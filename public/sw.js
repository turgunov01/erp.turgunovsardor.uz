// TTR ONE PWA service worker (Stage 11.2 — network-first, dev-safe).
// IMPORTANT: cache-first on hashed build chunks breaks dev (chunk hashes change every
// rebuild → stale cached shell → white screen). So we go NETWORK-FIRST everywhere and
// use the cache only as an offline fallback. Bump CACHE to force old caches to purge.
const CACHE = 'ttr-one-v3';
const SHELL = ['/m', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GETs. API + cross-origin + Vite HMR/websocket → straight to network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/@') || url.pathname.includes('__vite') || url.pathname.includes('hot-update')) return;

  // Network-first: always try the network; on failure (offline) fall back to cache, then
  // to the cached shell for navigations. Cache successful responses for offline use.
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('/m') : undefined))),
  );
});

// Web Push (Stage 11.3).
self.addEventListener('push', (e) => {
  let data = { title: 'TTR ONE', body: '' };
  try { data = e.data.json(); } catch { if (e.data) data.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(data.title || 'TTR ONE', { body: data.body, icon: '/icon.svg', badge: '/icon.svg' }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow('/m'))));
});
