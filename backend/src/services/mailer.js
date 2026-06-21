/**
 * mailer.js — Nodemailer transporter using Brevo SMTP
 * env vars required: BREVO_USER, BREVO_PASS, ADMIN_EMAIL
 */
const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

/**
 * sendLeadEmails — fires after a waitlist form submission
 * @param {Object} lead  { name, phone, company, role, fleet, city, type, email? }
 */
async function sendLeadEmails(lead) {
  const { name, phone, company = '—', role = '—', fleet = '—', city = '—', type = '—', email } = lead;
  const dateTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' });
  const from    = `"MobilityGrid" <${process.env.BREVO_USER}>`;
  const adminTo = process.env.LEADS_EMAIL || process.env.ADMIN_EMAIL;

  const row = (label, value) =>
    `<tr><td style="padding:8px 12px;color:#64748b;width:200px;vertical-align:top">${label}</td><td style="padding:8px 12px;font-weight:600;color:#1e293b">${value || '—'}</td></tr>`;

  // ── 1. Admin alert ──────────────────────────────────────────────────────────
  if (adminTo) {
    await transporter.sendMail({
      from,
      to: adminTo,
      subject: `New Lead Alert | ${company} | ${city}`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#0f172a;padding:20px 28px">
    <p style="color:#94a3b8;margin:0;font-size:13px">MobilityGrid — Fleet Management Platform</p>
  </div>
  <div style="padding:28px">
    <p style="font-size:15px;margin:0 0 24px">A new Expression of Interest has been submitted through the MobilityGrid website.</p>

    <h3 style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;border-bottom:1px solid #f1f5f9;padding-bottom:8px">Lead Details</h3>

    <p style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 4px">Contact Information</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:6px">
      ${row('Name', name)}
      ${row('WhatsApp Number', phone)}
      ${email ? row('Email', email) : ''}
    </table>

    <p style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 4px">Organisation Details</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:6px">
      ${row('Organisation / Fleet Name', company)}
      ${row('Role', role)}
      ${row('Fleet Size', fleet)}
      ${row('City', city)}
      ${row('Vehicle Type', type)}
    </table>

    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;margin:24px 0;border-radius:0 6px 6px 0">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1e40af">Action Required</p>
      <p style="margin:6px 0 0;font-size:13px;color:#1d4ed8">Please contact the prospect and qualify the opportunity.</p>
    </div>

    <p style="font-size:12px;color:#94a3b8;margin:0">
      <strong>Submitted On:</strong> ${dateTime} &nbsp;·&nbsp; <strong>Source:</strong> Website – Express Your Interest Form
    </p>
  </div>
</div>`,
    }).catch(err => logger.error('Admin lead email failed', { error: err.message }));
  }

  // ── 2. Customer confirmation (only if email provided) ───────────────────────
  if (email) {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Thank You for Your Interest in MobilityGrid',
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <div style="background:#0f172a;padding:20px 28px">
    <p style="color:#94a3b8;margin:0;font-size:13px">MobilityGrid — Fleet Management Platform</p>
  </div>
  <div style="padding:28px">
    <p style="font-size:15px;margin:0 0 8px">Dear <strong>${name}</strong>,</p>
    <p style="font-size:14px;line-height:1.7;margin:0 0 24px">
      Thank you for expressing your interest in MobilityGrid.<br/>
      We have received your details and our team will review your requirements and get in touch with you shortly.
    </p>

    <h3 style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;border-bottom:1px solid #f1f5f9;padding-bottom:8px">Information Submitted</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:6px;margin-bottom:24px">
      ${row('Full Name', name)}
      ${row('WhatsApp Number', phone)}
      ${row('Organisation / Fleet Name', company)}
      ${row('Role', role)}
      ${row('Fleet Size', fleet)}
      ${row('City', city)}
      ${row('Vehicle Type', type)}
    </table>

    <p style="font-size:14px;line-height:1.7;margin:0 0 24px">
      We appreciate your interest and look forward to understanding your mobility and fleet management needs.<br/>
      If you have any immediate questions, feel free to reply to this email.
    </p>

    <div style="border-top:1px solid #e2e8f0;padding-top:20px">
      <p style="font-size:13px;color:#475569;margin:0;line-height:1.8">
        Regards,<br/>
        <strong>Team MobilityGrid</strong><br/>
        Email: <a href="mailto:support@mobilitygrid.in" style="color:#3b82f6">support@mobilitygrid.in</a> &nbsp;·&nbsp;
        Website: <a href="https://mobilitygrid.in" style="color:#3b82f6">mobilitygrid.in</a>
      </p>
    </div>
  </div>
</div>`,
    }).catch(err => logger.error('Customer lead email failed', { error: err.message }));
  }
}

module.exports = { sendLeadEmails };
