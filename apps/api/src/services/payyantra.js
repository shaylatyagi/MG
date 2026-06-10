// apps/api/src/services/payyantra.js — DevSpec §external-services
// Single source of truth for all PayYantra API calls.
// Controllers MUST NOT call axios/fetch directly to PayYantra.
'use strict';

const crypto = require('crypto');
const axios  = require('axios');

const BASE_URL    = () => process.env.PAYYANTRA_BASE_URL    || 'https://api.payyantra.com';
const MERCHANT_ID = () => process.env.PAYYANTRA_MERCHANT_ID;
const API_KEY     = () => process.env.PAYYANTRA_API_KEY;

function isMockMode() {
  return !MERCHANT_ID() || !API_KEY();
}

/**
 * Create a payment order with PayYantra.
 * Falls back to a mock response when env vars are absent (dev/test).
 *
 * @param {{ amount: number, driverCode: string, mobile: string, orderId: string, callbackUrl?: string }} opts
 * @returns {{ order_id: string, payment_url: string, status: string }}
 */
exports.createOrder = async ({ amount, driverCode, mobile, orderId, callbackUrl }) => {
  if (isMockMode()) {
    console.log(JSON.stringify({ level: 'info', event: 'payyantra_mock_create', orderId, amount }));
    return {
      order_id:    orderId,
      payment_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/mock?orderId=${orderId}`,
      status:      'PENDING',
    };
  }

  const payload = {
    merchant_id:   MERCHANT_ID(),
    order_id:      orderId,
    order_amount:  amount,
    payer_mobile:  mobile,
    driver_code:   driverCode,
    callback_url:  callbackUrl || process.env.PAYYANTRA_CALLBACK_URL,
  };

  const resp = await axios.post(
    `${BASE_URL()}/v1/orders/create`,
    payload,
    {
      headers: { 'x-api-key': API_KEY(), 'Content-Type': 'application/json' },
      timeout: 10_000,
    }
  );
  return resp.data;
};

/**
 * Fetch order status by our internal merchant order ID (by-reference endpoint).
 *
 * @param {string} merchantOrderId  — our internal MG order ID e.g. MG1780820235276
 * @returns {object} raw PayYantra response
 */
exports.getOrderStatusByReference = async (merchantOrderId) => {
  if (isMockMode()) {
    console.log(JSON.stringify({ level: 'info', event: 'payyantra_mock_status', merchantOrderId }));
    return { transactionStatus: 'PENDING', merchantOrderId };
  }

  const resp = await axios.get(
    `${BASE_URL()}/api/pay/status/by-reference/${merchantOrderId}`,
    {
      headers: { 'x-api-key': API_KEY() },
      timeout: 10_000,
    }
  );
  return resp.data;
};

/**
 * Fetch order status by PayYantra's own transaction ID.
 *
 * @param {string} transactionId  — PayYantra TXN-* string
 * @returns {object} raw PayYantra response
 */
exports.getOrderStatusByTxnId = async (transactionId) => {
  if (isMockMode()) {
    return { transactionStatus: 'PENDING', transactionId };
  }

  const resp = await axios.get(
    `${BASE_URL()}/api/pay/status/${transactionId}`,
    {
      headers: { 'x-api-key': API_KEY() },
      timeout: 10_000,
    }
  );
  return resp.data;
};

/**
 * Verify PayYantra webhook HMAC signature.
 * Returns true if valid (or if PAYYANTRA_WEBHOOK_SECRET is not set — dev mode).
 *
 * @param {string} rawBody   — the raw JSON string of the request body
 * @param {string} signature — value from x-payyantra-signature header
 * @returns {boolean}
 */
exports.verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.PAYYANTRA_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode: skip verification
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
};

/**
 * Normalise status strings from PayYantra to our internal enum.
 * PayYantra may return SUCCESSFUL, INITIATED, etc.
 */
exports.normaliseStatus = (raw) => {
  if (!raw) return 'PENDING';
  const s = String(raw).toUpperCase();
  if (s === 'SUCCESSFUL' || s === 'SUCCESS') return 'SUCCESS';
  if (s === 'INITIATED'  || s === 'PENDING') return 'PENDING';
  if (s === 'FAILED'     || s === 'FAILURE') return 'FAILED';
  return s; // pass through unknown values
};
