// apps/api/src/controllers/auth.controller.js
// DevSpec §13.1 — OTP auth flow.
'use strict';

const bcrypt        = require('bcrypt');
const pool          = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { AppError }  = require('../utils/errors');
const twilioService = require('../services/twilio');

// POST /api/auth/send-otp
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    const otp  = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otp, 10);

    await pool.query(
      `INSERT INTO public.otps (phone_number, otp_hash, expires_at, attempts)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (phone_number) DO UPDATE
         SET otp_hash = $2, expires_at = NOW() + INTERVAL '10 minutes', attempts = 0`,
      [phone, hash]
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({ level: 'info', event: 'otp_dev', phone, otp }));
    } else {
      await twilioService.sendOtp({ mobile: phone, otp }).catch(err => {
        console.error(JSON.stringify({ level: 'error', event: 'twilio_error', message: err.message }));
      });
    }

    // Return OTP in response when DEV_BYPASS_OTP is on (demo mode)
    const resp = { success: true, message: 'OTP sent' };
    if (process.env.DEV_BYPASS_OTP === 'true') resp.otp = otp;
    res.json(resp);
  } catch (err) { next(err); }
};

// POST /api/auth/verify-otp
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';

    if (!isDevBypass) {
      const { rows } = await pool.query(
        'SELECT * FROM public.otps WHERE phone_number = $1 AND expires_at > NOW() LIMIT 1',
        [phone]
      );
      const record = rows[0];
      if (!record) throw new AppError('OTP expired or not found', 400, 'OTP_INVALID');
      if (record.attempts >= 3) throw new AppError('Too many attempts', 429, 'OTP_LOCKED');

      const valid = await bcrypt.compare(otp, record.otp_hash);
      if (!valid) {
        await pool.query('UPDATE public.otps SET attempts = attempts + 1 WHERE phone_number = $1', [phone]);
        throw new AppError('Invalid OTP', 400, 'OTP_INVALID');
      }
      await pool.query('DELETE FROM public.otps WHERE phone_number = $1', [phone]);
    }

    // Admin phone shortcut
    if (process.env.ADMIN_PHONE && phone === process.env.ADMIN_PHONE) {
      const token = generateToken({ id: 'admin', role: 'admin', phone });
      return res.json({ success: true, token, user: { role: 'admin', phone } });
    }

    const [ownerRes, driverRes, managerRes] = await Promise.all([
      pool.query(
        "SELECT id, name, phone_number, status, company_id, owner_code, 'owner' AS role FROM public.owners WHERE phone_number = $1 LIMIT 1",
        [phone]
      ),
      pool.query(
        "SELECT id, name, phone_number, status, owner_id, company_id, 'driver' AS role FROM public.drivers WHERE phone_number = $1 LIMIT 1",
        [phone]
      ),
      pool.query(
        "SELECT id, name, phone_number, status, owner_id, permissions, 'manager' AS role FROM public.managers WHERE phone_number = $1 LIMIT 1",
        [phone]
      ),
    ]);

    const user = ownerRes.rows[0] || driverRes.rows[0] || managerRes.rows[0];
    if (!user) throw new AppError('Phone number not registered', 404, 'NOT_FOUND');

    if (user.role === 'manager') {
      const { rows } = await pool.query(
        'SELECT subscription_status FROM public.owners WHERE id = $1',
        [user.owner_id]
      );
      if (rows[0]?.subscription_status !== 'ACTIVE')
        throw new AppError('Fleet owner subscription expired', 403, 'SUBSCRIPTION_EXPIRED');
    }

    const payload = {
      id:          user.id,
      role:        user.role,
      phone:       user.phone_number,
      owner_id:    user.owner_id    || null,
      company_id:  user.company_id  || null,
      permissions: user.permissions || null,
    };
    const token = generateToken(payload);
    res.json({ success: true, token, user: { ...payload } });
  } catch (err) { next(err); }
};

// POST /api/auth/logout
exports.logout = (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
};

// POST /api/auth/admin-send-otp
exports.adminSendOtp = async (req, res, next) => {
  try {
    const { phone_number, admin_secret } = req.body;

    if (!admin_secret || admin_secret !== process.env.ADMIN_SECRET_KEY)
      throw new AppError('Invalid admin credentials', 403, 'FORBIDDEN');
    if (!process.env.ADMIN_PHONE || phone_number !== process.env.ADMIN_PHONE)
      throw new AppError('Phone not authorised for admin access', 403, 'FORBIDDEN');

    const otp  = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(otp, 10);

    await pool.query(
      `INSERT INTO public.otps (phone_number, otp_hash, expires_at, attempts)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (phone_number) DO UPDATE
         SET otp_hash = $2, expires_at = NOW() + INTERVAL '10 minutes', attempts = 0`,
      [phone_number, hash]
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({ level: 'info', event: 'admin_otp_dev', phone_number, otp }));
    } else {
      await twilioService.sendOtp({ mobile: phone_number, otp }).catch(err => {
        console.error(JSON.stringify({ level: 'error', event: 'twilio_error', message: err.message }));
      });
    }

    const resp = { success: true, message: 'OTP sent' };
    if (process.env.DEV_BYPASS_OTP === 'true') resp.otp = otp;
    res.json(resp);
  } catch (err) { next(err); }
};

// POST /api/auth/admin-verify-otp
exports.adminVerifyOtp = async (req, res, next) => {
  try {
    const { phone_number, otp, admin_secret } = req.body;

    if (!admin_secret || admin_secret !== process.env.ADMIN_SECRET_KEY)
      throw new AppError('Invalid admin credentials', 403, 'FORBIDDEN');
    if (!process.env.ADMIN_PHONE || phone_number !== process.env.ADMIN_PHONE)
      throw new AppError('Phone not authorised for admin access', 403, 'FORBIDDEN');

    const isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';

    if (!isDevBypass) {
      const { rows } = await pool.query(
        'SELECT * FROM public.otps WHERE phone_number = $1 AND expires_at > NOW() LIMIT 1',
        [phone_number]
      );
      const record = rows[0];
      if (!record) throw new AppError('OTP expired or not found', 400, 'OTP_INVALID');
      if (record.attempts >= 3) throw new AppError('Too many attempts', 429, 'OTP_LOCKED');

      const valid = await bcrypt.compare(otp, record.otp_hash);
      if (!valid) {
        await pool.query('UPDATE public.otps SET attempts = attempts + 1 WHERE phone_number = $1', [phone_number]);
        throw new AppError('Invalid OTP', 400, 'OTP_INVALID');
      }
      await pool.query('DELETE FROM public.otps WHERE phone_number = $1', [phone_number]);
    }

    const token = generateToken({ id: 'admin', role: 'admin', phone: phone_number });
    res.json({ success: true, token, user: { role: 'admin', phone: phone_number } });
  } catch (err) { next(err); }
};
