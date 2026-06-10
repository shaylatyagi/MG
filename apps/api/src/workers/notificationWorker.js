// apps/api/src/workers/notificationWorker.js — DevSpec §64, ADR-007
// SQS long-poll consumer for mg-notifications.fifo.
// Reads notification jobs published by controllers/workers and dispatches FCM pushes.
// Run via: node apps/api/worker.js
'use strict';

const fcm = require('../services/fcm');

let _sqs = null;
function getSqs() {
  if (_sqs) return _sqs;
  const { SQSClient } = require('@aws-sdk/client-sqs');
  _sqs = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
  return _sqs;
}

const QUEUE_URL    = process.env.SQS_NOTIFICATION_URL;
const MAX_MESSAGES = 10;
const WAIT_SECONDS = 20;

/**
 * Dispatch a single notification payload to FCM.
 *
 * Expected payload shape (from publishNotification):
 *   { recipientId, recipientRole, type, title, body?, data? }
 *
 * Types: CHAT_MESSAGE | PAYMENT_SUCCESS | INCENTIVE | KYC_UPDATE | SOS
 */
async function processNotification(payload) {
  const {
    recipientId,
    recipientRole,
    type,
    title,
    body  = '',
    data  = {},
  } = payload;

  if (!recipientId || !recipientRole) {
    console.warn('[notifWorker] Missing recipientId/Role in payload', payload);
    return;
  }

  // Build human-readable title/body if not supplied by caller
  const defaults = {
    CHAT_MESSAGE:    { title: '💬 New message',          body: body || 'You have a new message' },
    PAYMENT_SUCCESS: { title: '✅ Payment confirmed',    body: body || 'Your rent payment was received' },
    INCENTIVE:       { title: '🎉 Incentive earned',     body: body || 'You earned a rent incentive!' },
    KYC_UPDATE:      { title: '📋 KYC status updated',  body: body || 'Your KYC documents were reviewed' },
    SOS:             { title: '🚨 SOS Alert',            body: body || 'Driver sent an SOS alert' },
  };

  const { title: t, body: b } = defaults[type] || { title: title || 'MobilityGrid', body };

  await fcm.sendToUser(
    recipientId,
    recipientRole,
    t,
    b,
    { type, ...data }
  );

  console.log('[notifWorker] dispatched', type, '->', recipientRole, recipientId);
}

let running = true;

process.on('SIGTERM', () => { console.log('[notifWorker] SIGTERM — draining...'); running = false; });
process.on('SIGINT',  () => { console.log('[notifWorker] SIGINT  — draining...'); running = false; });

async function poll() {
  if (!QUEUE_URL) {
    console.warn('[notifWorker] SQS_NOTIFICATION_URL not set — mock mode');
    return;
  }

  const { ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
  console.log('[notifWorker] Polling', QUEUE_URL);

  while (running) {
    let result;
    try {
      result = await getSqs().send(new ReceiveMessageCommand({
        QueueUrl:            QUEUE_URL,
        MaxNumberOfMessages: MAX_MESSAGES,
        WaitTimeSeconds:     WAIT_SECONDS,
      }));
    } catch (err) {
      console.error('[notifWorker] SQS receive error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const messages = result.Messages || [];
    if (!messages.length) continue;

    await Promise.allSettled(
      messages.map(async (msg) => {
        try {
          const payload = JSON.parse(msg.Body);
          await processNotification(payload);
          await getSqs().send(new DeleteMessageCommand({
            QueueUrl:      QUEUE_URL,
            ReceiptHandle: msg.ReceiptHandle,
          }));
        } catch (err) {
          console.error('[notifWorker] Failed to process', msg.MessageId, err.message);
        }
      })
    );
  }

  console.log('[notifWorker] Stopped.');
}

module.exports = { poll, processNotification };
