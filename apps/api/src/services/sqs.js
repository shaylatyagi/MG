// apps/api/src/services/sqs.js
// DevSpec §30 — SQS async job publishing (ADR-007).
// Mock mode: when SQS_NOTIFICATION_URL is absent (dev), logs payloads to console instead of enqueuing.
'use strict';

const { randomUUID } = require('crypto');

let _sqs = null;

function getSqs() {
  if (_sqs) return _sqs;
  // Lazy-require so app starts even without AWS SDK in dev
  try {
    const { SQSClient } = require('@aws-sdk/client-sqs');
    _sqs = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
  } catch {
    _sqs = null;
  }
  return _sqs;
}

const isMock = () =>
  !process.env.SQS_NOTIFICATION_URL || process.env.NODE_ENV !== 'production';

async function _send(queueUrl, body, opts = {}) {
  if (isMock()) {
    console.log('[SQS MOCK]', queueUrl, JSON.stringify(body));
    return;
  }
  const { SendMessageCommand } = require('@aws-sdk/client-sqs');
  await getSqs().send(new SendMessageCommand({
    QueueUrl:               queueUrl,
    MessageBody:            JSON.stringify(body),
    ...opts,
  }));
}

/**
 * Publish a push notification job to mg-notifications.fifo
 * @param {{ recipientId: number, recipientRole: string, type: string, title: string, body?: string }} payload
 */
async function publishNotification(payload) {
  await _send(
    process.env.SQS_NOTIFICATION_URL,
    payload,
    {
      MessageGroupId:         String(payload.recipientId),
      MessageDeduplicationId: randomUUID(),
    }
  );
}

/**
 * Publish a PayYantra webhook payload to mg-webhook-processing (standard queue)
 * @param {object} payload — raw webhook body + headers needed for processing
 */
async function publishWebhook(payload) {
  await _send(process.env.SQS_WEBHOOK_URL, payload);
}

/**
 * Publish an audit log entry to mg-audit-log.fifo
 * @param {{ actorId: number, actorRole: string, action: string, entityType?: string, entityId?: number, beforeState?: object, afterState?: object, ipAddress?: string }} payload
 */
async function publishAuditLog(payload) {
  await _send(
    process.env.SQS_AUDIT_URL,
    payload,
    {
      MessageGroupId:         payload.entityType || 'global',
      MessageDeduplicationId: randomUUID(),
    }
  );
}

module.exports = { publishNotification, publishWebhook, publishAuditLog };
