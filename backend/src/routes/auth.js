const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../middleware/auth');
const twilio = require('twilio');

const sendOTP = async (phone, otp) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your MobilityGrid OTP is ${otp}. Valid 10 mins. Do not share.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`
    });
    return true;
  } catch (err) {
    console.error('Twilio error:', err.message);
    return false;
  }
};

// 1. SEND OTP (driver / owner)
router.post('/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ success: false, message: 'Phone required' });
  try {
    const userRes = await pool.query(
      `SELECT id, full_name FROM public.drivers WHERE mobile_number = $1
       UNION SELECT id, full_name FROM public.owners WHERE mobile_number = $1 LIMIT 1`,
      [phone_number]
    );
    if (!userRes.rows[0])
      return res.status(404).json({ success: false, message: 'Phone registered nahi hai' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
      [phone_number, otp]
    );
    if (process.env.NODE_ENV !== 'production') console.log('OTP:', phone_number, otp);
    res.json({ success: true, message: 'OTP generated', otp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. VERIFY OTP (driver / owner)
router.post('/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;
  if (!phone_number || !otp)
    return res.status(400).json({ success: false, message: 'Phone and OTP required' });
  try {
    const otpRes = await pool.query(
      'SELECT * FROM otps WHERE phone_number = $1 AND otp = $2 AND expires_at > NOW() LIMIT 1',
      [phone_number, otp]
    );
    if (!otpRes.rows[0])
      return res.status(400).json({ success: false, message: 'OTP invalid or expired' });
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    const driverRes = await pool.query(
      "SELECT *, 'DRIVER' as role FROM public.drivers WHERE mobile_number = $1 LIMIT 1",
      [phone_number]
    );
    const ownerRes = await pool.query(
      "SELECT *, 'OWNER' as role FROM public.owners WHERE mobile_number = $1 LIMIT 1",
      [phone_number]
    );
    const user = driverRes.rows[0] || ownerRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const token = generateToken({ id: user.id, phone_number: user.mobile_number, role: user.role });
    res.json({
      success: true, token,
      user: {
        id: user.id, full_name: user.full_name, mobile_number: user.mobile_number,
        role: user.role, owner_code: user.owner_code || null,
        driver_code: user.driver_code || null, status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/owner/vehicles/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE public.vehicles SET operational_status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/update-profile', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const result = await pool.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [name, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update' });
  }
});

router.post('/register', async (req, res) => {
  const { phone_number, name, role } = req.body;
  try {
    const result = await pool.query('INSERT INTO users (phone_number, name, role) VALUES ($1, $2, $3) RETURNING *', [phone_number, name, role]);
    const token = generateToken(result.rows[0]);
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /api/auth/admin-send-otp  — Body: { phone_number, admin_secret }
router.post('/admin-send-otp', async (req, res) => {
  const { phone_number, admin_secret } = req.body;
  const expected = process.env.ADMIN_SECRET_KEY || 'mg_admin_2026_secret';
  const adminPhone = process.env.ADMIN_PHONE;
  if (!admin_secret || admin_secret !== expected)
    return res.status(403).json({ success: false, message: 'Invalid admin secret' });
  if (!phone_number || (adminPhone && phone_number !== adminPhone))
    return res.status(403).json({ success: false, message: 'Unauthorized phone number' });
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
      [phone_number, otp]
    );
    if (process.env.NODE_ENV !== 'production') console.log('[ADMIN OTP]', phone_number, otp);
    await sendOTP(phone_number, otp);
    res.json({ success: true, message: 'OTP sent to admin phone' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-verify-otp  — Body: { phone_number, otp, admin_secret }
router.post('/admin-verify-otp', async (req, res) => {
  const { phone_number, otp, admin_secret } = req.body;
  const expected = process.env.ADMIN_SECRET_KEY || 'mg_admin_2026_secret';
  if (!admin_secret || admin_secret !== expected)
    return res.status(403).json({ success: false, message: 'Invalid admin secret' });
  if (!phone_number || !otp)
    return res.status(400).json({ success: false, message: 'phone_number and otp required' });
  try {
    // Dev bypass — OTP 000000 works when DEV_BYPASS_OTP=true (set in Render for demo)
    const isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';
    if (!isDevBypass) {
      const otpRes = await pool.query(
        'SELECT * FROM otps WHERE phone_number = $1 AND otp = $2 AND expires_at > NOW() LIMIT 1',
        [phone_number, otp]
      );
      if (!otpRes.rows[0])
        return res.status(400).json({ success: false, message: 'OTP invalid or expired' });
      await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    }
    const secret = process.env.JWT_SECRET || 'voltops_super_secret_key_2025';
    const token = jwt.sign({ id: 'admin', role: 'admin', phone: phone_number }, secret, { expiresIn: '30d' });
    res.json({ success: true, token, user: { role: 'admin', phone: phone_number } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
