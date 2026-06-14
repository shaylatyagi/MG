const express  = require('express');
const router   = express.Router();
const pool     = require('../config/db');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const { generateToken, verifyToken } = require('../middleware/auth');
const twilio   = require('twilio');

// OTP rate limiting — { phone: { attempts: N, lockedUntil: ms } }
const otpAttempts = new Map();
const MAX_ATTEMPTS  = 3;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes

const checkLock = (phone) => {
  const rec = otpAttempts.get(phone);
  if (!rec) return null;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    const minsLeft = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    return `Too many failed attempts. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`;
  }
  return null;
};
const recordFail = (phone) => {
  const rec = otpAttempts.get(phone) || { attempts: 0, lockedUntil: null };
  rec.attempts += 1;
  if (rec.attempts >= MAX_ATTEMPTS) rec.lockedUntil = Date.now() + LOCKOUT_MS;
  otpAttempts.set(phone, rec);
};
const clearAttempts = (phone) => otpAttempts.delete(phone);

const sendSMS = async (phone, otp) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your MobilityGrid OTP is ${otp}. Valid 10 mins. Do not share.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   `+91${phone}`,
    });
    return true;
  } catch (err) {
    console.error('Twilio error:', err.message);
    return false;
  }
};

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Security: `role` param (DRIVER | OWNER | MANAGER) scopes the lookup.
// A driver's phone cannot trigger an OTP on the owner portal and vice versa.
router.post('/send-otp', async (req, res) => {
  const phone_number = (req.body.phone || req.body.phone_number || '').trim();
  const role = (req.body.role || '').toUpperCase(); // DRIVER | OWNER | MANAGER
  if (!phone_number) return res.status(400).json({ success: false, message: 'Phone required' });
  const lockMsg = checkLock(phone_number);
  if (lockMsg) return res.status(429).json({ success: false, message: lockMsg });
  try {
    let userRes;
    if (role === 'DRIVER') {
      userRes = await pool.query('SELECT id FROM public.drivers WHERE mobile_number = $1 LIMIT 1', [phone_number]);
    } else if (role === 'OWNER') {
      userRes = await pool.query('SELECT id FROM public.owners WHERE mobile_number = $1 LIMIT 1', [phone_number]);
    } else if (role === 'MANAGER') {
      userRes = await pool.query("SELECT id FROM public.managers WHERE mobile_number = $1 AND status='ACTIVE' LIMIT 1", [phone_number]);
    } else {
      // Fallback (no role sent) — search all, but never expose OTP in response
      userRes = await pool.query(
        `SELECT id FROM public.drivers WHERE mobile_number = $1
         UNION SELECT id FROM public.owners WHERE mobile_number = $1
         UNION SELECT id FROM public.managers WHERE mobile_number = $1 AND status='ACTIVE'
         LIMIT 1`,
        [phone_number]
      );
    }
    if (!userRes.rows[0])
      return res.status(404).json({ success: false, message: 'Phone number not found for this role' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
      [phone_number, otpHash]
    );
    if (process.env.NODE_ENV !== 'production') console.log('DEV OTP:', phone_number, otp);
    const resp = { success: true, message: 'OTP sent' };
    if (process.env.NODE_ENV !== 'production' || process.env.DEV_BYPASS_OTP === 'true') resp.otp = otp;
    res.json(resp);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Security: after OTP is verified, confirm the resolved user's role matches
// the `role` param sent by the frontend. Prevents cross-portal login.
router.post('/verify-otp', async (req, res) => {
  const phone_number = (req.body.phone || req.body.phone_number || '').trim();
  const otp = (req.body.otp || '').trim();
  const expectedRole = (req.body.role || '').toUpperCase(); // DRIVER | OWNER | MANAGER
  if (!phone_number || !otp)
    return res.status(400).json({ success: false, message: 'Phone and OTP required' });
  const lockMsg = checkLock(phone_number);
  if (lockMsg) return res.status(429).json({ success: false, message: lockMsg });
  try {
    // Fetch by phone + expiry only (not by value — bcrypt comparison needed)
    const otpRes = await pool.query(
      'SELECT * FROM otps WHERE phone_number = $1 AND expires_at > NOW() LIMIT 1',
      [phone_number]
    );
    const validHash = otpRes.rows[0] && await bcrypt.compare(otp, otpRes.rows[0].otp);
    if (!otpRes.rows[0] || !validHash) {
      recordFail(phone_number);
      const rec = otpAttempts.get(phone_number);
      const remaining = MAX_ATTEMPTS - (rec?.attempts || 0);
      const msg = rec?.lockedUntil
        ? `Account locked for 15 minutes.`
        : `OTP invalid. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`;
      return res.status(400).json({ success: false, message: msg });
    }
    clearAttempts(phone_number);
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    const driverRes = await pool.query(
      "SELECT *, 'DRIVER' as role FROM public.drivers WHERE mobile_number = $1 LIMIT 1",
      [phone_number]
    );
    if (driverRes.rows[0] && driverRes.rows[0].status === 'INACTIVE') {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact your fleet owner.' });
    }
    const ownerRes = await pool.query(
      "SELECT *, 'OWNER' as role FROM public.owners WHERE mobile_number = $1 LIMIT 1",
      [phone_number]
    );
    // Check manager table if not driver or owner
    if (!driverRes.rows[0] && !ownerRes.rows[0]) {
      const mgrRes = await pool.query(
        `SELECT m.*, o.owner_code, o.subscription_end_date
         FROM public.managers m
         LEFT JOIN public.owners o ON o.id = m.owner_id
         WHERE m.mobile_number = $1 AND m.status = 'ACTIVE' LIMIT 1`,
        [phone_number]
      );
      if (mgrRes.rows[0]) {
        const mgr = mgrRes.rows[0];
        // MGR-05: Block login if owner subscription has expired
        if (mgr.subscription_end_date && new Date(mgr.subscription_end_date) < new Date()) {
          return res.status(403).json({
            success: false,
            message: 'Manager access suspended — fleet owner subscription has expired.'
          });
        }
        const perms = typeof mgr.permissions === 'string' ? JSON.parse(mgr.permissions) : (mgr.permissions || {});
        const token = generateToken({ id: mgr.id, phone_number: mgr.mobile_number, role: 'MANAGER', owner_id: mgr.owner_id, permissions: perms });
        return res.json({
          success: true, token,
          user: { id: mgr.id, full_name: mgr.full_name, mobile_number: mgr.mobile_number, role: 'MANAGER', owner_id: mgr.owner_id, owner_code: mgr.owner_code || null, permissions: perms }
        });
      }
    }
    const user = driverRes.rows[0] || ownerRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // Role gate — if frontend sent a role, the resolved user must match it
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({ success: false, message: 'This phone number is not registered for this portal' });
    }
    // Single-device login: generate new session token, invalidate old sessions
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const table = user.role === 'DRIVER' ? 'drivers' : 'owners';
    await pool.query(`UPDATE public.${table} SET session_token=$1 WHERE id=$2`, [sessionToken, user.id]);
    const token = generateToken({ id: user.id, phone_number: user.mobile_number, role: user.role, owner_id: user.owner_id || null, session_token: sessionToken });
    res.json({
      success: true, token,
      user: {
        id: user.id, full_name: user.full_name, mobile_number: user.mobile_number,
        role: user.role, owner_id: user.owner_id || null,
        owner_code: user.owner_code || null,
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
  const expected = process.env.ADMIN_SECRET_KEY;
  const adminPhone = process.env.ADMIN_PHONE;
  if (!admin_secret || admin_secret !== expected)
    return res.status(403).json({ success: false, message: 'Invalid admin secret' });
  if (!phone_number || (adminPhone && phone_number !== adminPhone))
    return res.status(403).json({ success: false, message: 'Unauthorized phone number' });
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
      [phone_number, otpHash]
    );
    if (process.env.NODE_ENV !== 'production') console.log('[ADMIN OTP]', phone_number, otp);
    await sendSMS(phone_number, otp);
    const showOtp = process.env.NODE_ENV !== 'production' || process.env.DEV_BYPASS_OTP === 'true';
    res.json({ success: true, message: 'OTP sent to admin phone', ...(showOtp && { otp }) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-verify-otp  — Body: { phone_number, otp, admin_secret }
router.post('/admin-verify-otp', async (req, res) => {
  const { phone_number, otp, admin_secret } = req.body;
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!admin_secret || admin_secret !== expected)
    return res.status(403).json({ success: false, message: 'Invalid admin secret' });
  if (!phone_number || !otp)
    return res.status(400).json({ success: false, message: 'phone_number and otp required' });
  try {
    // Dev bypass — OTP 000000 works when DEV_BYPASS_OTP=true (set in Render for demo)
    const isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';
    if (!isDevBypass) {
      const otpRes = await pool.query(
        'SELECT * FROM otps WHERE phone_number = $1 AND expires_at > NOW() LIMIT 1',
        [phone_number]
      );
      const validHash = otpRes.rows[0] && await bcrypt.compare(otp, otpRes.rows[0].otp);
      if (!otpRes.rows[0] || !validHash)
        return res.status(400).json({ success: false, message: 'OTP invalid or expired' });
      await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    }
    const token = jwt.sign({ id: 'admin', role: 'admin', phone: phone_number }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { role: 'admin', phone: phone_number } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-login  — Body: { phone_number, password }
// Security: phone_number must match ADMIN_PHONE env var AND password must match ADMIN_PASSWORD.
// Both checks always run (no short-circuit) so attacker can't enumerate which field is wrong.
router.post('/admin-login', async (req, res) => {
  const { phone_number, password } = req.body;
  if (!phone_number || !password)
    return res.status(400).json({ success: false, message: 'phone_number and password required' });
  const expectedPw   = process.env.ADMIN_PASSWORD;
  const expectedPhone = process.env.ADMIN_PHONE;
  if (!expectedPw || !expectedPhone)
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  // Always compare both — same generic error either way (no enumeration)
  const phoneOk = phone_number === expectedPhone;
  const passOk  = password === expectedPw;
  if (!phoneOk || !passOk)
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const token = jwt.sign({ id: 'admin', role: 'admin', phone: phone_number }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, token, user: { role: 'admin', phone: phone_number } });
});

module.exports = router;
