// frontend/src/utils/fcm.js — COM-02 / PAY-04
// FCM push notification initialization for the web app.
// Call initPushNotifications(authToken) after login.
// Call removePushToken(authToken, token) on logout.
//
// Required .env variables (REACT_APP_ prefix, non-secret):
//   REACT_APP_FIREBASE_API_KEY
//   REACT_APP_FIREBASE_AUTH_DOMAIN
//   REACT_APP_FIREBASE_PROJECT_ID
//   REACT_APP_FIREBASE_STORAGE_BUCKET
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID
//   REACT_APP_FIREBASE_APP_ID
//   REACT_APP_FIREBASE_VAPID_KEY   ← from Firebase Console > Cloud Messaging > Web Push certs

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;
const API_URL   = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

function getFirebaseApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

// Store token in-memory so we can pass it to removePushToken on logout
let _currentToken = null;
export const getCurrentFcmToken = () => _currentToken;

/**
 * Request push permission, get FCM token, register it with the backend.
 * Call this once after the user logs in.
 *
 * @param {string} authToken — JWT from localStorage / auth state
 * @returns {string|null} the FCM token, or null if not granted / not configured
 */
export async function initPushNotifications(authToken) {
  try {
    // Skip if Firebase isn't configured (dev without credentials)
    if (!firebaseConfig.apiKey) {
      console.warn('[FCM] Firebase config not set — push disabled');
      return null;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const app       = getFirebaseApp();
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey:             VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      ),
    });

    if (!token) return null;
    _currentToken = token;

    // Register with backend
    await fetch(`${API_URL}/api/device/token`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: token, platform: 'web' }),
    }).catch(() => {}); // non-blocking

    // Handle foreground messages (app is open in the tab)
    onMessage(messaging, ({ notification, data }) => {
      if (!notification) return;
      const title = notification.title || 'MobilityGrid';
      const body  = notification.body  || '';
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/logo192.png',
          data: data || {},
          tag:  data?.type || 'mg-notif',
        });
      }
    });

    console.log('[FCM] Push notifications active');
    return token;
  } catch (err) {
    // Don't crash the app if push setup fails
    console.warn('[FCM] Push init error:', err.message);
    return null;
  }
}

/**
 * Remove the FCM token from the backend on logout.
 * @param {string} authToken
 * @param {string} [fcmToken] — defaults to the token registered by initPushNotifications
 */
export async function removePushToken(authToken, fcmToken) {
  const token = fcmToken || _currentToken;
  if (!token) return;
  try {
    await fetch(`${API_URL}/api/device/token`, {
      method:  'DELETE',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcm_token: token }),
    });
    _currentToken = null;
  } catch (_) {}
}
