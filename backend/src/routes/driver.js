require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth.middleware');

// ==================== EXISTING ROUTE ====================
router.post('/profile', verifyToken, async (req, res) => {
  const user_id = req.user.id;
  const { name, phone, companyId } = req.body; // Frontend se ye fields aane chahiye

  try {
    const existing = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [user_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Driver profile already exists' });
    }

    // 1. UNIQUE DRIVER ID GENERATOR (Last 5 digits of phone + Name prefix)
    const userCode = `MG-${name.substring(0, 3).toUpperCase()}-${phone.slice(-5)}`;

    // 2. INSERT WITH ALL METADATA
    const result = await pool.query(
      `INSERT INTO drivers (user_id, driver_id, vehicle_owner_company_id, full_name) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, userCode, companyId, name]
    );

    res.status(201).json({ 
      message: 'Driver profile created', 
      driver: result.rows[0],
      userCode: userCode // Frontend ko bhej rahe hain taaki localStorage mein save ho
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// ==================== GET DRIVER WALLET (spec-compliant, JWT-auth) ====================
router.get('/wallet', verifyToken, async (req, res) => {
  try {
    const driverId = req.user.id;

    const [driverRes, assignRes, todayRes, ledgerRes] = await Promise.all([
      // Driver base info
      pool.query(
        'SELECT id, name, wallet_balance, kyc_status, owner_id FROM drivers WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
        [driverId]
      ),
      // Open vehicle assignment
      pool.query(
        `SELECT dvh.rent_amount, dvh.rent_type, dvh.assigned_at,
                v.id AS vehicle_id, v.reg_number, v.type, v.model
         FROM driver_vehicle_history dvh
         JOIN vehicles v ON v.id = dvh.vehicle_id
         WHERE dvh.driver_id = $1 AND dvh.unassigned_at IS NULL LIMIT 1`,
        [driverId]
      ),
      // Today's successful payments
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid_today
         FROM ms_orders
         WHERE driver_id = $1 AND transaction_status = 'SUCCESS'
           AND DATE(COALESCE(payment_date, created_at)) = CURRENT_DATE`,
        [driverId]
      ),
      // Last 10 ledger entries (APPEND-ONLY — never modified)
      pool.query(
        `SELECT id, entry_type, amount, description, balance_after, created_at
         FROM driver_ledger WHERE driver_id = $1
         ORDER BY created_at DESC LIMIT 10`,
        [driverId]
      ),
    ]);

    const driver    = driverRes.rows[0];
    const assign    = assignRes.rows[0];

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({
      success: true,
      data: {
        wallet_balance: parseFloat(driver.wallet_balance || 0),
        kyc_status:     driver.kyc_status || 'PENDING',
        vehicle: assign ? {
          vehicle_id:  assign.vehicle_id,
          reg_number:  assign.reg_number,
          type:        assign.type,
          model:       assign.model || null,
          rent_amount: parseFloat(assign.rent_amount || 0),
          rent_type:   assign.rent_type,
          assigned_at: assign.assigned_at,
        } : null,
        paid_today: parseFloat(todayRes.rows[0]?.paid_today || 0),
        ledger:     ledgerRes.rows,
      },
    });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
});

// ==================== GET DRIVER TELEMETRY ====================
router.get('/telemetry', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const result = await pool.query(
      `SELECT 
        COALESCE(battery_level, 92) as battery,
        COALESCE(kms_driven, 45) as driven,
        COALESCE(vehicle_number, 'MH-12-QX-4019') as vehicleNumber
       FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,
      [phone]
    );

    const telemetry = result.rows[0] || {
      battery: 92,
      driven: 45,
      vehicleNumber: 'MH-12-QX-4019'
    };

    res.json(telemetry);
  } catch (err) {
    console.error('Telemetry fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch telemetry' });
  }
});

// ==================== GET DRIVER DASHBOARD DATA ====================
router.get('/dashboard', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Get wallet balance
    const walletResult = await pool.query(
      `SELECT COALESCE(wallet_balance, 0) as balance 
       FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,
      [phone]
    );

    // Get telemetry
    const telemetryResult = await pool.query(
      `SELECT 
        COALESCE(battery_level, 92) as battery,
        COALESCE(kms_driven, 45) as driven,
        COALESCE(vehicle_number, 'MH-12-QX-4019') as vehicleNumber
       FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,
      [phone]
    );

    // Get pending dues
    const duesResult = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) as dues
       FROM ms_orders 
       WHERE payer_mobile = $1 AND transaction_status = 'PENDING'`,
      [phone]
    );

    res.json({
      wallet: walletResult.rows[0]?.balance || 0,
      telemetry: telemetryResult.rows[0] || { battery: 92, driven: 45, vehicleNumber: 'MH-12-QX-4019' },
      dues: duesResult.rows[0]?.dues || 1450
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// ==================== UPDATE TELEMETRY ====================
router.post('/telemetry/update', verifyToken, async (req, res) => {
  const { battery, kmsDriven, vehicleNumber } = req.body;
  const user_id = req.user.id;

  try {
    await pool.query(
      `UPDATE driver_details 
       SET battery_level = COALESCE($1, battery_level),
           kms_driven = COALESCE($2, kms_driven),
           vehicle_number = COALESCE($3, vehicle_number),
           updated_at = NOW()
       WHERE user_id = $4`,
      [battery, kmsDriven, vehicleNumber, user_id]
    );

    res.json({ message: 'Telemetry updated successfully' });
  } catch (err) {
    console.error('Telemetry update error:', err);
    res.status(500).json({ message: 'Failed to update telemetry' });
  }
});

// ==================== DRIVER PRIVATE EARNINGS ====================
// PRIVATE: only the driver themselves can see this — owner has no access
router.get('/earnings', verifyToken, async (req, res) => {
  try {
    const driverId = req.user.id;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.driver_earnings (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER NOT NULL,
        earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const result = await pool.query(
      `SELECT * FROM public.driver_earnings
       WHERE driver_id = $1
       ORDER BY earning_date DESC, created_at DESC
       LIMIT 60`,
      [driverId]
    );
    const todayRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as today_total
       FROM public.driver_earnings
       WHERE driver_id = $1 AND earning_date = CURRENT_DATE`,
      [driverId]
    );
    const monthRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) as month_total
       FROM public.driver_earnings
       WHERE driver_id = $1 AND earning_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [driverId]
    );
    res.json({
      earnings: result.rows,
      today_total: parseFloat(todayRes.rows[0]?.today_total || 0),
      month_total: parseFloat(monthRes.rows[0]?.month_total || 0),
    });
  } catch (err) {
    console.error('Earnings fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/earnings', verifyToken, async (req, res) => {
  try {
    const driverId = req.user.id;
    const { amount, note, earning_date } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ error: 'Valid amount required' });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.driver_earnings (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER NOT NULL,
        earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const result = await pool.query(
      `INSERT INTO public.driver_earnings (driver_id, amount, note, earning_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [driverId, Number(amount), note || null, earning_date || new Date().toISOString().slice(0, 10)]
    );
    res.json({ success: true, entry: result.rows[0] });
  } catch (err) {
    console.error('Earnings save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── SOS ALERT ────────────────────────────────────────────────────────────────
// POST /api/driver/sos
// Body: { lat?, lng?, message? }
// Requires driver JWT. Inserts sos_alerts row + notifies owner.
router.post('/sos', verifyToken, async (req, res) => {
  const { lat, lng, message } = req.body;

  try {
    // Resolve driver row using phone_number (JWT may carry phone or id)
    let driverRow = null;
    if (req.user.phone) {
      const r = await pool.query(
        'SELECT id, owner_id, name FROM drivers WHERE phone_number = $1 AND deleted_at IS NULL LIMIT 1',
        [req.user.phone]
      );
      driverRow = r.rows[0];
    }
    if (!driverRow && req.user.id) {
      const r = await pool.query(
        'SELECT id, owner_id, name FROM drivers WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
        [req.user.id]
      );
      driverRow = r.rows[0];
    }
    if (!driverRow) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const { id: driverId, owner_id: ownerId, name: driverName } = driverRow;

    // Insert SOS alert
    const alert = await pool.query(
      `INSERT INTO sos_alerts (driver_id, owner_id, lat, lng, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id, created_at`,
      [driverId, ownerId, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null]
    );

    // Notify owner (best-effort — don't fail the SOS if this errors)
    const locStr = (lat && lng)
      ? `Location: https://maps.google.com/?q=${lat},${lng}`
      : 'Location: not available';
    const body = message
      ? `${message} | ${locStr}`
      : `Driver pressed SOS. ${locStr}`;

    // In-app notification row
    pool.query(
      `INSERT INTO notifications (recipient_id, recipient_role, type, title, body, created_at)
       VALUES ($1, 'owner', 'SOS', $2, $3, NOW())`,
      [ownerId, `🚨 SOS from ${driverName}`, body]
    ).catch(err => console.error('SOS db notification failed:', err.message));

    res.json({
      success: true,
      alert_id: alert.rows[0].id,
      timestamp: alert.rows[0].created_at,
      location_captured: !!(lat && lng),
    });
  } catch (err) {
    console.error('SOS error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/driver/sos/my — last 10 SOS alerts for this driver
router.get('/sos/my', verifyToken, async (req, res) => {
  try {
    let driverId = null;
    if (req.user.phone) {
      const r = await pool.query('SELECT id FROM drivers WHERE phone_number = $1 LIMIT 1', [req.user.phone]);
      driverId = r.rows[0]?.id;
    }
    if (!driverId && req.user.id) driverId = req.user.id;
    if (!driverId) return res.status(404).json({ success: false, message: 'Driver not found' });

    const result = await pool.query(
      'SELECT id, lat, lng, resolved_at, created_at FROM sos_alerts WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 10',
      [driverId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── KYC DOCUMENTS ─────────────────────────────────────────────────────────────
// GET /api/driver/kyc — list this driver's KYC docs
router.get('/kyc', verifyToken, async (req, res) => {
  try {
    const driverId = req.user.id;
    const result = await pool.query(
      `SELECT id, doc_type, status, rejection_reason, uploaded_at, reviewed_at
       FROM documents WHERE entity_type = 'driver' AND entity_id = $1
       ORDER BY uploaded_at DESC`,
      [driverId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('KYC fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/driver/kyc/upload — upload a KYC document
// Uses multer memory storage (S3 integration pending)
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, WebP, PDF allowed'), ok);
  },
});

const VALID_DOC_TYPES = ['aadhaar_front','aadhaar_back','pan','driving_licence','bank_account'];

router.post('/kyc/upload', verifyToken, kycUpload.single('file'), async (req, res) => {
  try {
    const driverId = req.user.id;
    const { doc_type } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: 'File required' });
    if (!VALID_DOC_TYPES.includes(doc_type)) {
      return res.status(400).json({ success: false, message: `doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}` });
    }

    const ext    = file.originalname.split('.').pop().toLowerCase();
    const s3Key  = `drivers/${driverId}/${doc_type}/${uuidv4()}.${ext}`;

    // Upsert into spec documents table (one doc per type per driver)
    await pool.query(
      `INSERT INTO documents (entity_type, entity_id, doc_type, s3_key, status, uploaded_at)
       VALUES ('driver', $1, $2, $3, 'pending', NOW())
       ON CONFLICT (entity_type, entity_id, doc_type)
       DO UPDATE SET s3_key = EXCLUDED.s3_key, status = 'pending',
                     rejection_reason = NULL, reviewed_at = NULL,
                     uploaded_at = NOW()`,
      [driverId, doc_type, s3Key]
    );

    // Update driver kyc_status to PARTIAL if it was PENDING
    await pool.query(
      `UPDATE drivers SET kyc_status = 'PARTIAL', updated_at = NOW()
       WHERE id = $1 AND kyc_status = 'PENDING'`,
      [driverId]
    );

    res.json({ success: true, s3_key: s3Key, doc_type, status: 'pending' });
  } catch (err) {
    console.error('KYC upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PAY INITIATE ──────────────────────────────────────────────────────────────
// POST /api/driver/pay/initiate
// Body: { amount }
// Creates ms_orders row (PENDING), calls PayYantra, returns { payment_url, order_id }
router.post('/pay/initiate', verifyToken, async (req, res) => {
  try {
    const driverId = req.user.id;
    const ownerId  = req.user.owner_id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Valid amount required' });

    const amountNum = parseFloat(amount);

    // Get driver info for PayYantra customer fields
    const driverRes = await pool.query(
      'SELECT name, phone_number FROM drivers WHERE id = $1 LIMIT 1',
      [driverId]
    );
    const driver = driverRes.rows[0];
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const mgOrderId = `MG${Date.now()}`;

    // Insert ms_orders row (IMMUTABLE after insert)
    const orderRes = await pool.query(
      `INSERT INTO ms_orders (driver_id, owner_id, amount, payment_mode, transaction_status, order_id, created_at)
       VALUES ($1, $2, $3, 'ONLINE', 'PENDING', $4, NOW())
       RETURNING id`,
      [driverId, ownerId, amountNum, mgOrderId]
    );
    const internalOrderId = orderRes.rows[0].id;

    // PayYantra — get token then create order
    const BASE = process.env.PAYYANTRA_BASE_URL || 'https://payin-api-uat.payyantra.com';

    const tokenRes = await fetch(`${BASE}/api/auth/token`, {
      method: 'POST',
      headers: {
        'x-client-id':     process.env.PAYYANTRA_CLIENT_ID,
        'x-client-secret': process.env.PAYYANTRA_CLIENT_SECRET,
        'Content-Type':    'application/json',
      },
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.token || tokenData.data?.token || tokenData.access_token || tokenData.data?.access_token;

    if (!token) {
      return res.status(502).json({ success: false, message: 'PayYantra token failed', raw: tokenData });
    }

    const APP_URL = process.env.PWA_URL || 'https://mg-sandy.vercel.app';
    const pyRes = await fetch(`${BASE}/api/merchant/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:        amountNum,
        customerName:  driver.name,
        customerPhone: driver.phone_number,
        customerEmail: `driver${driverId}@mobilitygrid.com`,
        orderId:       mgOrderId,
        returnUrl:     `${APP_URL}/driver/wallet?status=success&orderId=${mgOrderId}&internal=${internalOrderId}`,
        notifyUrl:     `${process.env.BACKEND_URL || 'https://mg-qw5s.onrender.com'}/api/payment/webhook`,
      }),
    });
    const pyData = await pyRes.json();
    const paymentUrl = pyData.data?.payment_url || pyData.payment_url || pyData.data?.paymentUrl;

    if (!paymentUrl) {
      return res.status(502).json({ success: false, message: 'PayYantra did not return payment_url', raw: pyData });
    }

    res.json({ success: true, payment_url: paymentUrl, order_id: mgOrderId, internal_id: internalOrderId });
  } catch (err) {
    console.error('Pay initiate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
