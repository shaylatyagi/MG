/**
 * mailer.js — Brevo REST API via https module (works on Render free tier)
 *
 * Render env vars needed:
 *   BREVO_API_KEY   = xkeysib-xxxxxxxxxxxx
 *   BREVO_SENDER    = mobilitygrid@gmail.com  (verified in Brevo)
 *   LEADS_EMAIL     = mobilitygrid@gmail.com
 */
const https  = require('https');
const logger = require('../utils/logger');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER  = process.env.BREVO_SENDER || process.env.BREVO_USER || 'mobilitygrid@gmail.com';
const LEADS_EMAIL   = process.env.LEADS_EMAIL  || process.env.ADMIN_EMAIL || 'mobilitygrid@gmail.com';

// ── Core send via Brevo REST API (https module, no native fetch needed) ───────
function sendMail({ to, subject, html }) {
  return new Promise((resolve) => {
    if (!BREVO_API_KEY) {
      console.error('[mailer] BREVO_API_KEY not set in Render env vars');
      return resolve({ ok: false, reason: 'no_api_key' });
    }

    const body = JSON.stringify({
      sender:      { name: 'MobilityGrid', email: BREVO_SENDER },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
    });

    const req = https.request({
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers:  {
        'accept':         'application/json',
        'api-key':        BREVO_API_KEY,
        'content-type':   'application/json',
        'content-length': Buffer.byteLength(body),
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('[mailer] ✅ Sent to', to, '| messageId:', parsed.messageId);
            resolve({ ok: true });
          } else {
            console.error('[mailer] ❌ Brevo error', res.statusCode, data);
            resolve({ ok: false, reason: parsed.message || data });
          }
        } catch (e) {
          resolve({ ok: false, reason: 'parse_error: ' + data });
        }
      });
    });

    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'Request timed out' }); });
    req.on('error',   (err) => { resolve({ ok: false, reason: err.message }); });
    req.write(body);
    req.end();
  });
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
const row = (label, value) =>
  `<tr><td style="padding:8px 12px;color:#64748b;width:200px;vertical-align:top">${label}</td><td style="padding:8px 12px;font-weight:600;color:#1e293b">${value || '—'}</td></tr>`;

const wrapHtml = (content) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#0f172a;padding:20px 28px">
    <p style="color:#94a3b8;margin:0;font-size:13px">MobilityGrid — Fleet Management Platform</p>
  </div>
  <div style="padding:28px">${content}</div>
</div>`;

// ── sendLeadEmails ────────────────────────────────────────────────────────────
async function sendLeadEmails(lead) {
  const { name, phone, company = '—', role = '—', fleet = '—', city = '—', type = '—', email } = lead;
  const dateTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' });

  // 1. Internal alert
  await sendMail({
    to: LEADS_EMAIL,
    subject: `🔔 New Lead | ${company} | ${city}`,
    html: wrapHtml(`
      <p style="font-size:15px;margin:0 0 20px">New Expression of Interest from <strong>${name}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:6px;margin-bottom:20px">
        ${row('Name', name)}
        ${row('WhatsApp', phone)}
        ${email ? row('Email', email) : ''}
        ${row('Organisation', company)}
        ${row('Role', role)}
        ${row('Fleet Size', fleet)}
        ${row('City', city)}
        ${row('Vehicle Type', type)}
        ${row('Submitted', dateTime)}
      </table>
      <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;border-radius:0 6px 6px 0">
        <p style="margin:0;font-size:13px;font-weight:700;color:#1e40af">Action Required</p>
        <p style="margin:6px 0 0;font-size:13px;color:#1d4ed8">Contact the prospect and qualify the opportunity.</p>
      </div>
    `),
  });

  // 2. Confirmation to submitter
  if (email) {
    await sendMail({
      to: email,
      subject: 'Thank You for Your Interest in MobilityGrid',
      html: wrapHtml(`
        <p style="font-size:15px;margin:0 0 8px">Dear <strong>${name}</strong>,</p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 20px">
          Thank you for your interest in MobilityGrid.<br/>
          We have received your details and will get in touch shortly.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:6px;margin-bottom:20px">
          ${row('Name', name)}
          ${row('WhatsApp', phone)}
          ${row('Organisation', company)}
          ${row('Role', role)}
          ${row('Fleet Size', fleet)}
          ${row('City', city)}
          ${row('Vehicle Type', type)}
        </table>
        <div style="border-top:1px solid #e2e8f0;padding-top:16px">
          <p style="font-size:13px;color:#475569;margin:0;line-height:1.8">
            Regards,<br/><strong>Team MobilityGrid</strong><br/>
            <a href="mailto:support@mobilitygrid.in" style="color:#3b82f6">support@mobilitygrid.in</a> ·
            <a href="https://mobilitygrid.in" style="color:#3b82f6">mobilitygrid.in</a>
          </p>
        </div>
      `),
    });
  }
}

module.exports = { sendLeadEmails, sendMail };
