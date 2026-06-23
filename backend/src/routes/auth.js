const express  = require('express');
const router   = express.Router();
const pool     = require('../config/db');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const { generateToken, verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate');
const {
  SendOtpSchema, VerifyOtpSchema, LoginPinSchema, SetPinSchema,
  ResetPinSchema, ForgotPinSchema, OwnerSignupSchema, OwnerSignupVerifySchema,
  AdminSendOtpSchema, AdminVerifyOtpSchema, AdminLoginSchema,
} = require('../schemas/auth.schemas');
const { sendMail } = require('../services/mailer');

// C-2: safe table lookup — NEVER interpolate user-supplied role directly into SQL
const ROLE_TABLE = { DRIVER: 'drivers', OWNER: 'owners' };
const safeTable = (role) => {
  const t = ROLE_TABLE[role?.toUpperCase?.()];
  if (!t) throw new Error(`Invalid role: ${role}`);
  return t;
};

// ── OTP rate limiting — DB-backed (survives restarts, works multi-instance) ───
// Table: public.otp_rate_limits (created in migrations/023_startup_schema.sql)
const MAX_ATTEMPTS = 3;
const LOCKOUT_MIN  = 15;

const checkLock = async (phone) => {
  const r = await pool.query(
    'SELECT attempts, locked_until FROM public.otp_rate_limits WHERE phone_number=$1',
    [phone]
  );
  const rec = r.rows[0];
  if (!rec) return null;
  if (rec.locked_until && new Date(rec.locked_until) > new Date()) {
    const minsLeft = Math.ceil((new Date(rec.locked_until) - Date.now()) / 60000);
    return `Too many failed attempts. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`;
  }
  return null;
};

const recordFail = async (phone) => {
  await pool.query(`
    INSERT INTO public.otp_rate_limits (phone_number, attempts, locked_until, updated_at)
    VALUES ($1, 1, NULL, NOW())
    ON CONFLICT (phone_number) DO UPDATE
      SET attempts   = CASE
                         WHEN otp_rate_limits.locked_until IS NOT NULL AND otp_rate_limits.locked_until < NOW()
                         THEN 1
                         ELSE otp_rate_limits.attempts + 1
                       END,
          locked_until = CASE
                           WHEN (CASE
                                   WHEN otp_rate_limits.locked_until IS NOT NULL AND otp_rate_limits.locked_until < NOW()
                                   THEN 1
                                   ELSE otp_rate_limits.attempts + 1
                                 END) >= $2
                           THEN NOW() + ($3 || ' minutes')::INTERVAL
                           ELSE NULL
                         END,
          updated_at = NOW()
  `, [phone, MAX_ATTEMPTS, LOCKOUT_MIN]);
};

const clearAttempts = async (phone) => {
  await pool.query(
    'DELETE FROM public.otp_rate_limits WHERE phone_number=$1',
    [phone]
  ).catch(() => {}); // non-critical
};

// Send admin OTP via email (Brevo REST API — works on Render free tier)
const sendAdminOtpEmail = async (otp) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) { console.warn('[OTP] ADMIN_EMAIL not set — OTP not sent via email'); return false; }
  try {
    const result = await sendMail({
      to:      adminEmail,
      subject: 'MobilityGrid Admin Login OTP',
      html:    `<div style="font-family:sans-serif;max-width:400px"><h2 style="color:#4f46e5">MobilityGrid Admin</h2><p>Your login OTP is:</p><h1 style="letter-spacing:0.3em;color:#0f172a">${otp}</h1><p style="color:#64748b;font-size:13px">Valid for 10 minutes. Do not share this OTP.</p></div>`,
    });
    if (!result.ok) console.error('[OTP] Email send failed:', result.reason);
    return result.ok;
  } catch (err) {
    console.error('[OTP] Email send error:', err.message);
    return false;
  }
};

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// validate(SendOtpSchema) placed inline below
// Security: `role` param (DRIVER | OWNER | MANAGER) scopes the lookup.
// A driver's phone cannot trigger an OTP on the owner portal and vice versa.
router.post('/send-otp', validate(SendOtpSchema), async (req, res) => {
  const phone_number = (req.body.phone || req.body.phone_number || '').trim();
  const role = (req.body.role || '').toUpperCase(); // DRIVER | OWNER | MANAGER
  if (!phone_number) return res.status(400).json({ success: false, message: 'Phone required' });
  const lockMsg = await checkLock(phone_number);
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
router.post('/verify-otp', validate(VerifyOtpSchema), async (req, res) => {
  const phone_number = (req.body.phone || req.body.phone_number || '').trim();
  const otp = (req.body.otp || '').trim();
  const expectedRole = (req.body.role || '').toUpperCase(); // DRIVER | OWNER | MANAGER
  if (!phone_number || !otp)
    return res.status(400).json({ success: false, message: 'Phone and OTP required' });
  const lockMsg = await checkLock(phone_number);
  if (lockMsg) return res.status(429).json({ success: false, message: lockMsg });
  try {
    // Fetch by phone + expiry only (not by value — bcrypt comparison needed)
    const otpRes = await pool.query(
      'SELECT * FROM otps WHERE phone_number = $1 AND expires_at > NOW() LIMIT 1',
      [phone_number]
    );
    const validHash = otpRes.rows[0] && await bcrypt.compare(otp, otpRes.rows[0].otp);
    if (!otpRes.rows[0] || !validHash) {
      await recordFail(phone_number);
      const recRow = await pool.query(
        'SELECT attempts, locked_until FROM public.otp_rate_limits WHERE phone_number=$1',
        [phone_number]
      );
      const rec = recRow.rows[0];
      const isLocked = rec?.locked_until && new Date(rec.locked_until) > new Date();
      const remaining = Math.max(0, MAX_ATTEMPTS - (rec?.attempts || 0));
      const msg = isLocked
        ? `Account locked for ${LOCKOUT_MIN} minutes.`
        : `OTP invalid. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`;
      return res.status(400).json({ success: false, message: msg });
    }
    await clearAttempts(phone_number);
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
    const table = safeTable(user.role);

    // If user already had an active session → notify them that a new device logged in
    if (user.session_token) {
      const alertTitle = '⚠️ New Login Detected';
      const alertMsg = `Someone just logged into your account (${user.mobile_number}) from a new device. If this wasn't you, contact support immediately.`;
      if (user.role === 'DRIVER') {
        pool.query(
          `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
           VALUES ($1, 'DRIVER', $2, $3, NOW())`,
          [user.id, alertTitle, alertMsg]
        ).catch(() => {});
      } else if (user.role === 'OWNER') {
        pool.query(
          `INSERT INTO public.notifications (user_id, user_type, title, message, created_at)
           VALUES ($1, 'OWNER', $2, $3, NOW())`,
          [user.id, alertTitle, alertMsg]
        ).catch(() => {});
      }
      // Also alert admin
      pool.query(
        `INSERT INTO public.notifications (user_type, title, message, created_at)
         VALUES ('ADMIN', $1, $2, NOW())`,
        [
          `🔐 Concurrent Login — ${user.role === 'OWNER' ? 'Owner' : 'Driver'}`,
          `${user.full_name || 'Unknown'} (${user.mobile_number}) logged in on a new device while another session was active`
        ]
      ).catch(() => {});
    }

    await pool.query(`UPDATE public.${table} SET session_token=$1 WHERE id=$2`, [sessionToken, user.id]);
    const token = generateToken({ id: user.id, phone_number: user.mobile_number, role: user.role, owner_id: user.owner_id || null, owner_code: user.owner_code || null, driver_code: user.driver_code || null, session_token: sessionToken });

    // Notify admin on every owner/driver login
    pool.query(
      `INSERT INTO public.notifications (user_type, title, message, created_at)
       VALUES ('ADMIN', $1, $2, NOW())`,
      [
        `${user.role === 'OWNER' ? '🏢 Owner' : '🚗 Driver'} Login`,
        `${user.full_name || 'Unknown'} (${user.mobile_number}) logged in`
      ]
    ).catch(() => {});

    res.json({
      success: true, token,
      user: {
        id: user.id, full_name: user.full_name, mobile_number: user.mobile_number,
        role: user.role, owner_id: user.owner_id || null,
        owner_code: user.owner_code || null,
        driver_code: user.driver_code || null, status: user.status,
        created_at: user.created_at || null
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
router.post('/admin-send-otp', validate(AdminSendOtpSchema), async (req, res) => {
  const { phone_number, admin_secret } = req.body;
  const expected = process.env.ADMIN_SECRET_KEY;
  const adminPhone = process.env.ADMIN_PHONE;
  if (!admin_secret || admin_secret !== expected)
    return res.status(403).json({ success: false, message: 'Invalid admin secret' });
  // Check: phone must match ADMIN_PHONE env var OR be an active row in the admins table
  const isEnvAdmin = adminPhone && phone_number === adminPhone;
  if (!isEnvAdmin) {
    const { rows } = await pool.query(
      'SELECT 1 FROM public.admins WHERE phone_number=$1 AND is_active=true LIMIT 1',
      [phone_number]
    );
    if (!rows.length)
      return res.status(403).json({ success: false, message: 'Unauthorized phone number' });
  }
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await pool.query('DELETE FROM otps WHERE phone_number = $1', [phone_number]);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')",
      [phone_number, otpHash]
    );
    if (process.env.NODE_ENV !== 'production') console.log('[ADMIN OTP]', phone_number, otp);
    await sendAdminOtpEmail(otp);
    const showOtp = process.env.NODE_ENV !== 'production' || process.env.DEV_BYPASS_OTP === 'true';
    res.json({ success: true, message: 'OTP sent to admin phone', ...(showOtp && { otp }) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-verify-otp  — Body: { phone_number, otp, admin_secret }
router.post('/admin-verify-otp', validate(AdminVerifyOtpSchema), async (req, res) => {
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
    // Look up name from admins table (falls back gracefully if not found)
    const adminRow = await pool.query(
      'SELECT name FROM public.admins WHERE phone_number=$1 AND is_active=true LIMIT 1',
      [phone_number]
    );
    const adminName = adminRow.rows[0]?.name || 'Admin';
    const token = jwt.sign({ id: 'admin', role: 'admin', phone: phone_number, name: adminName }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { role: 'admin', phone: phone_number, name: adminName } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-login  — Body: { phone_number, password }
// Security: phone_number must match ADMIN_PHONE env var AND password must match ADMIN_PASSWORD.
// Both checks always run (no short-circuit) so attacker can't enumerate which field is wrong.
router.post('/admin-login', validate(AdminLoginSchema), async (req, res) => {
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

// ═══════════════════════════════════════════════════════════════════════════════
// PASSKEY / BIOMETRIC AUTH (WebAuthn)
// ═══════════════════════════════════════════════════════════════════════════════
// Lazy-require so startup never crashes if package has an issue
function swa() { return require('@simplewebauthn/server'); }

const IS_PROD   = process.env.NODE_ENV === 'production';
const RP_ID     = IS_PROD ? 'mobilitygrid.in' : 'localhost';
const RP_NAME   = 'MobilityGrid';
const ORIGIN    = IS_PROD ? 'https://www.mobilitygrid.in' : 'http://localhost:3000';

// POST /api/auth/passkey/register-options
// Called after OTP login. Returns WebAuthn registration options. Requires valid JWT.
router.post('/passkey/register-options', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const table = safeTable(role);
    const userRes = await pool.query(
      'SELECT id, full_name, mobile_number FROM public.' + table + ' WHERE id=$1', [userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Exclude already-registered credentials
    const existing = await pool.query(
      'SELECT credential_id FROM public.passkeys WHERE user_id=$1 AND user_type=$2',
      [userId, role]
    );
    const excludeCredentials = existing.rows.map(function(r) {
      return { id: Buffer.from(r.credential_id, 'base64url'), type: 'public-key' };
    });

    const options = await swa().generateRegistrationOptions({
      rpName:   RP_NAME,
      rpID:     RP_ID,
      userID:   Buffer.from(userId.toString()),
      userName: user.mobile_number,
      userDisplayName: user.full_name,
      excludeCredentials: excludeCredentials,
      authenticatorSelection: {
        residentKey:      'preferred',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store challenge temporarily
    await pool.query('DELETE FROM public.webauthn_challenges WHERE identifier=$1', [user.mobile_number]);
    await pool.query(
      'INSERT INTO public.webauthn_challenges (identifier, user_type, challenge) VALUES ($1,$2,$3)',
      [user.mobile_number, role, options.challenge]
    );

    res.json({ success: true, options: options });
  } catch (err) {
    console.error('passkey register-options error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/passkey/register-verify
// Verifies the credential from the device and stores it.
router.post('/passkey/register-verify', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const table = safeTable(role);
    const userRes = await pool.query(
      'SELECT mobile_number FROM public.' + table + ' WHERE id=$1', [userId]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const challengeRes = await pool.query(
      'SELECT challenge FROM public.webauthn_challenges WHERE identifier=$1 AND expires_at > NOW() LIMIT 1',
      [user.mobile_number]
    );
    if (!challengeRes.rows[0])
      return res.status(400).json({ success: false, message: 'Challenge expired. Try again.' });

    const expectedChallenge = challengeRes.rows[0].challenge;

    const verification = await swa().verifyRegistrationResponse({
      response:            req.body,
      expectedChallenge:   expectedChallenge,
      expectedOrigin:      ORIGIN,
      expectedRPID:        RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified)
      return res.status(400).json({ success: false, message: 'Verification failed' });

    const info = verification.registrationInfo;
    const credentialPublicKey = info.credentialPublicKey;
    const credentialID        = info.credentialID;
    const counter             = info.counter;
    const credentialDeviceType = info.credentialDeviceType;
    const credentialBackedUp   = info.credentialBackedUp;

    await pool.query(
      'INSERT INTO public.passkeys (user_id, user_type, credential_id, public_key, counter, device_type, backed_up)' +
      ' VALUES ($1,$2,$3,$4,$5,$6,$7)' +
      ' ON CONFLICT (credential_id) DO UPDATE SET counter=$5, last_used_at=NOW()',
      [
        userId, role,
        Buffer.from(credentialID).toString('base64url'),
        Buffer.from(credentialPublicKey),
        counter,
        credentialDeviceType,
        credentialBackedUp,
      ]
    );

    await pool.query('DELETE FROM public.webauthn_challenges WHERE identifier=$1', [user.mobile_number]);

    res.json({ success: true, message: 'Passkey registered' });
  } catch (err) {
    console.error('passkey register-verify error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/passkey/auth-options
// Takes phone + role, returns WebAuthn auth challenge if passkey exists.
router.post('/passkey/auth-options', async (req, res) => {
  try {
    var phone = (req.body.phone_number || '').trim();
    var role  = (req.body.role || '').toUpperCase();
    if (!phone) return res.status(400).json({ success: false, message: 'phone_number required' });

    var userRes;
    if (role === 'DRIVER')
      userRes = await pool.query('SELECT id FROM public.drivers WHERE mobile_number=$1 LIMIT 1', [phone]);
    else
      userRes = await pool.query('SELECT id FROM public.owners WHERE mobile_number=$1 LIMIT 1', [phone]);

    if (!userRes || !userRes.rows[0])
      return res.status(404).json({ success: false, message: 'No account found' });

    var userId = userRes.rows[0].id;
    var credsRes = await pool.query(
      'SELECT credential_id FROM public.passkeys WHERE user_id=$1 AND user_type=$2',
      [userId, role]
    );

    if (!credsRes.rows.length)
      return res.status(404).json({ success: false, hasPasskey: false, message: 'No passkey registered' });

    var allowCredentials = credsRes.rows.map(function(r) {
      return { id: Buffer.from(r.credential_id, 'base64url'), type: 'public-key' };
    });

    var options = await swa().generateAuthenticationOptions({
      rpID:               RP_ID,
      allowCredentials:   allowCredentials,
      userVerification:   'preferred',
    });

    await pool.query('DELETE FROM public.webauthn_challenges WHERE identifier=$1', [phone]);
    await pool.query(
      'INSERT INTO public.webauthn_challenges (identifier, user_type, challenge) VALUES ($1,$2,$3)',
      [phone, role, options.challenge]
    );

    res.json({ success: true, hasPasskey: true, options: options });
  } catch (err) {
    console.error('passkey auth-options error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/passkey/auth-verify
// Verifies biometric assertion, returns JWT same as OTP verify.
router.post('/passkey/auth-verify', async (req, res) => {
  try {
    var phone     = (req.body.phone_number || '').trim();
    var role      = (req.body.role || '').toUpperCase();
    var assertion = req.body.assertion;
    if (!phone || !assertion)
      return res.status(400).json({ success: false, message: 'phone_number and assertion required' });

    var challengeRes = await pool.query(
      'SELECT challenge FROM public.webauthn_challenges WHERE identifier=$1 AND expires_at > NOW() LIMIT 1',
      [phone]
    );
    if (!challengeRes.rows[0])
      return res.status(400).json({ success: false, message: 'Challenge expired. Try again.' });
    var expectedChallenge = challengeRes.rows[0].challenge;

    var rawId  = assertion.rawId || assertion.id;
    var credId = Buffer.from(rawId, 'base64url').toString('base64url');
    var credRes = await pool.query(
      'SELECT * FROM public.passkeys WHERE credential_id=$1 LIMIT 1', [credId]
    );
    if (!credRes.rows[0])
      return res.status(404).json({ success: false, message: 'Passkey not found' });

    var storedCred = credRes.rows[0];

    var verification = await swa().verifyAuthenticationResponse({
      response:          assertion,
      expectedChallenge: expectedChallenge,
      expectedOrigin:    ORIGIN,
      expectedRPID:      RP_ID,
      authenticator: {
        credentialPublicKey: storedCred.public_key,
        credentialID:        Buffer.from(storedCred.credential_id, 'base64url'),
        counter:             parseInt(storedCred.counter),
      },
      requireUserVerification: false,
    });

    if (!verification.verified)
      return res.status(400).json({ success: false, message: 'Biometric verification failed' });

    await pool.query(
      'UPDATE public.passkeys SET counter=$1, last_used_at=NOW() WHERE id=$2',
      [verification.authenticationInfo.newCounter, storedCred.id]
    );
    await pool.query('DELETE FROM public.webauthn_challenges WHERE identifier=$1', [phone]);

    var userRes2, table2;
    if (role === 'DRIVER') {
      table2   = 'drivers';
      userRes2 = await pool.query(
        "SELECT *, 'DRIVER' as role FROM public.drivers WHERE id=$1 LIMIT 1", [storedCred.user_id]
      );
    } else {
      table2   = 'owners';
      userRes2 = await pool.query(
        "SELECT *, 'OWNER' as role FROM public.owners WHERE id=$1 LIMIT 1", [storedCred.user_id]
      );
    }
    var user = userRes2.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.status === 'INACTIVE')
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    var crypto       = require('crypto');
    var sessionToken = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE public.' + table2 + ' SET session_token=$1 WHERE id=$2', [sessionToken, user.id]);

    var token = generateToken({
      id: user.id, phone_number: user.mobile_number,
      role: user.role, owner_id: user.owner_id || null,
      owner_code: user.owner_code || null,
      driver_code: user.driver_code || null,
      session_token: sessionToken
    });

    res.json({
      success: true, token: token,
      user: {
        id: user.id, full_name: user.full_name,
        mobile_number: user.mobile_number, role: user.role,
        owner_id: user.owner_id || null,
        owner_code: user.owner_code || null,
        driver_code: user.driver_code || null,
      }
    });
  } catch (err) {
    console.error('passkey auth-verify error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PIN AUTH
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/login-pin  — Body: { phone_number, pin, role }
// Primary login flow. Returns JWT same shape as verify-otp.
router.post('/login-pin', validate(LoginPinSchema), async (req, res) => {
  var phone = (req.body.phone_number || '').trim();
  var pin   = (req.body.pin || '').trim();
  var role  = (req.body.role || '').toUpperCase();
  if (!phone || !pin || !role)
    return res.status(400).json({ success: false, message: 'phone_number, pin and role required' });

  try {
    var userRes;
    if (role === 'DRIVER')
      userRes = await pool.query("SELECT *, 'DRIVER' as role FROM public.drivers WHERE mobile_number=$1 LIMIT 1", [phone]);
    else
      userRes = await pool.query("SELECT *, 'OWNER' as role FROM public.owners WHERE mobile_number=$1 LIMIT 1", [phone]);

    var user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'No account found for this number' });
    if (user.status === 'INACTIVE') return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    if (!user.pin_hash) return res.status(400).json({ success: false, message: 'PIN not set yet. Contact admin.' });

    var valid = await bcrypt.compare(pin, user.pin_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Incorrect PIN' });

    const table = safeTable(role);

    // If user already had an active session → notify them
    if (user.session_token) {
      const alertTitle = '⚠️ New Login Detected';
      const alertMsg = `Someone just logged into your account (${user.mobile_number}) from a new device. If this wasn't you, contact support immediately.`;
      if (role === 'DRIVER') {
        pool.query(
          `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
           VALUES ($1, 'DRIVER', $2, $3, NOW())`,
          [user.id, alertTitle, alertMsg]
        ).catch(() => {});
      } else if (role === 'OWNER') {
        pool.query(
          `INSERT INTO public.notifications (user_id, user_type, title, message, created_at)
           VALUES ($1, 'OWNER', $2, $3, NOW())`,
          [user.id, alertTitle, alertMsg]
        ).catch(() => {});
      }
      pool.query(
        `INSERT INTO public.notifications (user_type, title, message, created_at)
         VALUES ('ADMIN', $1, $2, NOW())`,
        [
          `🔐 Concurrent Login — ${role === 'OWNER' ? 'Owner' : 'Driver'}`,
          `${user.full_name || 'Unknown'} (${user.mobile_number}) logged in on a new device while another session was active`
        ]
      ).catch(() => {});
    }

    var sessionToken = require('crypto').randomBytes(32).toString('hex');
    await pool.query('UPDATE public.' + table + ' SET session_token=$1 WHERE id=$2', [sessionToken, user.id]);

    var token = generateToken({
      id: user.id, phone_number: user.mobile_number,
      role: user.role, owner_id: user.owner_id || null,
      owner_code: user.owner_code || null,
      driver_code: user.driver_code || null,
      session_token: sessionToken
    });

    res.json({
      success: true, token: token,
      pin_must_change: !!user.pin_must_change,
      user: {
        id: user.id, full_name: user.full_name,
        mobile_number: user.mobile_number, role: user.role,
        owner_id: user.owner_id || null,
        owner_code: user.owner_code || null,
        driver_code: user.driver_code || null,
      }
    });
  } catch (err) {
    console.error('login-pin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/set-pin  — Requires JWT. Body: { current_pin (optional for first set), new_pin }
router.post('/set-pin', verifyToken, validate(SetPinSchema), async (req, res) => {
  var currentPin = (req.body.current_pin || '').trim();
  var newPin     = (req.body.new_pin || '').trim();
  if (!newPin || newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin))
    return res.status(400).json({ success: false, message: 'PIN must be 4-6 digits' });

  try {
    var userId = req.user.id;
    var role   = req.user.role;
    const table = safeTable(role);

    var userRes = await pool.query('SELECT pin_hash, pin_must_change FROM public.' + table + ' WHERE id=$1', [userId]);
    var user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If they already have a PIN, verify current before changing
    if (user.pin_hash && !user.pin_must_change) {
      if (!currentPin) return res.status(400).json({ success: false, message: 'current_pin required' });
      var valid = await bcrypt.compare(currentPin, user.pin_hash);
      if (!valid) return res.status(401).json({ success: false, message: 'Current PIN is incorrect' });
    }

    var hash = await bcrypt.hash(newPin, 10);
    await pool.query(
      'UPDATE public.' + table + ' SET pin_hash=$1, pin_set_at=NOW(), pin_must_change=false WHERE id=$2',
      [hash, userId]
    );
    res.json({ success: true, message: 'PIN updated' });
  } catch (err) {
    console.error('set-pin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/forgot-pin  — Body: { phone_number, role }
// Rules:
//   - Owners with email: send OTP to email (free). One-time only — after that contact admin.
//   - Drivers / Owners without email: contact admin (no OTP ever).
router.post('/forgot-pin', validate(ForgotPinSchema), async (req, res) => {
  var phone = (req.body.phone_number || '').trim();
  var role  = (req.body.role || '').toUpperCase();
  if (!phone || !role)
    return res.status(400).json({ success: false, message: 'phone_number and role required' });

  try {
    const table = safeTable(role);
    var userRes = await pool.query(
      'SELECT id, email, pin_otp_used FROM public.' + table + ' WHERE mobile_number=$1 LIMIT 1', [phone]
    );
    var user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, message: 'No account found' });

    // Drivers: no self-service OTP — contact admin
    if (role === 'DRIVER') {
      return res.json({ success: false, contact_admin: true,
        message: 'Drivers cannot reset PIN via OTP. Please contact your fleet owner or admin.' });
    }

    // Owner already used their one-time OTP
    if (user.pin_otp_used) {
      return res.json({ success: false, contact_admin: true,
        message: 'You have already used your one-time PIN reset. Please contact the MobilityGrid admin.' });
    }

    // Owner has no email on file
    if (!user.email) {
      return res.json({ success: false, contact_admin: true,
        message: 'No email on file. Please contact the MobilityGrid admin to reset your PIN.' });
    }

    // Generate & store OTP
    var otp = Math.floor(100000 + Math.random() * 900000).toString();
    var otpHash = await bcrypt.hash(otp, 10);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1,$2,NOW()+INTERVAL '10 minutes') ON CONFLICT (phone_number) DO UPDATE SET otp=$2, expires_at=NOW()+INTERVAL '10 minutes'",
      [phone, otpHash]
    );

    var devBypass = process.env.DEV_BYPASS_OTP === 'true';
    if (devBypass) {
      var parts0 = user.email.split('@');
      var masked0 = parts0[0].slice(0,2) + '***@' + parts0[1];
      return res.json({ success: true, via: 'dev', otp: otp, masked_email: masked0,
        message: 'DEV: OTP is ' + otp });
    }

    // Send via email — Brevo REST API (works on Render free tier)
    var mailResult = await sendMail({
      to:      user.email,
      subject: 'MobilityGrid — PIN Reset OTP',
      html:    '<div style="font-family:sans-serif;max-width:400px"><h2 style="color:#4f46e5">MobilityGrid</h2><p>Your PIN reset OTP is:</p><h1 style="letter-spacing:0.3em;color:#0f172a">' + otp + '</h1><p style="color:#64748b;font-size:13px">Valid for 10 minutes. If you did not request this, ignore this email.</p></div>',
    });
    if (!mailResult.ok) {
      console.error('[forgot-pin] Email failed:', mailResult.reason);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    var parts = user.email.split('@');
    var masked = parts[0].slice(0,2) + '***@' + parts[1];
    res.json({ success: true, via: 'email', masked_email: masked,
      message: 'OTP sent to your registered email: ' + masked });
  } catch (err) {
    console.error('forgot-pin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/reset-pin  — Body: { phone_number, role, otp, new_pin }
router.post('/reset-pin', validate(ResetPinSchema), async (req, res) => {
  var phone  = (req.body.phone_number || '').trim();
  var role   = (req.body.role || '').toUpperCase();
  var otp    = (req.body.otp || '').trim();
  var newPin = (req.body.new_pin || '').trim();
  if (!phone || !role || !otp || !newPin)
    return res.status(400).json({ success: false, message: 'phone_number, role, otp and new_pin required' });
  if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin))
    return res.status(400).json({ success: false, message: 'PIN must be 4-6 digits' });

  try {
    // Verify OTP
    var isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';
    if (!isDevBypass) {
      var otpRes = await pool.query(
        'SELECT * FROM otps WHERE phone_number=$1 AND expires_at > NOW() LIMIT 1', [phone]
      );
      var validHash = otpRes.rows[0] && await bcrypt.compare(otp, otpRes.rows[0].otp);
      if (!validHash) return res.status(400).json({ success: false, message: 'OTP invalid or expired' });
      await pool.query('DELETE FROM otps WHERE phone_number=$1', [phone]);
    }

    const table = safeTable(role);
    var pinHash = await bcrypt.hash(newPin, 10);
    var upd = await pool.query(
      'UPDATE public.' + table + ' SET pin_hash=$1, pin_set_at=NOW(), pin_must_change=false WHERE mobile_number=$2 RETURNING id',
      [pinHash, phone]
    );
    if (!upd.rows[0]) return res.status(404).json({ success: false, message: 'Account not found' });

    // Mark OTP as used — no more self-service resets
    await pool.query('UPDATE public.' + table + ' SET pin_otp_used=true WHERE mobile_number=$1', [phone]);

    res.json({ success: true, message: 'PIN reset successfully. You can now login.' });
  } catch (err) {
    console.error('reset-pin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/test-email?to=xyz@gmail.com — smoke test SMTP
router.get('/test-email', async (req, res) => {
  try {
    const { sendMail } = require('../services/mailer');
    const to = req.query.to || process.env.LEADS_EMAIL || process.env.ADMIN_EMAIL || 'mobilitygrid@gmail.com';
    const result = await sendMail({
      to,
      subject: '✅ MobilityGrid Email Test',
      html: '<p style="font-family:sans-serif">If you see this, email is working correctly! 🎉</p>',
    });
    res.json({ success: result.ok, to, reason: result.reason || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/waitlist — Landing page interest form
router.post('/waitlist', async (req, res) => {
  var { name, phone, company, role, fleet, city, type, email } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, message: 'name and phone required' });
  try {
    // Ensure columns exist (safe to run repeatedly)
    await pool.query(`
      ALTER TABLE public.waitlist_leads
        ADD COLUMN IF NOT EXISTS ip_address TEXT,
        ADD COLUMN IF NOT EXISTS user_agent TEXT,
        ADD COLUMN IF NOT EXISTS source_url TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT
    `).catch(() => {});

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    const ua = req.headers['user-agent'] || null;
    const src = req.headers['referer'] || req.headers['origin'] || null;

    await pool.query(
      `INSERT INTO public.waitlist_leads
         (name, phone, company, role, fleet, city, type, ip_address, user_agent, source_url, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [name, phone, company||null, role||null, fleet||null, city||null, type||null, ip||null, ua||null, src||null, email||null]
    );

    // Fire emails (non-blocking — don't fail the response if email fails)
    try {
      const { sendLeadEmails } = require('../services/mailer');
      sendLeadEmails({ name, phone, company, role, fleet, city, type, email }).catch(e => {
        console.error('sendLeadEmails failed:', e?.message || e);
      });
    } catch (e) {
      console.error('sendLeadEmails import/call failed:', e?.message || e);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('waitlist error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ── OWNER SELF-SIGNUP ─────────────────────────────────────────────────────
// Step 1: POST /api/auth/owner-signup — collect details, send OTP
router.post('/owner-signup', validate(OwnerSignupSchema), async (req, res) => {
  var { full_name, mobile_number, email, company_name } = req.body;
  full_name      = (full_name || '').trim();
  mobile_number  = (mobile_number || '').trim();
  email          = (email || '').trim().toLowerCase();
  company_name   = (company_name || '').trim();

  if (!full_name || !mobile_number || !email)
    return res.status(400).json({ success: false, message: 'Name, phone and email are required' });
  if (!/^\d{10}$/.test(mobile_number))
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });

  try {
    // Check if already registered
    var existing = await pool.query(
      'SELECT id FROM public.owners WHERE mobile_number=$1', [mobile_number]
    );
    if (existing.rows[0])
      return res.status(409).json({ success: false, message: 'An account with this number already exists. Please login.' });

    // Send OTP
    var otp = Math.floor(100000 + Math.random() * 900000).toString();
    var otpHash = await bcrypt.hash(otp, 10);
    await pool.query(
      "INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1,$2,NOW()+INTERVAL '10 minutes') ON CONFLICT (phone_number) DO UPDATE SET otp=$2, expires_at=NOW()+INTERVAL '10 minutes'",
      [mobile_number, otpHash]
    );

    var devBypass = process.env.DEV_BYPASS_OTP === 'true';
    if (!devBypass) {
      var signupMailResult = await sendMail({
        to:      email,
        subject: 'Verify your MobilityGrid account',
        html:    '<div style="font-family:sans-serif;max-width:400px"><h2 style="color:#4f46e5">MobilityGrid</h2><p>Your verification OTP is:</p><h1 style="letter-spacing:0.3em;color:#0f172a">' + otp + '</h1><p style="color:#64748b;font-size:13px">Valid for 10 minutes.</p></div>',
      });
      if (!signupMailResult.ok) {
        console.error('[owner-signup] Email failed:', signupMailResult.reason);
        return res.status(500).json({ success: false, message: 'Failed to send verification email. Please try again.' });
      }
      res.json({ success: true, message: 'OTP sent to ' + email });
    } else {
      res.json({ success: true, otp: otp, message: 'DEV: OTP is ' + otp });
    }
  } catch (err) {
    console.error('owner-signup error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Step 2: POST /api/auth/owner-signup/verify — verify OTP + create account
router.post('/owner-signup/verify', validate(OwnerSignupVerifySchema), async (req, res) => {
  var { full_name, mobile_number, email, company_name, otp } = req.body;
  full_name     = (full_name || '').trim();
  mobile_number = (mobile_number || '').trim();
  email         = (email || '').trim().toLowerCase();
  company_name  = (company_name || '').trim();
  otp           = (otp || '').trim();

  if (!full_name || !mobile_number || !email || !otp)
    return res.status(400).json({ success: false, message: 'All fields required' });

  try {
    // Verify OTP
    var isDevBypass = process.env.DEV_BYPASS_OTP === 'true' && otp === '000000';
    if (!isDevBypass) {
      var otpRes = await pool.query(
        'SELECT * FROM otps WHERE phone_number=$1 AND expires_at > NOW() LIMIT 1', [mobile_number]
      );
      var validHash = otpRes.rows[0] && await bcrypt.compare(otp, otpRes.rows[0].otp);
      if (!validHash) return res.status(400).json({ success: false, message: 'OTP invalid or expired' });
      await pool.query('DELETE FROM otps WHERE phone_number=$1', [mobile_number]);
    }

    // Double-check not already registered
    var existing = await pool.query('SELECT id FROM public.owners WHERE mobile_number=$1', [mobile_number]);
    if (existing.rows[0])
      return res.status(409).json({ success: false, message: 'Account already exists. Please login.' });

    // Generate owner_code — ensure uniqueness by appending suffix if collision
    var namePrefix = full_name.replace(/\s+/g,'').toUpperCase().slice(0,3);
    var phoneEnd   = mobile_number.slice(-4);
    var owner_code = 'MG-OWN-' + namePrefix + phoneEnd;
    var codeCheck  = await pool.query('SELECT id FROM public.owners WHERE owner_code=$1', [owner_code]);
    if (codeCheck.rows[0]) {
      // collision — append last 2 digits of timestamp to make unique
      owner_code = owner_code + Date.now().toString().slice(-2);
    }

    // Create company if provided
    var company_id = null;
    if (company_name) {
      var compRes = await pool.query(
        "INSERT INTO public.companies (name, status) VALUES ($1, 'ACTIVE') RETURNING id",
        [company_name]
      );
      company_id = compRes.rows[0].id;
    }

    // Create owner
    var ownerRes = await pool.query(
      `INSERT INTO public.owners (full_name, mobile_number, email, owner_code, status, pin_must_change, company_id)
       VALUES ($1,$2,$3,$4,'ACTIVE',true,$5) RETURNING id, full_name, mobile_number, email, owner_code, status`,
      [full_name, mobile_number, email, owner_code, company_id]
    );
    var owner = ownerRes.rows[0];

    // Issue JWT
    var token = require('jsonwebtoken').sign(
      { id: owner.id, role: 'OWNER', mobile_number: owner.mobile_number },
      process.env.JWT_SECRET, { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: { id: owner.id, name: owner.full_name, mobile_number: owner.mobile_number, email: owner.email, role: 'OWNER' },
      pin_must_change: true,
      redirect: '/owner/dashboard',
      message: 'Account created! Please set your PIN to continue.'
    });
  } catch (err) {
    console.error('owner-signup/verify error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
