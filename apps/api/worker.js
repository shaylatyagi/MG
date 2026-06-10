// apps/api/worker.js — DevSpec 64, ADR-007
// Entry point for SQS consumer processes.
// Run separately from the API server: node apps/api/worker.js
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const QUEUE_URL = process.env.SQS_WEBHOOK_URL;
const NOTIF_URL = process.env.SQS_NOTIFICATION_URL;

if (!QUEUE_URL && !NOTIF_URL) {
  console.warn('[worker] No SQS URLs set -- mock mode, exiting after 1s health check');
  setTimeout(() => {
    console.log('[worker] Mock mode: would poll mg-webhook-processing + mg-notifications in production');
    process.exit(0);
  }, 1000);
} else {
  if (QUEUE_URL) {
    console.log('[worker] Starting webhookWorker -- queue:', QUEUE_URL);
    const { poll: pollWebhook } = require('./src/workers/webhookWorker');
    pollWebhook().catch(err => { console.error('[worker] webhookWorker fatal:', err); process.exit(1); });
  }

  if (NOTIF_URL) {
    console.log('[worker] Starting notificationWorker -- queue:', NOTIF_URL);
    const { poll: pollNotif } = require('./src/workers/notificationWorker');
    pollNotif().catch(err => { console.error('[worker] notificationWorker fatal:', err); process.exit(1); });
  }
}
