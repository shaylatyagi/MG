// backend/src/services/notify.js
// Centralised WhatsApp / SMS notification helper (Twilio)
// Usage: await notify.whatsapp(phone, message)
// All calls are fire-and-forget — never throw to caller

const twilio = require('twilio');

const client = () => {
  const sid    = process.env.TWILIO_ACCOUNT_SID;
  const token  = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
};

// Send WhatsApp message via Twilio sandbox or approved number
// phone: 10-digit Indian mobile (no +91)
async function whatsapp(phone, message) {
  try {
    const c    = client();
    if (!c) { console.log('[notify] Twilio not configured — skipping WhatsApp'); return false; }
    const from = process.env.TWILIO_WHATSAPP_FROM || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
    await c.messages.create({
      from,
      to:   `whatsapp:+91${phone}`,
      body: message,
    });
    return true;
  } catch (err) {
    console.error('[notify] WhatsApp error:', err.message);
    return false;
  }
}

// Send plain SMS fallback
async function sms(phone, message) {
  try {
    const c = client();
    if (!c) return false;
    await c.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   `+91${phone}`,
      body: message,
    });
    return true;
  } catch (err) {
    console.error('[notify] SMS error:', err.message);
    return false;
  }
}

// Try WhatsApp first, fall back to SMS
async function send(phone, message) {
  const ok = await whatsapp(phone, message);
  if (!ok) await sms(phone, message);
}

module.exports = { whatsapp, sms, send };
