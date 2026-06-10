// apps/api/src/workers/webhookWorker.js — DevSpec §64, ADR-007
// SQS long-poll consumer for mg-webhook-processing queue.
// Processes PayYantra webhook payloads that the HTTP handler enqueued.
// Run via: node apps/api/worker.js
'use strict';

const pool             = require('../config/db');
const payyantraService = require('../services/payyantra');

// Lazy AWS SDK
let _sqs = null;
function getSqs() {
  if (_sqs) return _sqs;
  const { SQSClient } = require('@aws-sdk/client-sqs');
  _sqs = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
  return _sqs;
}

const QUEUE_URL    = process.env.SQS_WEBHOOK_URL;
const MAX_MESSAGES = 10;
const WAIT_SECONDS = 20; // long-poll

/**
 * Process a single PayYantra webhook payload atomically.
 * Idempotent: skips orders already past PENDING.
 */
async function processWebhook(payload) {
  const { order_id, transaction_status, payment_mode, txn_id, raw_body, signature } = payload;

  // Re-verify HMAC so a bad SQS message can't corrupt the DB
  if (raw_body && signature) {
    if (!payyantraService.verifyWebhookSignature(raw_body, signature)) {
      console.error('[webhookWorker] HMAC verification failed for order', order_id);
      return; // don't throw — message will be deleted (bad sig is unrecoverable)
    }
  }

  if (!order_id) {
    console.error('[webhookWorker] Missing order_id in payload', payload);
    return;
  }

  if (transaction_status !== 'SUCCESS') {
    await pool.query(
      `UPDATE public.ms_orders
          SET transaction_status = $1, payment_date = NOW()
        WHERE order_id = $2 AND transaction_status = 'PENDING'`,
      [transaction_status, order_id]
    );
    console.log('[webhookWorker] Non-success status recorded for', order_id, transaction_status);
    return;
  }

  // SUCCESS path — atomic
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      'SELECT * FROM public.ms_orders WHERE order_id = $1 FOR UPDATE',
      [order_id]
    );
    const order = orderRes.rows[0];

    if (!order) {
      await client.query('ROLLBACK');
      console.warn('[webhookWorker] Unknown order_id', order_id, '— skipping');
      return;
    }

    if (order.transaction_status === 'SUCCESS') {
      await client.query('ROLLBACK');
      console.log('[webhookWorker] Already processed (idempotent skip)', order_id);
      return;
    }

    // 1) Update order
    await client.query(
      `UPDATE public.ms_orders
          SET transaction_status = 'SUCCESS',
              payment_mode = $1,
              txn_id = $2,
              payment_date = NOW()
        WHERE order_id = $3`,
      [payment_mode || 'ONLINE', txn_id || null, order_id]
    );

    // 2) Debit driver wallet
    const driverRes = await client.query(
      'SELECT wallet_balance FROM public.drivers WHERE id = $1 FOR UPDATE',
      [order.driver_id]
    );
    const currentBalance = Number(driverRes.rows[0]?.wallet_balance ?? 0);
    const newBalance     = currentBalance - Number(order.amount);

    await client.query(
      'UPDATE public.drivers SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, order.driver_id]
    );

    // 3) Append-only ledger entry
    await client.query(
      `INSERT INTO public.driver_ledger
         (driver_id, owner_id, entry_type, amount, description, balance_after, order_id, created_by)
       VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6, $7)`,
      [
        order.driver_id,
        order.owner_id,
        Number(order.amount),
        `Rent payment — order ${order_id}`,
        newBalance,
        order.id,
        order.owner_id,
      ]
    );

    await client.query('COMMIT');
    console.log('[webhookWorker] SUCCESS processed', order_id, '| new balance', newBalance);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err; // re-throw so message is NOT deleted from SQS — will retry
  } finally {
    client.release();
  }
}

/**
 * Main poll loop — runs forever until SIGTERM/SIGINT.
 */
let running = true;

process.on('SIGTERM', () => { console.log('[webhookWorker] SIGTERM — draining...'); running = false; });
process.on('SIGINT',  () => { console.log('[webhookWorker] SIGINT  — draining...'); running = false; });

async function poll() {
  const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

  while (running) {
    let result;
    try {
      result = await getSqs().send(new ReceiveMessageCommand({
        QueueUrl:            QUEUE_URL,
        MaxNumberOfMessages: MAX_MESSAGES,
        WaitTimeSeconds:     WAIT_SECONDS,
        AttributeNames:      ['ApproximateReceiveCount'],
      }));
    } catch (err) {
      console.error('[webhookWorker] SQS receive error:', err.message);
      await new Promise(r => setTimeout(r, 5000)); // back-off on AWS errors
      continue;
    }

    const messages = result.Messages || [];
    if (messages.length === 0) continue;

    await Promise.allSettled(
      messages.map(async (msg) => {
        let payload;
        try {
          payload = JSON.parse(msg.Body);
          await processWebhook(payload);
          // Delete only on success
          await getSqs().send(new DeleteMessageCommand({
            QueueUrl:      QUEUE_URL,
            ReceiptHandle: msg.ReceiptHandle,
          }));
        } catch (err) {
          // Leave on queue for SQS retry / DLQ after maxReceiveCount
          console.error('[webhookWorker] Failed to process message', msg.MessageId, err.message);
        }
      })
    );
  }

  console.log('[webhookWorker] Stopped.');
  process.exit(0);
}

module.exports = { poll, processWebhook };
