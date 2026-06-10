// apps/api/worker.js -- DevSpec 64, ADR-007
// Entry point for the SQS webhook consumer process.
// Run separately from the API server: node apps/api/worker.js
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const QUEUE_URL = process.env.SQS_WEBHOOK_URL;

if (!QUEUE_URL) {
  console.warn('[worker] SQS_WEBHOOK_URL not set -- mock mode, exiting after 1s health check');
  setTimeout(() => {
    console.log('[worker] Mock mode: would poll mg-webhook-processing in production');
    process.exit(0);
  }, 1000);
} else {
  console.log('[worker] Starting webhook worker -- queue:', QUEUE_URL);
  const { poll } = require('./src/workers/webhookWorker');
  poll().catch((err) => {
    console.error('[worker] Fatal error in poll loop:', err);
    process.exit(1);
  });
}
