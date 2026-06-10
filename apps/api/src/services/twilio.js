// apps/api/src/services/twilio.js — DevSpec §external-services
// SMS and WhatsApp messaging via Twilio.
// All message sends MUST go through this file — never import twilio directly in routes/controllers.
'use strict';

function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN  &&
    process.env.TWILIO_FROM_NUMBER
  );
}

function getClient() {
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send a plain SMS.
 *
 * @param {string} to      — E.164 format, e.g. +919876543210
 * @param {string} body    — message text
 */
exports.sendSms = async (to, body) => {
  if (!isTwilioConfigured()) {
    console.log(JSON.stringify({ level: 'info', event: 'twilio_mock_sms', to, body }));
    return;
  }
  await getClient().messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to,
    body,
  });
};

/**
 * Send a WhatsApp message via Twilio sandbox or approved template.
 *
 * @param {string} to   — E.164 format
 * @param {string} body — message text (must match approved template in prod)
 */
exports.sendWhatsApp = async (to, body) => {
  if (!isTwilioConfigured()) {
    console.log(JSON.stringify({ level: 'info', event: 'twilio_mock_whatsapp', to, body }));
    return;
  }
  const from = process.env.TWILIO_WHATSAPP_FROM || `whatsapp:${process.env.TWILIO_FROM_NUMBER}`;
  await getClient().messages.create({
    from,
    to:   `whatsapp:${to}`,
    body,
  });
};

/**
 * Send payment confirmation WhatsApp message to driver.
 *
 * @param {{ mobile: string, amount: number, orderId: string, ownerName: string }} opts
 */
exports.sendPaymentConfirmation = async ({ mobile, amount, orderId, ownerName }) => {
  const to   = mobile.startsWith('+') ? mobile : `+91${mobile}`;
  const body = `✅ Payment of ₹${amount} received for order ${orderId}. Fleet: ${ownerName}. Thank you!`;
  await exports.sendWhatsApp(to, body);
};

/**
 * Send OTP via SMS.
 *
 * @param {{ mobile: string, otp: string }} opts
 */
exports.sendOtp = async ({ mobile, otp }) => {
  const to   = mobile.startsWith('+') ? mobile : `+91${mobile}`;
  const body = `Your MobilityGrid OTP is: ${otp}. Valid for 10 minutes. Do not share.`;
  await exports.sendSms(to, body);
};
