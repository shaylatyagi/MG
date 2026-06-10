// backend/src/services/fcm.js — COM-02 / PAY-04
// Firebase Admin SDK wrapper for FCM push notifications.
// Mock mode when FIREBASE_SERVICE_ACCOUNT env var is not set.
'use strict';

let _app = null;

function getApp() {
  if (_app) return _app;
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length) { _app = admin.apps[0]; return _app; }
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;
    const sa = JSON.parse(raw);
    _app = admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch (e) {
    console.warn('[FCM] init error:', e.message);
    _app = null;
  }
  return _app;
}

const isMock = () => !process.env.FIREBASE_SERVICE_ACCOUNT;

/**
 * Send a push to all registered devices for a user.
 * @param {object} pool  — pg Pool instance
 * @param {number} userId
 * @param {string} userRole  — 'driver' | 'owner' | 'manager'
 * @param {string} title
 * @param {string} body
 * @param {object} [data]   — extra key-value string pairs
 */
async function sendToUser(pool, userId, userRole, title, body, data = {}) {
  if (isMock()) {
    console.log('[FCM MOCK]', userRole, userId, '|', title, '|', body);
    return;
  }
  try {
    const res    = await pool.query(
      'SELECT fcm_token FROM public.device_tokens WHERE user_id = $1 AND user_role = $2',
      [userId, userRole]
    );
    const tokens = res.rows.map(r => r.fcm_token);
    if (!tokens.length) return;
    await _sendPush(pool, tokens, title, body, data);
  } catch (err) {
    console.error('[FCM] sendToUser error:', err.message);
  }
}

/**
 * Send to explicit token list (internal use).
 */
async function _sendPush(pool, tokens, title, body, data = {}) {
  const app = getApp();
  if (!app) { console.warn('[FCM] app not initialised'); return; }

  const { getMessaging } = require('firebase-admin/messaging');
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const response = await getMessaging(app).sendEachForMulticast({
    tokens,
    notification: { title, body },
    data:         stringData,
    webpush: {
      notification: { title, body, icon: '/logo192.png', badge: '/badge72.png' },
      fcmOptions:   { link: '/' },
    },
    android: { priority: 'high', notification: { channelId: 'mg_default' } },
  });

  // Prune stale / invalid tokens
  const stale = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || '';
      if (code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered') {
        stale.push(tokens[i]);
      }
    }
  });
  if (stale.length) {
    pool.query(
      'DELETE FROM public.device_tokens WHERE fcm_token = ANY($1::text[])',
      [stale]
    ).catch(() => {});
  }
}

module.exports = { sendToUser };
