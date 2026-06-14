// MobilityGrid Service Worker
// Handles offline caching + background sync for PWA/TWA

const CACHE_NAME = 'mg-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {});
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET and API requests (always network for API)
  if (e.request.method !== 'GET') return;
  if (url.includes('/api/')) return;
  if (url.includes('render.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // Cache successful responses for static assets
        if (res && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(function() {
        // Offline fallback: serve from cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/');
        });
      })
  );
});
