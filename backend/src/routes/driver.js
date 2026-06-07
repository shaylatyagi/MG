require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'voltops_super_secret_key_2025');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

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

// ==================== GET DRIVER WALLET ====================
router.get('/wallet', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const result = await pool.query(
      `SELECT COALESCE(wallet_balance, 0) as balance 
       FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,
      [phone]
    );

    const balance = result.rows[0]?.balance || 0;
    res.json({ balance });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch wallet' });
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

module.exports = router;