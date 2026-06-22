/**
 * mailer.js — Gmail SMTP (primary) → Brevo SMTP (fallback)
 *
 * Render env vars needed (set in Render → Environment):
 *   GMAIL_USER=mobilitygrid@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← Gmail App Password (NOT login password)
 *
 * Optional fallback:
 *   BREVO_USER=your_brevo_login_email
 *   BREVO_PASS=your_brevo_smtp_key
 *
 * Lead destination:
 *   LEADS_EMAIL=mobilitygrid@gmail.com   (defaults to mobilitygrid@gmail.com)
 */
const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

// ── Build transporter — Gmail first, Brevo second ────────────────────────────
function makeTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  if (process.env.BREVO_USER && process.env.BREVO_PASS) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user: process.env.BREVO_USER, pass: process.env.BREVO_PASS },
    });
  }
  // No credentials — return null, will skip sending
  return null;
}

// ── Send helper — tries primary, then secondary if first fails ───────────────
async function sendMail(mailOptions) {
  const primary = makeTransporter();
  if (!primary) {
    console.error('[mailer] No SMTP credentials set. Set GMAIL_USER + GMAIL_APP_PASSWORD in Render env.');
    return { ok: false, reason: 'no_credentials' };
  }

  const from = process.env.GMAIL_USER
    ? `"MobilityGrid" <${process.env.GMAIL_USER}>`
    : process.env.BREVO_USER
      ? `"MobilityGrid" <${process.env.BREVO_USER}>`
      : '"MobilityGrid" <noreply@mobilitygrid.in>';

  try {
    await primary.sendMail({ ...mailOptions, from });
    console.log('[mailer] ✅ Email sent to', mailOptions.to);
    return { ok: true };
  } catch (err) {
    console.error('[mailer] Primary SMTP failed:', err.message);

    // If primary was Gmail, try Brevo as fallback
    if (process.env.GMAIL_USER && process.env.BREVO_USER && process.env.BREVO_PASS) {
      const fallback = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com', port: 587, secure: false,
        auth: { user: process.env.BREVO_USER, pass: process.env.BREVO_PASS },
      });
      try {
        await fallback.sendMail({ ...mailOptions, from: `"MobilityGrid" <${process.env.BREVO_USER}>` });
        console.log('[mailer] ✅ Email sent via Brevo fallback to', mailOptions.to);
        return { ok: true };
      } catch (err2) {
        console.error('[mailer] Brevo fallback also failed:', err2.message);
        return { ok: false, reason: err2.message };
      }
    }
    return { ok: false, reason: err.message };
  }
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
const row = (label, value) =>
  `<tr><td style="padding:8px 12px;color:#64748b;width:200px;vertical-align:top">${label}</td><td style="padding:8px 12px;font-weight:600;color:#1e293b">${value || '—'}</td></tr>`;

const wrapHtml = (body) => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#0f172a;padding:20px 28px">
    <p style="color:#94a3b8;margin:0;font-size:13px">MobilityGrid — Fleet Management Platform</p>
  </div>
  <div style="padding:28px">${body}</div>
</div>`;

// ── sendLeadEmails — called after waitlist form submission ───────────────────
async function sendLeadEmails(lead) {
  const { name, phone, company = '—', role = '—', fleet = '—', city = '—', type = '—', email } = lead;
  const adminTo  = process.env.LEADS_EMAIL || process.env.ADMIN_EMAIL || 'mobilitygrid@gmail.com';
  const dateTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' });

  // ── 1. Internal lead alert ─────────────────────────────────────────────────
  await sendMail({
    to: adminTo,
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

  // ── 2. Confirmation to user (only if email provided) ──────────────────────
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
