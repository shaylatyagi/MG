// MobilityGrid Service Worker v2
const CACHE_NAME = 'mg-v2';
const STATIC = ['/', '/login', '/icon-192.png', '/icon-512.png', '/manifest.json'];

// Install
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(c) { return c.addAll(STATIC).catch(function(){}); })
  );
});

// Activate
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch — network-first, cache fallback
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/') || e.request.url.includes('render.com') || e.request.url.includes('neon.tech')) return;
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request).then(function(cached){ return cached || caches.match('/'); });
    })
  );
});

// Push Notifications
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'MobilityGrid', body: e.data ? e.data.text() : 'New notification' }; }
  var isSOS = (data.data && data.data.type === 'SOS') || (data.title && data.title.includes('SOS'));

  e.waitUntil(
    self.registration.showNotification(data.title || 'MobilityGrid', {
      body: data.body || '',
      icon: isSOS ? '/icon-driver-192.png' : '/icon-192.png',
      badge: '/icon-192.png',
      tag: isSOS ? 'sos-alert' : (data.tag || 'mg-notification'),
      data: isSOS ? '/owner/dashboard?tab=sos' : (data.url || '/'),
      vibrate: isSOS ? [500, 200, 500, 200, 500, 200, 500] : [200, 100, 200],
      requireInteraction: isSOS,
      silent: false,
      renotify: isSOS,
      actions: isSOS ? [{ action: 'view', title: 'View SOS' }] : []
    }).then(function() {
      // For SOS: postMessage to all open clients so they can play alarm audio
      if (isSOS) {
        return self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function(list) {
          list.forEach(function(client) {
            client.postMessage({ type: 'SOS_ALARM', title: data.title, body: data.body });
          });
        });
      }
    })
  );
});

// Notification click
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(list) {
      for (var c of list) { if (c.url && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(e.notification.data || '/');
    })
  );
});

// Background Sync
self.addEventListener('sync', function(e) {
  if (e.tag === 'mg-sync') {
    e.waitUntil(Promise.resolve());
  }
});

// Periodic Background Sync
self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'mg-periodic') {
    e.waitUntil(Promise.resolve());
  }
});
