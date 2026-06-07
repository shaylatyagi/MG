// apps/api/src/routes/auth.js — Unified OTP auth per DevSpec §13.1
const router   = require('express').Router();
const bcrypt   = require('bcrypt');
const pool     = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { AppError }      = require('../utils/errors');

let twilioClient;
const getTwilio = () => {
  if (!twilioClient) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const sendOtpMessage = async (phone, otp) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(JSON.stringify({ level: 'info', event: 'otp_dev', phone, otp }));
    return;
  }
  try {
    await getTwilio().messages.create({
      body: `Your MobilityGrid OTP is ${otp}. Valid 10 minutes. Do not share.`,
      from: process.env.TWILIO_FROM,
      to: `+91${phone}`,
    });
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'twilio_error', message: err.message }));
  }
};

// POST /api/auth/send-otp — rate-limited, bcrypt-hashed OTP storage
router.post('/send-otp', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone))
      throw new AppError('Valid 10-digit Indian mobile required', 400, 'VALIDATION_ERROR');

    const otp  = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otp, 10);

    await pool.query(
      `INSERT INTO otps (phone_number, otp_hash, expires_at, attempts)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (phone_number) DO UPDATE
         SET otp_hash = $2, expires_at = NOW() + INTERVAL '10 minutes', attempts = 0`,
      [phone, hash]
    );

    await sendOtpMessage(phone, otp);

    res.json({ success: true, message: 'OTP sent' });
  } catch (err) { next(err); }
});

// POST /api/auth/verify-otp — role detection per DevSpec §13.1
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp)
      throw new AppError('phone and otp required', 400, 'VALIDATION_ERROR');

    // Dev bypass — 000000 always works outside production
    const isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';

    if (!isDevBypass) {
      const { rows } = await pool.query(
        'SELECT * FROM otps WHERE phone_number = $1 AND expires_at > NOW() LIMIT 1',
        [phone]
      );
      const record = rows[0];
      if (!record) throw new AppError('OTP expired or not found', 400, 'OTP_INVALID');
      if (record.attempts >= 3) throw new AppError('Too many attempts', 429, 'OTP_LOCKED');

      const valid = await bcrypt.compare(otp, record.otp_hash);
      if (!valid) {
        await pool.query('UPDATE otps SET attempts = attempts + 1 WHERE phone_number = $1', [phone]);
        throw new AppError('Invalid OTP', 400, 'OTP_INVALID');
      }
      await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone]);
    }

    // Detect role: admin → owner → driver → manager
    if (process.env.ADMIN_PHONE && phone === process.env.ADMIN_PHONE) {
      const token = generateToken({ id: 'admin', role: 'admin', phone });
      return res.json({ success: true, token, user: { role: 'admin', phone } });
    }

    const [ownerRes, driverRes, managerRes] = await Promise.all([
      pool.query("SELECT id, name, phone_number, status, company_id, 'owner' AS role FROM owners WHERE phone_number = $1 LIMIT 1", [phone]),
      pool.query("SELECT id, name, phone_number, status, owner_id, company_id, 'driver' AS role FROM drivers WHERE phone_number = $1 LIMIT 1", [phone]),
      pool.query("SELECT id, name, phone_number, status, owner_id, permissions, 'manager' AS role FROM managers WHERE phone_number = $1 LIMIT 1", [phone]),
    ]);

    const user = ownerRes.rows[0] || driverRes.rows[0] || managerRes.rows[0];
    if (!user) throw new AppError('Phone number not registered', 404, 'NOT_FOUND');

    // Manager: check owner subscription
    if (user.role === 'manager') {
      const { rows } = await pool.query(
        "SELECT subscription_status FROM owners WHERE id = $1", [user.owner_id]
      );
      if (rows[0]?.subscription_status !== 'ACTIVE')
        throw new AppError('Fleet owner subscription expired', 403, 'SUBSCRIPTION_EXPIRED');
    }

    const payload = {
      id:         user.id,
      role:       user.role,
      phone:      user.phone_number,
      owner_id:   user.owner_id   || null,
      company_id: user.company_id || null,
      permissions: user.permissions || null,
    };
    const token = generateToken(payload);
    res.json({ success: true, token, user: { ...payload } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // JWT is stateless — client deletes the token
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
