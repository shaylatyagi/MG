// firebase-messaging-sw.js — FCM background message handler (COM-02 / PAY-04)
// Served from /firebase-messaging-sw.js by CRA's static file server.
//
// IMPORTANT: Replace the placeholder values below with your Firebase project config.
// These are PUBLIC client-side values — safe to commit.
// Go to Firebase Console → Project Settings → Your apps → SDK setup and configuration.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain:        'REPLACE_WITH_PROJECT_ID.firebaseapp.com',
  projectId:         'REPLACE_WITH_PROJECT_ID',
  storageBucket:     'REPLACE_WITH_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'REPLACE_WITH_SENDER_ID',
  appId:             'REPLACE_WITH_APP_ID',
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────────────────────
// Fires when app is NOT in the foreground tab.
messaging.onBackgroundMessage(({ notification, data }) => {
  const title = notification?.title || 'MobilityGrid';
  const body  = notification?.body  || '';
  const url   = data?.url || '/';

  return self.registration.showNotification(title, {
    body,
    icon:     '/logo192.png',
    badge:    '/badge72.png',
    tag:      data?.type || 'mg-notif',
    renotify: true,
    data:     { url, ...(data || {}) },
  });
});

// ── Notification click — focus or open app ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const existing = wins.find(w => w.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })
  );
});
