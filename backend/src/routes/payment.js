require('dotenv').config();

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ── Webhook HMAC verifier ─────────────────────────────────────────────────────
// Set PAYANTRA_WEBHOOK_SECRET in Render env once PayYantra confirms the value.
// Until then, the check is skipped (logs a warning).
const verifyWebhookSignature = (req) => {
  const secret = process.env.PAYANTRA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️  PAYANTRA_WEBHOOK_SECRET not set — skipping signature check');
    return true;
  }
  const received = req.headers['x-payantra-signature'] ||
                   req.headers['x-webhook-signature']  ||
                   req.headers['x-signature'];
  if (!received) {
    console.warn('⚠️  Webhook received with no signature header');
    return false;
  }
  const payload  = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
};
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { verifyToken, requirePermission } = require('../middleware/auth.middleware');
const { logAudit } = require('../utils/audit');
// ─── ASSIGNMENT HISTORY HELPER ───────────────────────────────────────
const logAssignment = async (driverId, vehicleId, ownerId, dailyRent, rentType) => {
  try {
    await pool.query(
      `UPDATE public.driver_vehicle_history 
       SET unassigned_at = NOW()
       WHERE driver_id = $1 AND unassigned_at IS NULL`,
      [driverId]
    );
    await pool.query(
      `INSERT INTO public.driver_vehicle_history 
       (driver_id, vehicle_id, owner_id, daily_rent, rent_type, reason)
       VALUES ($1, $2, $3, $4, $5, 'ASSIGNED')`,
      [driverId, vehicleId, ownerId || null, dailyRent || 0, rentType || 'DAILY']
    );
  } catch (e) { console.error('logAssignment error:', e.message); }
};
const logUnassignment = async (vehicleId) => {
  try {
    await pool.query(
      `UPDATE public.driver_vehicle_history
       SET unassigned_at = NOW(), reason = 'UNASSIGNED'
       WHERE vehicle_id = $1 AND unassigned_at IS NULL`,
      [vehicleId]
    );
  } catch (e) { console.error('logUnassignment error:', e.message); }
};
const parseDate = (d) => {
  if (!d || d.trim() === '') return null;
  
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
  
  // D-M-YYYY or DD-MM-YYYY (dash)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(d.trim())) {
    const [dd, mm, yyyy] = d.trim().split('-');
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  
  // D/M/YYYY or DD/MM/YYYY (slash)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d.trim())) {
    const [dd, mm, yyyy] = d.trim().split('/');
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  
  return null;
};

const CLIENT_ID = process.env.PAYYANTRA_CLIENT_ID;

const CLIENT_SECRET = process.env.PAYYANTRA_CLIENT_SECRET;

const BASE_URL = process.env.PAYYANTRA_BASE_URL;


console.log('PayYantra Config Loaded:', {
  BASE_URL,
  CLIENT_ID: CLIENT_ID ? '✅ Present' : '❌ Missing',
  CLIENT_SECRET: CLIENT_SECRET ? '✅ Present' : '❌ Missing'
});


// GET TOKEN
const getToken = async () => {

  try {

    const res = await fetch(`${BASE_URL}/api/auth/token`, {

      method: 'POST',

      headers: {

        'x-client-id': CLIENT_ID,

        'x-client-secret': CLIENT_SECRET,

        'Content-Type': 'application/json',

      },

    });

    const data = await res.json();

    if (!data?.data?.token) {

      throw new Error('Failed to get token from PayYantra');

    }

    return data.data.token;

  } catch (err) {

    console.error('Get Token Error:', err.message);

    throw err;

  }

};
// ... top pe sab imports ...
// ====================== ADD TO YOUR EXISTING payment.js ======================

// GET DRIVER WALLET (from vehicle_drivers table - auth schema)
router.get('/driver/wallet', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    
    const result = await pool.query(
      `SELECT COALESCE(vd.wallet_balance, 0) as balance 
       FROM auth.vehicle_drivers vd
       JOIN auth.users u ON u.id = vd.user_id
       WHERE u.mobile_number = $1`,
      [phone]
    );
    
    res.json({ balance: parseFloat(result.rows[0]?.balance || 0) });
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch wallet' });
  }
});
// ─── DRIVER PING (har 5 min) ─────────────────────────────────────────
router.post('/driver/activity/ping', async (req, res) => {
  try {
    const { driverPhone } = req.body;
    const driverRes = await pool.query(
      `SELECT id FROM public.drivers WHERE mobile_number = $1`, [driverPhone]
    );
    if (!driverRes.rows[0]) return res.json({ success: false });
    const driverId = driverRes.rows[0].id;

    await pool.query(
      `INSERT INTO public.driver_activity (driver_id, activity_date, first_login, last_seen, total_active_minutes)
       VALUES ($1, CURRENT_DATE, NOW(), NOW(), 5)
       ON CONFLICT (driver_id, activity_date)
       DO UPDATE SET
         last_seen = NOW(),
         total_active_minutes = public.driver_activity.total_active_minutes + 5,
         updated_at = NOW()
       WHERE public.driver_activity.last_seen < NOW() - INTERVAL '6 minutes'`,
      [driverId]
    );

    // Check if incentive should be applied
    const activity = await pool.query(
      `SELECT da.*, d.owner_code FROM public.driver_activity da
       JOIN public.drivers d ON d.id = da.driver_id
       WHERE da.driver_id = $1 AND da.activity_date = CURRENT_DATE`,
      [driverId]
    );

    if (activity.rows[0] && !activity.rows[0].is_incentive_applied) {
      const act = activity.rows[0];
      const hoursActive = act.total_active_minutes / 60;

      // Owner ka config fetch karo
      const ownerRes = await pool.query(
        `SELECT o.id FROM public.owners o WHERE o.owner_code = $1`, [act.owner_code]
      );
      if (ownerRes.rows[0]) {
        const configRes = await pool.query(
          `SELECT * FROM public.owner_incentive_config 
           WHERE owner_id = $1 AND is_enabled = TRUE`, [ownerRes.rows[0].id]
        );
        const config = configRes.rows[0];

        if (config && hoursActive >= config.min_active_hours) {
          // Incentive apply karo
          let rentReduction = 0;
          const driverData = await pool.query(
            `SELECT v.daily_rent FROM public.vehicles v
             JOIN public.drivers d ON d.id = $1
             WHERE v.driver_id = $1 LIMIT 1`, [driverId]
          );
          const dailyRent = parseFloat(driverData.rows[0]?.daily_rent || 0);

          if (config.incentive_type === 'FULL_WAIVER') rentReduction = dailyRent;
          else if (config.incentive_type === 'PERCENTAGE') rentReduction = dailyRent * (config.incentive_value / 100);
          else if (config.incentive_type === 'FIXED') rentReduction = parseFloat(config.incentive_value);

          // Wallet mein credit karo
          if (rentReduction > 0) {
            await pool.query(
              `UPDATE public.drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
              [rentReduction, driverId]
            );
            await pool.query(
              `UPDATE public.driver_activity SET is_incentive_applied = TRUE WHERE driver_id = $1 AND activity_date = CURRENT_DATE`,
              [driverId]
            );
            // Notification bhejo
            await pool.query(
              `INSERT INTO public.notifications (user_id, user_type, title, message)
               VALUES ($1, 'DRIVER', '🎉 Rent Incentive!', $2)`,
              [driverId, `Aaj ${Math.floor(hoursActive)} hours active the! ₹${rentReduction.toFixed(0)} wallet mein credit ho gaye.`]
            );
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Activity ping error:', err);
    res.json({ success: false });
  }
});

// ─── OWNER: GET INCENTIVE CONFIG ─────────────────────────────────────
router.get('/owner/incentive-config', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    const result = await pool.query(
      `SELECT * FROM public.owner_incentive_config WHERE owner_id = $1`, [ownerId]
    );
    res.json(result.rows[0] || {
      is_enabled: false, min_active_hours: 12,
      incentive_type: 'FULL_WAIVER', incentive_value: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OWNER: SAVE INCENTIVE CONFIG ────────────────────────────────────
router.post('/owner/incentive-config', verifyToken, async (req, res) => {
  try {
    const { ownerId, isEnabled, minActiveHours, incentiveType, incentiveValue } = req.body;
    await pool.query(
      `INSERT INTO public.owner_incentive_config
         (owner_id, is_enabled, min_active_hours, incentive_type, incentive_value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (owner_id) DO UPDATE SET
         is_enabled = $2, min_active_hours = $3,
         incentive_type = $4, incentive_value = $5, updated_at = NOW()`,
      [ownerId, isEnabled, minActiveHours, incentiveType, incentiveValue || 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DRIVER LOGIN + OWNER NOTIFICATION ───────────────────────────────
router.post('/driver/activity/login', async (req, res) => {
  try {
    const { driverPhone } = req.body;
    const dr = await pool.query(
      `SELECT d.*, o.id as owner_db_id
       FROM public.drivers d
       LEFT JOIN public.owners o ON o.owner_code = d.owner_code
       WHERE d.mobile_number = $1`, [driverPhone]
    );
    if (!dr.rows[0]) return res.json({ success: false });
    const driver = dr.rows[0];

    // Daily log
    const veh = await pool.query(
      `SELECT id FROM public.vehicles WHERE driver_id = $1`, [driver.id]
    );
    await pool.query(
      `INSERT INTO public.driver_daily_log (driver_id, log_date, login_time, vehicle_id)
       VALUES ($1, CURRENT_DATE, NOW(), $2)
       ON CONFLICT (driver_id, log_date) DO NOTHING`,
      [driver.id, veh.rows[0]?.id || null]
    );

    // Owner notification
    if (driver.owner_db_id) {
      const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      await pool.query(
        `INSERT INTO public.notifications (user_id, user_type, title, message)
         VALUES ($1, 'OWNER', $2, $3)`,
        [driver.owner_db_id, `🟢 ${driver.full_name} logged in`, `App open kiya at ${t}`]
      );
    }
    res.json({ success: true });
  } catch (err) { res.json({ success: false }); }
});

router.post('/driver/activity/logout', async (req, res) => {
  try {
    const { driverPhone } = req.body;
    const dr = await pool.query(
      `SELECT d.*, o.id as owner_db_id
       FROM public.drivers d
       LEFT JOIN public.owners o ON o.owner_code = d.owner_code
       WHERE d.mobile_number = $1`, [driverPhone]
    );
    if (!dr.rows[0]) return res.json({ success: false });
    const driver = dr.rows[0];

    const logRes = await pool.query(
      `SELECT * FROM public.driver_daily_log
       WHERE driver_id = $1 AND log_date = CURRENT_DATE`, [driver.id]
    );
    if (!logRes.rows[0]?.login_time) return res.json({ success: false });

    const minutes = Math.floor((new Date() - new Date(logRes.rows[0].login_time)) / 60000);
    await pool.query(
      `UPDATE public.driver_daily_log
       SET logout_time = NOW(), active_minutes = $1
       WHERE driver_id = $2 AND log_date = CURRENT_DATE`,
      [minutes, driver.id]
    );

    // Incentive check
    if (driver.owner_db_id) {
      const rulesRes = await pool.query(
        `SELECT * FROM public.owner_incentive_rules
         WHERE owner_id = $1 AND is_enabled = TRUE`, [driver.owner_db_id]
      );
      const rules = rulesRes.rows[0]?.rules || [];
      const hoursWorked = minutes / 60;

      // Best applicable rule dhundo
      const applicable = rules
        .filter(r => hoursWorked >= r.min_hours)
        .sort((a, b) => b.min_hours - a.min_hours)[0];

      if (applicable && !logRes.rows[0].incentive_applied) {
        const vehRes = await pool.query(
          `SELECT daily_rent FROM public.vehicles WHERE driver_id = $1`, [driver.id]
        );
        const rent = parseFloat(vehRes.rows[0]?.daily_rent || 0);
        let amt = 0;
        if (applicable.type === 'FULL_WAIVER') amt = rent;
        else if (applicable.type === 'PERCENTAGE') amt = rent * (applicable.value / 100);
        else if (applicable.type === 'FIXED') amt = applicable.value;

        if (amt > 0) {
          await pool.query(
            `UPDATE public.drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
            [amt, driver.id]
          );
          await pool.query(
            `UPDATE public.driver_daily_log SET incentive_applied = TRUE, incentive_amount = $1
             WHERE driver_id = $2 AND log_date = CURRENT_DATE`,
            [amt, driver.id]
          );
          await pool.query(
            `INSERT INTO public.notifications (user_id, user_type, title, message)
             VALUES ($1, 'DRIVER', '🎉 Incentive Mila!', $2)`,
            [driver.id, `${Math.floor(hoursWorked)} ghante kaam kiya! ₹${amt.toFixed(0)} wallet mein aaye.`]
          );
        }
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// Driver ki puri history
router.get('/owner/driver-history/:driverId', verifyToken, async (req, res) => {
  try {
    const { driverId } = req.params;
    // Ownership check
    const own = await pool.query('SELECT owner_code FROM public.owners WHERE id=$1',[req.user.id]);
    if (!own.rows[0]) return res.status(403).json({ error: 'Not authorized' });
    const dCheck = await pool.query('SELECT id FROM public.drivers WHERE id=$1 AND owner_code=$2',[driverId, own.rows[0].owner_code]);
    if (!dCheck.rows[0]) return res.status(403).json({ error: 'Driver not in your fleet' });

    const [vehicleHistory, dailyLog] = await Promise.all([
      pool.query(
        `SELECT 
           dvh.*,
           v.vehicle_number, v.vehicle_model,
           dvh.assigned_at,
           dvh.unassigned_at,
           EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER as total_days,
           EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER * COALESCE(dvh.daily_rent, 0) as total_earned
         FROM public.driver_vehicle_history dvh
         JOIN public.vehicles v ON v.id = dvh.vehicle_id
         WHERE dvh.driver_id = $1
         ORDER BY dvh.assigned_at DESC`,
        [driverId]
      ),
      pool.query(
        `SELECT * FROM public.driver_daily_log
         WHERE driver_id = $1
         ORDER BY log_date DESC LIMIT 30`,
        [driverId]
      )
    ]);

    res.json({
      vehicle_history: vehicleHistory.rows,
      daily_log: dailyLog.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Vehicle ki puri history
router.get('/owner/vehicle-history/:vehicleId', verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    // Ownership check
    const vCheck = await pool.query('SELECT id FROM public.vehicles WHERE id=$1 AND owner_id=$2',[vehicleId, req.user.id]);
    if (!vCheck.rows[0]) return res.status(403).json({ error: 'Vehicle not in your fleet' });
    const result = await pool.query(
      `SELECT 
         dvh.*,
         d.full_name as driver_name, d.mobile_number as driver_phone,
         dvh.assigned_at, dvh.unassigned_at,
         EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER as total_days,
         EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER * COALESCE(dvh.daily_rent, 0) as total_earned
       FROM public.driver_vehicle_history dvh
       JOIN public.drivers d ON d.id = dvh.driver_id
       WHERE dvh.vehicle_id = $1
       ORDER BY dvh.assigned_at DESC`,
      [vehicleId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Today's activity for owner
router.get('/owner/driver-activity', verifyToken, async (req, res) => {
  try {
    const { ownerId, date } = req.query;
    const actDate = date || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT 
         d.id, d.full_name, d.mobile_number,
         COALESCE(dl.active_minutes, 0) as active_minutes,
         dl.login_time, dl.logout_time,
         dl.incentive_applied, dl.incentive_amount,
         v.vehicle_number, v.daily_rent
       FROM public.drivers d
       LEFT JOIN public.driver_daily_log dl ON dl.driver_id = d.id AND dl.log_date = $2
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
       ORDER BY COALESCE(dl.active_minutes, 0) DESC`,
      [ownerId, actDate]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Incentive rules
router.get('/owner/incentive-rules', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    const res2 = await pool.query(
      `SELECT * FROM public.owner_incentive_rules WHERE owner_id = $1`, [ownerId]
    );
    res.json(res2.rows[0] || { is_enabled: false, rules: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/owner/incentive-rules', verifyToken, async (req, res) => {
  try {
    const { ownerId, isEnabled, rules } = req.body;
    await pool.query(
      `INSERT INTO public.owner_incentive_rules (owner_id, is_enabled, rules)
       VALUES ($1, $2, $3)
       ON CONFLICT (owner_id) DO UPDATE
       SET is_enabled = $2, rules = $3, updated_at = NOW()`,
      [ownerId, isEnabled, JSON.stringify(rules)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// set-test-dues removed (security)

router.get('/driver/dues', verifyToken, async (req, res) => {
  try {
    const { phone } = req.query;
    // Only allow driver to fetch their own dues
    if (req.user.role === 'DRIVER' && req.user.mobile_number && req.user.mobile_number !== phone)
      return res.status(403).json({ error: 'Not authorized' });
    const result = await pool.query(
      `SELECT d.*, v.daily_rent as vehicle_daily_rent, v.vehicle_number
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.id = d.assigned_vehicle_id
       WHERE d.mobile_number = $1`,
      [phone]
    );
    const driver = result.rows[0];
    if (!driver || !driver.assigned_vehicle_id) {
      return res.json({ dues: 0, daily_rent: 0, paid_today: 0, vehicle_number: null });
    }
    const dailyRent = parseFloat(driver.vehicle_daily_rent || 0);
    const paid = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders
       WHERE payer_mobile=$1 AND transaction_status='SUCCESS' AND DATE(order_completion_date)=CURRENT_DATE`,
      [phone]
    );
    const paidToday = parseFloat(paid.rows[0].total);
    res.json({ dues: Math.max(0, dailyRent - paidToday), daily_rent: dailyRent, paid_today: paidToday, vehicle_number: driver.vehicle_number });
  } catch(err) {
    res.json({ dues: 0, daily_rent: 0, paid_today: 0 });
  }
});
// GET DRIVER TELEMETRY
router.get('/driver/telemetry', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone number required' });
    
    const result = await pool.query(
      `SELECT 
        COALESCE(ov.vehicle_number, 'MH-12-QX-4019') as vehicleNumber,
        COALESCE(vd.wallet_balance, 0) as wallet
       FROM auth.users u
       LEFT JOIN auth.owner_vehicles ov ON ov.driver_id = u.id
       LEFT JOIN auth.vehicle_drivers vd ON vd.user_id = u.id
       WHERE u.mobile_number = $1`,
      [phone]
    );
    
    res.json({
      vehicleNumber: result.rows[0]?.vehiclenumber || 'MH-12-QX-4019',
      battery: 92,
      driven: 45,
      wallet: parseFloat(result.rows[0]?.wallet || 0)
    });
  } catch (err) {
    console.error('Telemetry error:', err);
    res.json({ vehicleNumber: 'MH-12-QX-4019', battery: 92, driven: 45, wallet: 0 });
  }
});
// Add damage record
router.post('/owner/damage-record', verifyToken, async (req, res) => {
  try {
    const { vehicleId, driverId, damageType, description, amount, recoveryMethod } = req.body;
    const ownerId = req.user.id;
    await pool.query(
      `INSERT INTO public.damage_records 
        (vehicle_id, driver_id, owner_id, damage_type, description, damage_amount, recovery_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [vehicleId, driverId||null, ownerId, damageType||'OTHER', description, amount||0, recoveryMethod||'LEDGER']
    );

    // Agar LEDGER method hai toh driver ledger mein entry bhi daalo
    if (recoveryMethod === 'LEDGER' && driverId && amount > 0) {
      await pool.query(
        `INSERT INTO public.driver_ledger (driver_id, owner_id, entry_type, amount, description)
         VALUES ($1,$2,'DAMAGE_CHARGE',$3,$4)`,
        [driverId, ownerId, amount, description || 'Vehicle damage charge']
      );
    }

    res.json({ success: true, message: 'Damage recorded!' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get damage history for vehicle
router.get('/owner/damage-records/:vehicleId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dr.*, d.full_name as driver_name
       FROM public.damage_records dr
       LEFT JOIN public.drivers d ON d.id = dr.driver_id
       WHERE dr.vehicle_id = $1
       ORDER BY dr.created_at DESC`,
      [req.params.vehicleId]
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Update damage status
router.put('/owner/damage-record/:id/resolve', verifyToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE public.damage_records SET status='RESOLVED' WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/owner/vehicles', verifyToken, async (req, res) => {
  try {
    
    const { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id,
        vehicle_type, insurance_expiry, fitness_expiry, chassis_number } = req.body;
    console.log('Add Vehicle:', { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id });
    
    if (!owner_id || !vehicle_number) {
      return res.status(400).json({ success: false, message: 'Vehicle number aur owner ID required' });
    }
    if (!vehicle_type) {
      return res.status(400).json({ success: false, message: 'Vehicle type required' });
    }
    const rent = parseFloat(daily_rent);
    if (!daily_rent || isNaN(rent) || rent <= 0) {
      return res.status(400).json({ success: false, message: 'Rent amount required — ₹0 ya free allowed nahi' });
    }
    
    // Check if vehicle exists
    const existing = await pool.query(
      'SELECT id FROM public.vehicles WHERE vehicle_number = $1',
      [vehicle_number]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Vehicle number already exists' });
    }
    
    const result = await pool.query(
  `INSERT INTO public.vehicles 
    (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, status, 
     vehicle_type, insurance_expiry, fitness_expiry, chassis_number, created_at)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
   RETURNING id, vehicle_number`,
  [vehicle_number, vehicle_model||'Standard', rent, 
   parseInt(owner_id), driver_id||null, 
   driver_id?'ASSIGNED':'AVAILABLE',
   vehicle_type||null,
   insurance_expiry||null, fitness_expiry||null, chassis_number||null]
);
    
    // If driver assigned, update driver's assigned_vehicle_id
    if (driver_id) {
      await pool.query(
        `UPDATE public.drivers 
         SET assigned_vehicle_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [result.rows[0].id, driver_id]
      );
      
      // Also update vehicle's driver_name and driver_phone for quick access
      const driverInfo = await pool.query(
        'SELECT full_name, mobile_number FROM public.drivers WHERE id = $1',
        [driver_id]
      );
      
      if (driverInfo.rows.length > 0) {
        await pool.query(
          `UPDATE public.vehicles 
           SET driver_name = $1, driver_phone = $2
           WHERE id = $3`,
          [driverInfo.rows[0].full_name, driverInfo.rows[0].mobile_number, result.rows[0].id]
        );
      }
    }
    
    res.json({ success: true, message: 'Vehicle added successfully!', vehicle: result.rows[0] });
    
  } catch (err) {
    console.error('Add vehicle error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/chatbot', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message?.trim()) return res.json({ reply: 'Kuch poochein.' });

    const today = new Date().toDateString();
    const driversInfo = (context?.drivers || []).map(d => {
      const paid = (context?.orders || []).some(o =>
        o.payer_mobile === d.mobile_number &&
        o.transaction_status === 'SUCCESS' &&
        new Date(o.order_completion_date).toDateString() === today
      );
      const vehicle = (context?.vehicles || []).find(v => v.driver_id === d.id);
      return `${d.full_name}: ${paid ? 'PAID' : 'NOT PAID'}, Vehicle: ${vehicle?.vehicle_number || 'unassigned'}, Wallet: Rs.${d.wallet_balance || 0}`;
    }).join('\n');

    const systemPrompt = `You are a fleet management assistant for MobilityGrid EV platform.
LIVE DATA: Collection today: Rs.${context?.todayCollection || 0}, Drivers: ${context?.totalDrivers || 0}, Vehicles: ${context?.totalVehicles || 0}
DRIVER STATUS:\n${driversInfo}
RULES: Respond in same language as user (Hindi/English/Hinglish). Max 3 lines. Use exact names and numbers.`;

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mg-sandy.vercel.app',
        'X-Title': 'MobilityGrid'
      },
      body: JSON.stringify({
  model: 'meta-llama/llama-3.1-8b-instruct:free',
  messages: [
    { role: 'system', content: systemPrompt },
    ...(req.body?.history || []).slice(-6),
    { role: 'user', content: message }
  ],
  max_tokens: 150
})
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || 'Samajh nahi aaya.';
    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.json({ reply: 'Service unavailable.' });
  }
});
router.post('/owner/ledger-entry', verifyToken, async (req, res) => {
  try {
    const { driverId, ownerId, entryType, amount, description } = req.body;

    // Verify driver belongs to this owner
    const ownerRes = await pool.query(
      `SELECT owner_code FROM public.owners WHERE id = $1`, [ownerId]
    );
    const ownerCode = ownerRes.rows[0]?.owner_code;

    const driverCheck = await pool.query(
      `SELECT id FROM public.drivers WHERE id = $1 AND owner_code = $2`,
      [driverId, ownerCode]
    );
    if (!driverCheck.rows[0]) 
      return res.status(403).json({ error: 'Driver does not belong to this owner' });

    // Atomic: ledger insert + balance update together
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO public.driver_ledger
         (driver_id, owner_id, entry_type, amount, description, created_by)
         VALUES ($1, $2, $3, $4, $5, 'OWNER')`,
        [driverId, ownerId, entryType, amount, description || '']
      );
      if (['ADVANCE_CREDIT', 'REPAIR_CREDIT', 'REFUND'].includes(entryType)) {
        await client.query(
          `UPDATE public.drivers SET advance_balance = COALESCE(advance_balance, 0) + $1 WHERE id = $2`,
          [amount, driverId]
        );
      }
      if (['DAMAGE_CHARGE', 'PENALTY'].includes(entryType)) {
        await client.query(
          `UPDATE public.drivers SET advance_balance = GREATEST(0, COALESCE(advance_balance, 0) - $1) WHERE id = $2`,
          [amount, driverId]
        );
      }
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
    // Notification bhejo driver ko
const entryMessages = {
  'ADVANCE_CREDIT': `Owner ne ₹${amount} advance credit diya.`,
  'REPAIR_CREDIT': `₹${amount} repair compensation credited.`,
  'DAMAGE_CHARGE': `₹${amount} damage charge lagaya gaya.`,
  'PENALTY': `₹${amount} penalty lagayi gayi.`,
  'REFUND': `₹${amount} refund kiya gaya.`,
  'DEPOSIT_CHARGE': `Security deposit se ₹${amount} deduct hua.`,
};

await pool.query(
  `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
   VALUES ($1, 'DRIVER', '📋 Ledger Update', $2, NOW())`,
  [driverId, entryMessages[entryType] || `Ledger entry: ₹${amount}`]
).catch(() => {});

res.json({ success: true, message: 'Entry recorded' });
  } catch (err) {
    console.error('Ledger entry error:', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/owner/driver-ledger', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;

    // Step 1: Owner ka code fetch karo
    const ownerRes = await pool.query(
      `SELECT owner_code FROM public.owners WHERE id = $1`, [ownerId]
    );
    const ownerCode = ownerRes.rows[0]?.owner_code;
    if (!ownerCode) return res.status(404).json({ error: 'Owner not found' });

    // Step 2: Is owner_code se linked drivers + unka ledger
    const result = await pool.query(`
      SELECT 
        d.id,
        d.full_name,
        d.mobile_number,
        d.advance_balance,
        d.security_deposit,
        v.vehicle_number,
        v.daily_rent,
        COALESCE(SUM(
          CASE WHEN dl.entry_type IN ('CASH_PAYMENT','UPI_PAYMENT','ADVANCE_CREDIT','REPAIR_CREDIT','REFUND') 
          THEN dl.amount ELSE 0 END
        ), 0) AS total_paid,
        COALESCE(SUM(
          CASE WHEN dl.entry_type IN ('RENT_CHARGE','DAMAGE_CHARGE','DEPOSIT_CHARGE','PENALTY') 
          THEN dl.amount ELSE 0 END
        ), 0) AS total_charged
      FROM public.drivers d
      LEFT JOIN public.vehicles v ON v.driver_id = d.id
      LEFT JOIN public.driver_ledger dl ON dl.driver_id = d.id
      WHERE d.owner_code = $1 AND d.status = 'ACTIVE'
      GROUP BY d.id, d.full_name, d.mobile_number, d.advance_balance, 
               d.security_deposit, v.vehicle_number, v.daily_rent
      ORDER BY d.full_name
    `, [ownerCode]);  // ← ownerCode directly use ho raha hai

    const drivers = result.rows.map(d => ({
      id: d.id,
      full_name: d.full_name,
      mobile_number: d.mobile_number,
      vehicle_number: d.vehicle_number || 'Not Assigned',
      daily_rent: parseFloat(d.daily_rent || 0),
      total_paid: parseFloat(d.total_paid || 0),
      total_charged: parseFloat(d.total_charged || 0),
      pending: Math.max(0, parseFloat(d.total_charged) - parseFloat(d.total_paid)),
      advance: parseFloat(d.advance_balance || 0),
      security_deposit: parseFloat(d.security_deposit || 0)
    }));

    res.json(drivers);
  } catch (err) {
    console.error('Driver ledger error:', err);
    res.status(500).json({ error: err.message });
  }
});
// WAL-07: CSV download for driver ledger
router.get('/owner/driver-ledger/csv', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;

    const ownerRes = await pool.query(
      `SELECT owner_code FROM public.owners WHERE id = $1`, [ownerId]
    );
    const ownerCode = ownerRes.rows[0]?.owner_code;
    if (!ownerCode) return res.status(404).json({ error: 'Owner not found' });

    const result = await pool.query(`
      SELECT
        d.full_name,
        d.mobile_number,
        COALESCE(v.vehicle_number, 'Not Assigned') AS vehicle_number,
        COALESCE(v.daily_rent, 0) AS daily_rent,
        COALESCE(SUM(
          CASE WHEN dl.entry_type IN ('CASH_PAYMENT','UPI_PAYMENT','ADVANCE_CREDIT','REPAIR_CREDIT','REFUND')
          THEN dl.amount ELSE 0 END
        ), 0) AS total_paid,
        COALESCE(SUM(
          CASE WHEN dl.entry_type IN ('RENT_CHARGE','DAMAGE_CHARGE','DEPOSIT_CHARGE','PENALTY')
          THEN dl.amount ELSE 0 END
        ), 0) AS total_charged,
        d.advance_balance,
        d.security_deposit
      FROM public.drivers d
      LEFT JOIN public.vehicles v ON v.driver_id = d.id
      LEFT JOIN public.driver_ledger dl ON dl.driver_id = d.id
      WHERE d.owner_code = $1 AND d.status = 'ACTIVE'
      GROUP BY d.id, d.full_name, d.mobile_number, d.advance_balance,
               d.security_deposit, v.vehicle_number, v.daily_rent
      ORDER BY d.full_name
    `, [ownerCode]);

    const header = ['Name', 'Mobile', 'Vehicle', 'Daily Rent', 'Total Paid', 'Total Charged', 'Pending', 'Advance', 'Security Deposit'];
    const rows = result.rows.map(d => {
      const pending = Math.max(0, parseFloat(d.total_charged) - parseFloat(d.total_paid));
      return [
        `"${d.full_name}"`,
        d.mobile_number,
        `"${d.vehicle_number}"`,
        parseFloat(d.daily_rent || 0).toFixed(2),
        parseFloat(d.total_paid || 0).toFixed(2),
        parseFloat(d.total_charged || 0).toFixed(2),
        pending.toFixed(2),
        parseFloat(d.advance_balance || 0).toFixed(2),
        parseFloat(d.security_deposit || 0).toFixed(2)
      ].join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ledger_${ownerCode}_${date}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Ledger CSV error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/owner/notify-unpaid', verifyToken, async (req, res) => {
  try {
    const ownRes = await pool.query('SELECT owner_code FROM public.owners WHERE id=$1',[req.user.id]);
    if (!ownRes.rows[0]) return res.status(403).json({ error: 'Not authorized' });
    const ownerCode = ownRes.rows[0].owner_code;
    const paidResult = await pool.query(
      `SELECT DISTINCT payer_mobile FROM ms_orders 
       WHERE transaction_status='SUCCESS' AND DATE(order_completion_date)=CURRENT_DATE`
    );
    const paidPhones = paidResult.rows.map(r => r.payer_mobile);
    const unpaidDrivers = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number FROM public.drivers d
       JOIN public.vehicles v ON v.driver_id = d.id AND v.daily_rent > 0
       WHERE d.status='ACTIVE' AND d.owner_code=$1 AND d.mobile_number != ALL($2::text[])`,
      [ownerCode, paidPhones]
    );
    let count = 0;
    for (const driver of unpaidDrivers.rows) {
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'DRIVER', '⏰ Payment Reminder', 'Aaj ka rent abhi baaki hai. Please pay now.', NOW())`,
        [driver.id]
      ).catch(() => {});
      count++;
    }
    res.json({ success: true, message: `${count} drivers ko notification bheja gaya.`, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/owner/overdue-drivers', verifyToken, async (req, res) => {
  try {
    // Get the owner_code directly from the user object in the token
    // Assuming your JWT contains owner_code. If not, use req.user.id to fetch it.
    const ownerCode = req.user.owner_code; 

    if (!ownerCode) {
      return res.status(400).json({ success: false, message: "Owner code missing in token" });
    }

    const result = await pool.query(`
      SELECT d.id, d.full_name, v.vehicle_number, v.daily_rent,
      ( 
        (SELECT COALESCE(SUM(amount), 0) FROM public.driver_ledger WHERE driver_id = d.id AND entry_type IN ('RENT_CHARGE', 'DAMAGE_CHARGE', 'PENALTY')) 
        - 
        (SELECT COALESCE(SUM(amount), 0) FROM public.driver_ledger WHERE driver_id = d.id AND entry_type IN ('CASH_PAYMENT', 'UPI_PAYMENT', 'ADVANCE_CREDIT', 'REFUND')) 
      ) AS balance
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.owner_code = $1 AND d.status = 'ACTIVE'
    `, [ownerCode]);

    res.json(result.rows);
  } catch (err) {
    console.error("DEBUG: Error in overdue-drivers:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/debug-run-rent', async (req, res) => {
  try {
    const { generateDailyRentEntries } = require('../services/scheduler.service');
    await generateDailyRentEntries();
    res.json({ message: "Success" });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
// POST /owner/remind-overdue?ownerId=X — send in-app notification to all overdue drivers
router.post('/owner/remind-overdue', verifyToken, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const overdue = await pool.query(
      `SELECT d.id, d.full_name FROM public.drivers d
       JOIN public.vehicles v ON v.driver_id = d.id AND v.daily_rent > 0
       WHERE d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
         AND d.status = 'ACTIVE'
         AND d.id NOT IN (
           SELECT DISTINCT dr.id FROM public.drivers dr
           JOIN public.ms_orders mo ON mo.payer_mobile = dr.mobile_number
           WHERE mo.transaction_status = 'SUCCESS'
             AND DATE(mo.order_completion_date AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
         )`,
      [parseInt(ownerId)]
    );
    let count = 0;
    for (const d of overdue.rows) {
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'DRIVER', '⏰ Rent Reminder', 'Aaj ka rent abhi baaki hai. Please pay karo.', NOW())`,
        [d.id]
      ).catch(() => {});
      count++;
    }
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/owner/cash-payment', verifyToken, requirePermission('record_cash'), async (req, res) => {
  try {
    const { driverPhone, driverName, amount, ownerId, purpose = 'RENT' } = req.body;
    if (!driverPhone || !amount) return res.status(400).json({ success: false, message: 'Missing fields' });

    // Fetch driver + owner + vehicle details to populate ms_orders fully
    const info = await pool.query(`
      SELECT d.full_name, d.driver_code, d.owner_code,
             v.vehicle_number,
             o.id as owner_int_id
      FROM public.drivers d
      LEFT JOIN public.vehicles v ON v.driver_id = d.id
      LEFT JOIN public.owners o ON o.owner_code = d.owner_code
      WHERE d.mobile_number = $1 LIMIT 1
    `, [driverPhone]);
    const di = info.rows[0] || {};

    const { v4: uuidv4 } = require('uuid');
    const orderId = uuidv4();
    const orderNumber = `CASH-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

    // Atomic: ms_orders insert + wallet_balance update together
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO ms_orders (
          order_id, order_number, pg_transaction_id,
          order_amount, currency,
          payer_name, payer_mobile,
          transaction_status, payment_mode,
          order_completion_date, order_initiation_date,
          driver_code, owner_code, vehicle_number,
          driver_full_name, purpose
        ) VALUES ($1,$2,$3,$4,'INR',$5,$6,'SUCCESS','CASH',NOW(),NOW(),$7,$8,$9,$10,$11)`,
        [
          orderId, orderNumber, orderNumber,
          parseFloat(amount),
          di.full_name || driverName, driverPhone,
          di.driver_code || null,
          di.owner_code || null,
          di.vehicle_number || null,
          di.full_name || driverName,
          purpose
        ]
      );
      await client.query(
        `UPDATE public.drivers SET wallet_balance = COALESCE(wallet_balance,0) + $1 WHERE mobile_number = $2`,
        [parseFloat(amount), driverPhone]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       SELECT id, 'DRIVER', '💵 Cash Payment Recorded', $2, NOW()
       FROM public.drivers WHERE mobile_number = $1`,
      [driverPhone, `Owner recorded your cash payment of ₹${amount}`]
    ).catch(()=>{});

    res.json({ success: true, message: 'Cash payment recorded!', order_number: orderNumber });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/owner/ledger', async (req, res) => {
  try {
    const { period } = req.query;
    const ownerId = req.query.ownerId;
    if (!ownerId) return res.json({ received: 0, outstanding: 0 });

    // Get owner_code for this owner (drivers table uses owner_code not owner_id)
    const ownerCodeRes = await pool.query(
      `SELECT owner_code FROM public.owners WHERE id=$1`, [ownerId]
    );
    if (ownerCodeRes.rows.length === 0) return res.json({ received: 0, outstanding: 0 });
    const ownerCode = ownerCodeRes.rows[0].owner_code;

    // Get drivers belonging to this owner via owner_code
    const driverRows = await pool.query(
      `SELECT id FROM public.drivers WHERE owner_code=$1`, [ownerCode]
    );
    if (driverRows.rows.length === 0) return res.json({ received: 0, outstanding: 0 });
    const driverIds = driverRows.rows.map(r => r.id);

    let dateFilter = '';
    switch(period) {
      case 'yesterday':  dateFilter = ` AND DATE(order_completion_date) = CURRENT_DATE - INTERVAL '1 day'`; break;
      case 'week':       dateFilter = ` AND order_completion_date >= NOW() - INTERVAL '7 days'`; break;
      case 'this_month': dateFilter = ` AND DATE_TRUNC('month', order_completion_date) = DATE_TRUNC('month', NOW())`; break;
      case 'last_month': dateFilter = ` AND DATE_TRUNC('month', order_completion_date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')`; break;
      default:           dateFilter = ` AND DATE(order_completion_date) = CURRENT_DATE`;
    }
    const received = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders WHERE transaction_status='SUCCESS' AND driver_id = ANY($1::int[])${dateFilter}`,
      [driverIds]
    );
    const pending = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders WHERE transaction_status='PENDING' AND driver_id = ANY($1::int[]) AND DATE(order_initiation_date)=CURRENT_DATE`,
      [driverIds]
    );
    res.json({
      received: parseFloat(received.rows[0].total),
      outstanding: parseFloat(pending.rows[0].total),
    });
  } catch(err) { res.json({ received: 0, outstanding: 0 }); }
});
router.get('/owner/by-phone', verifyToken, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, owner_code, wallet_balance, status, created_at
       FROM public.owners 
       WHERE mobile_number = $1`,
      [phone]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('Owner by phone error:', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/owner/vehicle-stats/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    
    const vehicle = await pool.query(
      `SELECT v.*, d.mobile_number as driver_phone
       FROM public.vehicles v
       LEFT JOIN public.drivers d ON d.id = v.driver_id
       WHERE v.id = $1`, [vehicleId]
    );
    
    const v = vehicle.rows[0];
    if (!v) return res.status(404).json({ error: 'Not found' });

    // Total revenue collected
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) as total,
              COUNT(*) as payment_count
       FROM public.ms_orders
       WHERE payer_mobile = $1 AND transaction_status = 'SUCCESS'`,
      [v.driver_phone]
    );

    // Days since assigned
    const assignedDays = v.created_at 
      ? Math.floor((new Date() - new Date(v.created_at)) / (1000*60*60*24)) 
      : 0;

    const totalRevenue = parseFloat(revenue.rows[0].total);
    const expectedRevenue = assignedDays * parseFloat(v.daily_rent || 0);
    const roi = expectedRevenue > 0 
      ? Math.round((totalRevenue / expectedRevenue) * 100) 
      : 0;

    res.json({
      total_revenue: totalRevenue,
      payment_count: parseInt(revenue.rows[0].payment_count),
      assigned_days: assignedDays,
      expected_revenue: expectedRevenue,
      roi_percent: roi,
      utilization: roi > 100 ? 100 : roi
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================
// GET OWNER VEHICLES
// ============================================
// Backend payment.js - Replace this endpoint
router.get('/owner/vehicles', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });

    const result = await pool.query(
      `SELECT
         v.id,
         v.vehicle_number,
         v.vehicle_model,
         v.daily_rent,
         v.status,
         v.created_at,
         v.driver_id,
         v.rent_type,
         v.rent_amount,
         v.operational_status,
         v.vehicle_type,
         v.insurance_expiry,
         v.fitness_expiry,
         -- Always get fresh driver info via JOIN (avoids stale denormalized columns)
         d.full_name   AS driver_name,
         d.mobile_number AS driver_phone
       FROM public.vehicles v
       LEFT JOIN public.drivers d ON d.id = v.driver_id
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [parseInt(ownerId)]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles', error: err.message });
  }
});
router.post('/owner/add-driver', verifyToken, async (req, res) => {
  try {
    const { full_name, mobile_number, date_of_birth, emergency_contact_name,
        emergency_contact_number, driving_license_number,
        driving_license_expiry, security_deposit, owner_id } = req.body;

    if (!full_name || !mobile_number)
      return res.status(400).json({ success: false, message: 'Name and phone required' });

    if (/[0-9]/.test(full_name))
      return res.status(400).json({ success: false, message: '❌ Name cannot contain numbers!' });

    if (!/^\d{10}$/.test(mobile_number))
      return res.status(400).json({ success: false, message: '❌ Phone must be 10 digits' });

    // Always use JWT identity — never trust client-supplied owner_id
    const resolvedOwnerId = req.user.id;
    if (!resolvedOwnerId)
      return res.status(400).json({ success: false, message: 'Owner ID required' });

    const ownerRow = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1', [parseInt(resolvedOwnerId)]
    );
    if (!ownerRow.rows[0])
      return res.status(400).json({ success: false, message: 'Owner not found' });
    const ownerCode = ownerRow.rows[0].owner_code;

    const existing = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [mobile_number]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: '❌ Driver with this phone already exists' });

    const driverCode = 'DRV' + Date.now().toString().slice(-6);

    const result = await pool.query(
  `INSERT INTO public.drivers
    (full_name, mobile_number, owner_code, driver_code, wallet_balance, status,
     date_of_birth, emergency_contact_name, emergency_contact_number,
     driving_license_number, driving_license_expiry, security_deposit)
   VALUES ($1,$2,$3,$4,0,'ACTIVE',$5,$6,$7,$8,$9,$10)
   RETURNING id, driver_code`,
  [full_name, mobile_number, ownerCode, driverCode,
   date_of_birth||null, emergency_contact_name||null, emergency_contact_number||null,
   driving_license_number||null, driving_license_expiry||null, security_deposit||0]
);

    res.json({ success: true, message: '✅ Driver added!', driver_code: result.rows[0].driver_code,
               driver: { id: result.rows[0].id, driver_code: result.rows[0].driver_code } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add driver: ' + err.message });
  }
});
router.get('/owner/transactions', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    // ownerId is numeric owner id — look up owner_code for matching
    let ownerCode = null;
    if (ownerId) {
      const ocRes = await pool.query(
        `SELECT owner_code FROM public.owners WHERE id = $1`, [ownerId]
      ).catch(() => ({ rows: [] }));
      ownerCode = ocRes.rows[0]?.owner_code || null;
    }

    const ownerFilter = ownerCode
      ? `AND (mo.owner_code = $1 OR d.owner_code = $1)`
      : ownerId ? `AND d.owner_id = $1` : '';
    const params = ownerCode ? [ownerCode] : ownerId ? [parseInt(ownerId)] : [];

    const result = await pool.query(
      `SELECT mo.order_id, mo.order_number, mo.order_amount,
              mo.order_initiation_date, mo.order_completion_date,
              mo.transaction_status, mo.payment_mode, mo.payer_mobile,
              COALESCE(d.full_name, mo.payer_name, mo.driver_full_name) as driver_name,
              v.vehicle_number, mo.purpose
       FROM public.ms_orders mo
       LEFT JOIN public.drivers d ON RIGHT(d.mobile_number, 10) = RIGHT(mo.payer_mobile, 10)
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE mo.transaction_status IN ('SUCCESS', 'PENDING', 'FAILED')
       ${ownerFilter}
       ORDER BY mo.order_initiation_date DESC
       LIMIT 100`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Transactions error:', err);
    res.json([]);
  }
});
// GET drivers for owner — requires JWT, scoped to owner
router.get('/drivers/list', verifyToken, async (req, res) => {
  try {
    const ownerRes = await pool.query('SELECT owner_code FROM public.owners WHERE id=$1', [req.user.id]);
    if (!ownerRes.rows[0]) return res.status(403).json({ success: false, drivers: [] });
    const ownerCode = ownerRes.rows[0].owner_code;
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code,
              COALESCE(wallet_balance,0) as wallet_balance, status
       FROM public.drivers WHERE status='ACTIVE' AND owner_code=$1 ORDER BY full_name`,
      [ownerCode]
    );
    res.json({ success: true, drivers: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error: ' + err.message, drivers: [] });
  }
});

// GET owners list — no phone numbers exposed publicly
router.get('/owners/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, owner_code
       FROM public.owners 
       WHERE status = 'ACTIVE'
       ORDER BY full_name`
    );
    res.json({ owners: result.rows });
  } catch (err) {
    res.json({ owners: [] });
  }
});
router.get('/owner/drivers/list', verifyToken, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    // Get owner_code for this owner
    let ownerCode = null;
    if (ownerId) {
      const ownerRes = await pool.query(
        'SELECT owner_code FROM public.owners WHERE id = $1 LIMIT 1',
        [parseInt(ownerId)]
      );
      ownerCode = ownerRes.rows[0]?.owner_code || null;
    }

    const whereClause = ownerCode
  ? `WHERE UPPER(d.status) = 'ACTIVE' AND d.owner_code = $3`
  : `WHERE UPPER(d.status) = 'ACTIVE'`;
    const params = ownerCode ? [limit, offset, ownerCode] : [limit, offset];

    const countParams = ownerCode ? [ownerCode] : [];
    const countWhere = ownerCode ? `WHERE status = 'ACTIVE' AND owner_code = $1` : `WHERE status = 'ACTIVE'`;
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM public.drivers ${countWhere}`, countParams
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const result = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number as phone_number,
              d.driver_code, d.wallet_balance, d.status, d.created_at,
              COALESCE(v.vehicle_number, 'Not Assigned') as assigned_vehicle,
              v.id as vehicle_id
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       ${whereClause}
       ORDER BY d.full_name
       LIMIT $1 OFFSET $2`,
      params
    );

    res.json({
      drivers: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get drivers error:', err);
    res.json({ drivers: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
  }
});

// ============================================
// OWNER PLAN / SUBSCRIPTION
// ============================================
router.get('/owner/plan', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'ownerId required' });
    const result = await pool.query(
      `SELECT subscription_end_date FROM public.owners WHERE id = $1`,
      [parseInt(ownerId)]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Owner not found' });
    const row = result.rows[0];
    const isPremium = row.subscription_end_date && new Date(row.subscription_end_date) > new Date();
    res.json({
      plan: isPremium ? 'PREMIUM' : 'FREE',
      is_premium: isPremium,
      subscription_status: isPremium ? 'ACTIVE' : 'INACTIVE',
      expires_at: row.subscription_end_date || null,
    });
  } catch (err) {
    console.error('owner/plan error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================
// VEHICLE OPERATIONAL STATUS UPDATE
// ============================================
router.put('/owner/vehicles/:vehicleId/status', verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { status } = req.body;
    const VALID = ['ACTIVE','MAINTENANCE','ACCIDENT','RECOVERY','INACTIVE'];
    if (!status || !VALID.includes(status))
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID.join(', ')}` });
    await pool.query(
      `UPDATE public.vehicles SET operational_status = $1 WHERE id = $2`,
      [status, parseInt(vehicleId)]
    );
    res.json({ success: true, vehicleId, operational_status: status });
  } catch (err) {
    console.error('vehicle status update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// OWNER STATS
// ============================================
router.get('/owner/stats', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    const vehicles = await pool.query(
      'SELECT COUNT(*) FROM public.vehicles WHERE owner_id = $1',
      [parseInt(ownerId)]
    );
    
    const drivers = await pool.query(
      'SELECT COUNT(*) FROM public.drivers WHERE owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)',
      [parseInt(ownerId)]
    );
    
    const ownerCodeRes = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1',
      [parseInt(ownerId)]
    );
    const oCode = ownerCodeRes.rows[0]?.owner_code;

    const [earnings, earningsToday, earningsMonth] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(order_amount), 0) as total
         FROM public.ms_orders
         WHERE owner_code = $1 AND transaction_status = 'SUCCESS'`,
        [oCode]
      ),
      pool.query(
        `SELECT COALESCE(SUM(order_amount), 0) as total
         FROM public.ms_orders
         WHERE owner_code = $1 AND transaction_status = 'SUCCESS'
           AND DATE(order_completion_date AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'`,
        [oCode]
      ),
      pool.query(
        `SELECT COALESCE(SUM(order_amount), 0) as total
         FROM public.ms_orders
         WHERE owner_code = $1 AND transaction_status = 'SUCCESS'
           AND DATE_TRUNC('month', order_completion_date AT TIME ZONE 'Asia/Kolkata')
             = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')`,
        [oCode]
      ),
    ]);

    res.json({
      total_vehicles:   parseInt(vehicles.rows[0].count || 0),
      total_drivers:    parseInt(drivers.rows[0].count || 0),
      total_earnings:   parseFloat(earnings.rows[0].total || 0),
      earnings_today:   parseFloat(earningsToday.rows[0].total || 0),
      earnings_month:   parseFloat(earningsMonth.rows[0].total || 0),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.json({ total_vehicles: 0, total_drivers: 0, total_earnings: 0, earnings_today: 0, earnings_month: 0 });
  }
});

// GET /api/payment/owner/trend?ownerId=X — 90-day daily collection chart
router.get('/owner/trend', async (req, res) => {
  // Build 90-day skeleton so chart always has data even for sparse periods
  const DAYS = 90;
  const buildDays = (rows) => {
    const map = {};
    rows.forEach(r => { map[String(r.date).split('T')[0]] = { day: r.day, online: Number(r.online), cash: Number(r.cash) }; });
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      days.push(map[key] || { day: label, online: 0, cash: 0 });
    }
    return days;
  };

  const { ownerId } = req.query;
  if (!ownerId) return res.json(buildDays([]));

  try {
    // Resolve owner_code — fallback to owner_id join if no owner_code
    const ownerRes = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1 LIMIT 1',
      [parseInt(ownerId)]
    );
    const ownerCode = ownerRes.rows[0]?.owner_code || null;

    let rows = [];
    if (ownerCode) {
      const result = await pool.query(
        `SELECT
           TO_CHAR(DATE(COALESCE(mo.order_completion_date, mo.order_initiation_date) AT TIME ZONE 'Asia/Kolkata'), 'DD Mon') AS day,
           DATE(COALESCE(mo.order_completion_date, mo.order_initiation_date) AT TIME ZONE 'Asia/Kolkata') AS date,
           COALESCE(SUM(CASE WHEN mo.payment_mode != 'CASH' THEN mo.order_amount ELSE 0 END), 0)::int AS online,
           COALESCE(SUM(CASE WHEN mo.payment_mode = 'CASH' THEN mo.order_amount ELSE 0 END), 0)::int AS cash
         FROM public.ms_orders mo
         LEFT JOIN public.drivers d ON RIGHT(d.mobile_number, 10) = RIGHT(mo.payer_mobile, 10)
         WHERE (d.owner_code = $1 OR mo.owner_code = $1)
           AND mo.transaction_status = 'SUCCESS'
           AND COALESCE(mo.order_completion_date, mo.order_initiation_date) >= NOW() - INTERVAL '365 days'
         GROUP BY DATE(COALESCE(mo.order_completion_date, mo.order_initiation_date) AT TIME ZONE 'Asia/Kolkata')
         ORDER BY date ASC`,
        [ownerCode]
      );
      rows = result.rows;
    } else {
      // Fallback: join by driver.owner_id
      const result = await pool.query(
        `SELECT
           TO_CHAR(DATE(COALESCE(mo.order_completion_date, mo.order_initiation_date) AT TIME ZONE 'Asia/Kolkata'), 'DD Mon') AS day,
           DATE(COALESCE(mo.order_completion_date, mo.order_initiation_date) AT TIME ZONE 'Asia/Kolkata') AS date,
           COALESCE(SUM(CASE WHEN mo.payment_mode != 'CASH' THEN mo.order_amount ELSE 0 END), 0)::int AS online,
           COALESCE(SUM(CASE WHEN mo.payment_mode = 'CASH' THEN mo.order_amount ELSE 0 END), 0)::int AS cash
         FROM public.ms_orders mo
         LEFT JOIN public.drivers d ON RIGHT(d.mobile_number, 10) = RIGHT(mo.payer_mobile, 10)
         WHERE d.owner_id = $1
           AND mo.transaction_status = 'SUCCESS'
           AND COALESCE(mo.order_completion_date, mo.order_initiation_date) >= NOW() - INTERVAL '365 days'
         GROUP BY DATE(COALESCE(mo.order_completion_date, mo.order_initiation_date) AT TIME ZONE 'Asia/Kolkata')
         ORDER BY date ASC`,
        [parseInt(ownerId)]
      );
      rows = result.rows;
    }
    res.json(buildDays(rows));
  } catch (err) {
    console.error('trend error:', err);
    res.json(buildDays([])); // always return 30 days, never []
  }
});

router.post('/create-order', async (req, res) => {
  try {
    const { amount, customerName, customerPhone, customerEmail, purpose } = req.body;
    if (!amount || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Amount and phone required' });
    }

    const BASE = process.env.PAYYANTRA_BASE_URL || 'https://payin-api.payyantra.com';

    const tokenRes = await fetch(`${BASE}/api/auth/token`, {
      method: 'POST',
      headers: {
        'x-client-id': process.env.PAYYANTRA_CLIENT_ID,
        'x-client-secret': process.env.PAYYANTRA_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
    });

    const tokenText = await tokenRes.text();
    if (tokenRes.status !== 200) console.error('PayYantra token error:', tokenRes.status, tokenText.substring(0,200));

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch(e) {
      return res.status(500).json({ 
        success: false, 
        message: `PayYantra token API invalid response`,
        status: tokenRes.status,
        raw: tokenText.substring(0, 200)
      });
    }

    const token = tokenData.token || tokenData.data?.token 
                || tokenData.access_token || tokenData.data?.access_token;
    
    if (!token) {
      return res.status(500).json({ 
        success: false, 
        message: 'Token nahi mila', 
        raw: tokenData 
      });
    }
    const orderId     = `MG${Date.now()}`;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

    // Step 2: PayYantra pe order banao PEHLE
    const orderRes = await fetch(`${BASE}/api/v2/merchant/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: parseFloat(amount),
        customerName: customerName || 'Driver',
        customerPhone: customerPhone,
        customerEmail: customerEmail || 'driver@mobilitygrid.com',
        orderId: orderId,
        returnUrl: `https://mobilitygrid.in/driver?status=success&orderId=${orderId}`,
        notifyUrl: 'https://mg-qw5s.onrender.com/api/payment/webhook'
      })
    });
//linkbasedpayments-chat in notifications-
    const orderData = await orderRes.json();

    // Extract URLs from PayYantra response
    const checkoutUrl = orderData?.data?.checkoutUrl || orderData?.checkoutUrl;
    const upiQrLink   = orderData?.data?.upiQrLink   || orderData?.upiQrLink;

    // Extract UPI intent — PayYantra encodes it inside upiQrLink as ?intent=upi://...
    let intentURL = orderData?.data?.intentURL || orderData?.intentURL;
    if (!intentURL && upiQrLink) {
      try {
        const qrUrl = new URL(upiQrLink);
        const extracted = decodeURIComponent(qrUrl.searchParams.get('intent') || '');
        if (extracted.startsWith('upi://')) intentURL = extracted;
      } catch (_) {}
    }
    const pgTxnId = orderData?.data?.transactionId || orderData?.transactionId;

    if (!intentURL && !checkoutUrl && !upiQrLink) {
      console.error('PayYantra no URL — raw response:', JSON.stringify(orderData));
      return res.status(500).json({ success: false, message: 'PayYantra se koi URL nahi aaya' });
    }

    // ✅ Driver ka owner_code lookup karo taaki owner dashboard me dike
    let driverOwnerCode = null;
    let driverFullName = customerName || 'Driver';
    try {
      const dLookup = await pool.query(
        `SELECT d.full_name, o.owner_code
         FROM public.drivers d
         LEFT JOIN public.owners o ON o.id = d.owner_id
         WHERE d.mobile_number = $1 LIMIT 1`,
        [customerPhone]
      );
      if (dLookup.rows[0]) {
        driverOwnerCode = dLookup.rows[0].owner_code;
        driverFullName = dLookup.rows[0].full_name || customerName || 'Driver';
      }
    } catch (_) {}

    // ✅ DB mein save karo — owner_code bhi
    await pool.query(
      `INSERT INTO ms_orders 
        (order_id, order_number, order_amount, currency, payer_name, 
         payer_mobile, transaction_status, pg_transaction_id, order_initiation_date,
         purpose, payment_mode, owner_code, driver_full_name)
       VALUES ($1, $2, $3, 'INR', $4, $5, 'PENDING', $6, NOW(), $7, 'ONLINE', $8, $9)
       ON CONFLICT (order_id) DO NOTHING`,
      [orderId, orderNumber, parseFloat(amount), 
       driverFullName, customerPhone, pgTxnId || null, purpose || 'RENT',
       driverOwnerCode, driverFullName]
    );

    // intentURL is already correctly extracted above via decodeURIComponent(upiQrLink ?intent=)
    // DO NOT re-read from orderData here — it won't have it as a separate field
    res.json({
      success: true,
      checkoutUrl,
      intentURL,   // ← the properly extracted upi:// deep link
      upiQrLink,
      orderId,
      transactionId: pgTxnId,
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/my-ip', async (req, res) => {
  const r = await fetch('https://api.ipify.org?format=json');
  const d = await r.json();
  res.json({ server_ip: d.ip });
});
router.get('/owner/driver-statement', verifyToken, async (req, res) => {
  try {
    const { driverId } = req.query;
    // Verify driver belongs to this owner
    const ownerRes = await pool.query('SELECT owner_code FROM public.owners WHERE id=$1', [req.user.id]);
    if (!ownerRes.rows[0]) return res.status(403).json({ error: 'Not authorized' });
    const driver = await pool.query(
      `SELECT full_name, mobile_number FROM public.drivers WHERE id=$1 AND owner_code=$2`,
      [driverId, ownerRes.rows[0].owner_code]
    );
    if (!driver.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    
    const phone = driver.rows[0].mobile_number;

    // Transactions
    const txns = await pool.query(`
      SELECT 
        order_initiation_date as date,
        'Rent Payment' as type,
        order_amount as amount,
        COALESCE(payment_mode, 'UPI') as mode,
        transaction_status as status,
        order_number as reference
      FROM public.ms_orders 
      WHERE payer_mobile = $1
      ORDER BY order_initiation_date DESC
    `, [phone]);

    // Ledger entries
    const ledger = await pool.query(`
      SELECT 
        created_at as date,
        entry_type as type,
        amount,
        COALESCE(description, '') as description
      FROM public.driver_ledger
      WHERE driver_id = $1
      ORDER BY created_at DESC
    `, [driverId]);

    res.json({
      driver_name: driver.rows[0].full_name,
      transactions: txns.rows,
      ledger_entries: ledger.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/driver-details', async (req, res) => {

  try {

    const phone = req.query.phone;

    if (!phone) {

      return res.status(400).json({ message: 'Phone number is required' });

    }


    const result = await pool.query(

      `SELECT * FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,

      [phone]

    );


    if (result.rows.length === 0) {

      const newDriver = await pool.query(

        `INSERT INTO driver_details 
         (user_id, wallet_balance, daily_rent, amount_paid_today, battery_level, kms_driven, vehicle_number)
         VALUES (
           (SELECT id FROM users WHERE phone_number = $1 LIMIT 1), 
           0, 100, 0, 0, 0, 'Not Assigned'
         ) RETURNING *`,

        [phone]

      );

      return res.json(newDriver.rows[0]);

    }


    res.json(result.rows[0]);


  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Failed to fetch driver details' });

  }

});
// SOS ENDPOINT — owner ko notification bhejo
router.post('/driver/sos', async (req, res) => {
  try {
    const { phone, message } = req.body;

    const driver = await pool.query(
      `SELECT d.id, d.full_name, v.owner_id
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.mobile_number = $1`, [phone]
    );

    if (!driver.rows[0]) return res.status(404).json({ success: false });
    const d = driver.rows[0];

    // SOS DB mein save karo (owner_id via vehicles join)
    const ownerRes = await pool.query(
      `SELECT o.id FROM public.owners o
       JOIN public.drivers dr ON o.owner_code = dr.owner_code
       WHERE dr.id = $1 LIMIT 1`, [d.id]
    ).catch(() => ({ rows: [] }));
    const ownerId = ownerRes.rows[0]?.id || null;
    await pool.query(
      `INSERT INTO public.sos_alerts (driver_id, owner_id, status, message, created_at)
       VALUES ($1, $2, 'ACTIVE', $3, NOW())
       ON CONFLICT DO NOTHING`,
      [d.id, ownerId, message || 'SOS Alert!']
    ).catch(() =>
      // If status/message columns don't exist yet, insert minimal
      pool.query(
        `INSERT INTO public.sos_alerts (driver_id, owner_id, resolved_at, created_at)
         VALUES ($1, $2, NULL, NOW())`,
        [d.id, ownerId]
      )
    );

    // Owner ko notification bhejo
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'OWNER', '🚨 SOS ALERT', $2, NOW())`,
      [d.id, `${d.full_name} ne SOS bheja: "${message || 'Emergency!'}" — Phone: ${phone}`]
    ).catch(() => {});

    // Driver ko confirmation
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'DRIVER', '🚨 SOS Sent', 'Aapka SOS owner ko bhej diya gaya hai. Help aa rahi hai.', NOW())`,
      [d.id]
    ).catch(() => {});

    res.json({ success: true, message: 'SOS sent to owner!' });
  } catch(err) {
    console.error('SOS error:', err);
    res.status(500).json({ success: false });
  }
});

// CHAT — message bhejo
router.post('/chat/send', async (req, res) => {
  try {
    const { driverPhone, message, senderType, ownerId } = req.body;

    const driver = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    const driverId = driver.rows[0].id;

    let senderId, senderRole, recipientId, recipientRole;

    if (senderType === 'OWNER') {
      // Owner → Driver
      senderId     = parseInt(ownerId);
      senderRole   = 'OWNER';
      recipientId  = driverId;
      recipientRole = 'DRIVER';
    } else {
      // Driver → Owner: look up owner via driver's owner_code
      const ownerRes = await pool.query(
        `SELECT o.id FROM public.owners o
         JOIN public.drivers d ON o.owner_code = d.owner_code
         WHERE d.id = $1 LIMIT 1`,
        [driverId]
      );
      senderId      = driverId;
      senderRole    = 'DRIVER';
      if (!ownerRes.rows[0]) {
        return res.status(404).json({ error: 'Owner not found' });
      }
      recipientId   = ownerRes.rows[0].id;
      recipientRole = 'OWNER';
    }

    await pool.query(
      `INSERT INTO public.chat_messages (sender_id, sender_role, recipient_id, recipient_role, body)
       VALUES ($1, $2, $3, $4, $5)`,
      [senderId, senderRole, recipientId, recipientRole, message]
    );

    // Notification
    if (senderType === 'DRIVER') {
      const driverNameRes = await pool.query(
        'SELECT full_name FROM public.drivers WHERE id = $1', [driverId]
      );
      const driverName = driverNameRes.rows[0]?.full_name || 'Driver';
      const notifInsert = await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'OWNER', $2, $3, NOW()) RETURNING id`,
        [driverId, `💬 ${driverName}`, message.substring(0, 80)]
      );
      console.log('Owner notification inserted:', notifInsert.rows[0]?.id);
    } else {
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'DRIVER', '💬 Owner Message', $2, NOW())`,
        [driverId, `Owner: "${message.substring(0, 50)}"`]
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// CHAT — messages fetch karo
router.get('/chat/messages', async (req, res) => {
  try {
    const { driverPhone } = req.query;

    const driver = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.json([]);
    const driverId = driver.rows[0].id;

    const messages = await pool.query(
      `SELECT id,
              sender_role   AS sender_type,
              body          AS message,
              CASE WHEN read_at IS NOT NULL THEN true ELSE false END AS is_read,
              created_at
       FROM public.chat_messages
       WHERE (sender_id = $1 AND sender_role = 'DRIVER')
          OR (recipient_id = $1 AND recipient_role = 'DRIVER')
       ORDER BY created_at ASC
       LIMIT 100`,
      [driverId]
    );

    // Mark as read for the viewer
    await pool.query(
      `UPDATE public.chat_messages SET read_at = NOW()
       WHERE recipient_id = $1 AND recipient_role = 'DRIVER' AND read_at IS NULL`,
      [driverId]
    ).catch(() => {});

    res.json(messages.rows);
  } catch(err) {
    res.json([]);
  }
});

// CHAT — unread count
router.get('/chat/unread', async (req, res) => {
  try {
    const { driverPhone, viewerType } = req.query;
    const driver = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.json({ count: 0 });
    const driverId = driver.rows[0].id;

    // viewerType = 'DRIVER' or 'OWNER'
    const role = (viewerType || 'DRIVER').toUpperCase();
    const result = await pool.query(
      `SELECT COUNT(*) FROM public.chat_messages
       WHERE recipient_id = $1 AND recipient_role = $2 AND read_at IS NULL`,
      [driverId, role]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch(err) {
    res.json({ count: 0 });
  }
});

// WEBHOOK
router.post('/webhook', async (req, res) => {

  // PAY-03 security: HMAC-SHA256 signature verification
  if (!verifyWebhookSignature(req)) {
    console.error('❌ Webhook signature mismatch — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = req.body;
  console.log('Webhook received:', body?.data?.referenceId || body?.referenceId || 'unknown');

  try {

    const payload = body.data || body;     

    const orderId =
  payload.referenceId ||
  payload.merchantOrderId ||
  payload.orderId;

    let rawStatus = payload.transactionStatus || payload.status;    


    // STATUS MAPPER
    let status = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';

    if (status === 'INITIATED') status = 'PENDING';

    if (status === 'SUCCESSFUL') status = 'SUCCESS';


    if (!orderId) return res.status(400).json({ message: 'orderId missing' });


    const localOrder = await pool.query('SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1 LIMIT 1', [orderId]);


    if (localOrder.rows.length === 0) {

      return res.status(404).json({ message: 'Order not found' });

    }


    // In webhook - after successful payment
if (status === 'SUCCESS' && localOrder.rows[0].transaction_status !== 'SUCCESS') {
  const amount = parseFloat(localOrder.rows[0].order_amount || 0);
  const driverPhone = localOrder.rows[0].payer_mobile;
  const driverUser = await pool.query(
  'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
);
if (driverUser.rows.length === 0) {
  console.log('Driver not found for phone:', driverPhone);
} else {
  const driverUserId = driverUser.rows[0].id;    
    // Update drivers wallet
    await pool.query(
      `UPDATE public.drivers
       SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
           amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
           updated_at = NOW()
       WHERE mobile_number = (SELECT phone_number FROM users WHERE id = $2 LIMIT 1)`,
      [amount, driverUserId]
    );
    
    // Also update public.drivers table if exists
    await pool.query(
      `UPDATE public.drivers 
       SET wallet_balance = COALESCE(wallet_balance, 0) + $1
       WHERE mobile_number = $2`,
      [amount, driverPhone]
    ).catch(() => {});
    
    // ============================================
    // 2. SEND NOTIFICATION TO DRIVER
    // ============================================
    await pool.query(
  `INSERT INTO public.notifications (driver_id, user_type, title, message, metadata, created_at)
   VALUES ($1, 'DRIVER', '✅ Payment Successful', $3, $2, NOW())`,
  [driverUserId, JSON.stringify({ amount, status: 'SUCCESS', type: 'payment' }), `Your payment of ₹${amount} has been received successfully.`]
);
    
    console.log(`📢 Notification sent to DRIVER ${driverPhone}`);

    // ============================================
    // 3. GET OWNER AND SEND NOTIFICATION
    // ============================================
    // Find owner from vehicles table
    const ownerData = await pool.query(
      `SELECT v.owner_id 
       FROM public.vehicles v
       WHERE v.driver_phone = $1
       LIMIT 1`,
      [driverPhone]
    );
    
    if (ownerData.rows.length > 0) {
      const ownerId = ownerData.rows[0].owner_id;
      
      // ✅ FIXED — user_id nahi, driver_id use karo
await pool.query(
  `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
   SELECT d.id, 'OWNER', '💰 Rent Payment Received',
          d.full_name || ' ne ₹' || $1 || ' pay kiya', NOW()
   FROM public.drivers d WHERE d.mobile_number = $2`,
  [amount, driverPhone]
).catch(()=>{});
      
      console.log(`📢 Notification sent to OWNER ID: ${ownerId}`);
    } else {
      console.log(`⚠️ No owner found for driver ${driverPhone}`);
    }
  }
}


    const paymentMode = payload.paymentMode || payload.paymentMethod || payload.payment_mode || payload.method || null;


    await pool.query(

      `UPDATE ms_orders SET
        transaction_status = $1,
        transaction_status_code = $2,
        pg_transaction_id = COALESCE($3, pg_transaction_id),
        bank_reference_no = COALESCE($4, bank_reference_no),
        bank_utr_no = COALESCE($5, bank_utr_no),
        payment_mode = COALESCE($6, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $7`,

      [

        status,

        payload.statusCode || null,

        payload.transactionId || payload.transactionPublicId || null,

        payload.bankReferenceNo || payload.rrn || null, 

        payload.bankUTRNo || null,

        paymentMode,

        orderId

      ]

    );


    res.json({
  success: true,
  message: 'Webhook processed'
});

  } catch (err) {

    console.error('Webhook error:', err);

    res.status(500).json({ message: 'Webhook processing failed' });

  }

});


// MY TRANSACTIONS
// MY TRANSACTIONS - Updated version
router.get('/my-transactions', async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    const result = await pool.query(
      `SELECT 
         order_id,
         order_number,
         order_amount,
         order_initiation_date,
         order_completion_date,
         transaction_status,
         payment_mode,
         payer_name,
         COALESCE(order_completion_date, order_initiation_date) as display_date
       FROM ms_orders 
       WHERE payer_mobile = $1 
       ORDER BY order_initiation_date DESC`,
      [phone]
    );

    // Format for frontend compatibility
    const formatted = result.rows.map(row => ({
      pg_transaction_id: row.order_id,
      order_id: row.order_id,
      order_number: row.order_number,
      order_amount: parseFloat(row.order_amount),
      order_initiation_date: row.order_initiation_date,
      transaction_status: row.transaction_status,
      payment_mode: row.payment_mode,
      payer_name: row.payer_name,
      display_date: row.display_date
    }));

    console.log(`✅ Found ${formatted.length} transactions for ${phone}`);
    res.json(formatted);

  } catch (err) {
    console.error('My transactions error:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});
router.get('/driver/profile', verifyToken, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone required' });
    // Only allow driver to fetch their own profile (owners can fetch any of their drivers' profiles)
    if (req.user.role === 'DRIVER' && req.user.mobile_number && req.user.mobile_number !== phone)
      return res.status(403).json({ error: 'Not authorized' });

    const result = await pool.query(
  `SELECT
     d.id, d.full_name as name, d.mobile_number as phone,
     d.driver_code, d.wallet_balance, d.status, d.advance_balance,
     d.security_deposit, d.owner_code,
     v.id as vehicle_id, v.vehicle_number, v.vehicle_model, v.vehicle_type,
     v.daily_rent as vehicle_daily_rent, v.status as vehicle_status,
     COALESCE(
       (SELECT assigned_at FROM public.driver_vehicle_history dvh
        WHERE dvh.driver_id = d.id AND dvh.unassigned_at IS NULL
        ORDER BY dvh.assigned_at DESC LIMIT 1),
       v.created_at
     ) as assigned_since,
     o.full_name as owner_name,
     COALESCE(c.name, '') as company_name,
     COALESCE(c.city, '') as company_city
   FROM public.drivers d
   LEFT JOIN public.vehicles v ON v.driver_id = d.id
   LEFT JOIN public.owners o ON o.owner_code = d.owner_code
   LEFT JOIN public.companies c ON c.id = o.company_id
   WHERE d.mobile_number = $1`,
  [phone]
);
    if (!result.rows[0]) return res.status(404).json({ message: 'Driver not found' });
    const p = result.rows[0];
    // Inside /driver/profile after fetching driver details (p)
let total_outstanding = 0;
let amount_paid_today = 0;
let dailyDepositRecovery = 0;
let effectiveDailyCharge = 0;

if (p.vehicle_number && p.vehicle_daily_rent) {
  const dailyRent = parseFloat(p.vehicle_daily_rent);
  const securityDeposit = parseFloat(p.security_deposit || 0);
  dailyDepositRecovery = securityDeposit > 0 ? Math.round(securityDeposit/100) : 0;
  effectiveDailyCharge = dailyRent + dailyDepositRecovery;

  // Today's paid amount (for display)
  const todayPaidRes = await pool.query(
    `SELECT COALESCE(SUM(order_amount),0) as total 
     FROM public.ms_orders
     WHERE payer_mobile=$1 
       AND transaction_status='SUCCESS' 
       AND DATE(order_completion_date)=CURRENT_DATE`,
    [phone]
  );
  amount_paid_today = parseFloat(todayPaidRes.rows[0].total);

  // ---- NEW: Compute cumulative outstanding from ledger ----
  const ledgerBal = await pool.query(
    `SELECT 
       COALESCE(SUM(CASE 
         WHEN entry_type IN ('RENT_CHARGE','DAMAGE_CHARGE','PENALTY','DEPOSIT_CHARGE') 
         THEN amount ELSE 0 END), 0) AS total_charged,
       COALESCE(SUM(CASE 
         WHEN entry_type IN ('CASH_PAYMENT','UPI_PAYMENT','ADVANCE_CREDIT','REPAIR_CREDIT','REFUND') 
         THEN amount ELSE 0 END), 0) AS total_paid
     FROM public.driver_ledger
     WHERE driver_id = $1`,
    [p.id]
  );
  const charged = parseFloat(ledgerBal.rows[0]?.total_charged || 0);
  const paid = parseFloat(ledgerBal.rows[0]?.total_paid || 0);
  total_outstanding = Math.max(0, charged - paid);
}
res.json({
  ...p,
  amount_paid_today,
  total_outstanding,          // now cumulative
  current_dues: total_outstanding, // also cumulative
  daily_deposit_recovery: dailyDepositRecovery,
  effective_daily_charge: effectiveDailyCharge
});

  } catch (err) {
    console.error('Driver profile error:', err);
    res.status(500).json({ message: 'Failed' });
  }
});
router.get('/owner/sos-alerts', verifyToken, requirePermission('sos_alerts'), async (req, res) => {
  try {
    const { ownerId } = req.query;
    const result = await pool.query(
      `SELECT s.id, s.driver_id, s.lat, s.lng, s.created_at,
              COALESCE(s.message, 'SOS Alert!') AS message,
              d.full_name, d.mobile_number
       FROM public.sos_alerts s
       JOIN public.drivers d ON d.id = s.driver_id
       WHERE s.resolved_at IS NULL
       AND (s.status IS NULL OR s.status = 'ACTIVE')
       AND d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
       ORDER BY s.created_at DESC LIMIT 5`,
      [ownerId]
    );
    res.json(result.rows);
  } catch(err) { res.json([]); }
});

router.put('/owner/sos-dismiss/:id', verifyToken, async (req, res) => {
  try {
    // Verify the SOS alert belongs to this owner's driver
    const check = await pool.query(
      `SELECT sa.id FROM public.sos_alerts sa
       JOIN public.drivers d ON d.id = sa.driver_id
       JOIN public.owners o ON o.owner_code = d.owner_code
       WHERE sa.id=$1 AND o.id=$2`,
      [req.params.id, req.user.id]
    );
    if (!check.rows[0]) return res.status(403).json({ error: 'Not authorized' });
    await pool.query(
      `UPDATE public.sos_alerts SET resolved_at = NOW(), status = 'DISMISSED' WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
router.get('/owner/notifications', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    // Owner-targeted notifications only (driver rent reminders excluded)
    const notifResult = await pool.query(
      `SELECT n.id, n.driver_id, n.title, n.message, n.is_read,
              n.created_at, n.metadata, d.full_name as driver_name
       FROM public.notifications n
       LEFT JOIN public.drivers d ON d.id = n.driver_id
       WHERE n.user_type = 'OWNER' 
AND n.driver_id IN (
  SELECT id FROM public.drivers 
  WHERE owner_code = (
    SELECT owner_code FROM public.owners WHERE id = $1
  )
)
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [ownerId]
    );
    
    res.json(notifResult.rows);
  } catch (err) {
    console.error('Owner notifications error:', err);
    res.json([]);
  }
});
router.post('/owner/bulk-upload-vehicles', verifyToken, async (req, res) => {
  try {
    const { vehicles, ownerId } = req.body;
    if (!vehicles?.length) return res.status(400).json({ success: false, message: 'No data' });

    const results = { success: [], failed: [] };

    for (const v of vehicles) {
      try {
        const num = (v.vehicle_number || '').trim().toUpperCase();
        if (!num) { results.failed.push({ num, reason: 'Vehicle number missing' }); continue; }
        if (!v.vehicle_model) { results.failed.push({ num, reason: 'Model missing' }); continue; }

        const existing = await pool.query(
          'SELECT id FROM public.vehicles WHERE vehicle_number = $1', [num]
        );
        if (existing.rows.length > 0) {
          results.failed.push({ num, reason: `${num} already exists` }); continue;
        }

        await pool.query(
          `INSERT INTO public.vehicles 
            (vehicle_number, vehicle_model, vehicle_type, daily_rent, owner_id, status,
             insurance_expiry, fitness_expiry, chassis_number, created_at)
           VALUES ($1,$2,$3,$4,$5,'AVAILABLE',$6,$7,$8,NOW())`,
          [
            num,
            v.vehicle_model.trim(),
            v.vehicle_type || 'TRUCK',
            parseFloat(v.daily_rent) || 850,
            parseInt(ownerId) || 1,
            parseDate(v.insurance_expiry),
            parseDate(v.fitness_expiry),
            v.chassis_number || null
          ]
        );
        results.success.push(num);
      } catch(err) {
        results.failed.push({ num: v.vehicle_number, reason: err.message });
      }
    }

    res.json({ success: true, imported: results.success.length, failed: results.failed.length, failures: results.failed });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/owner/bulk-upload', verifyToken, async (req, res) => {
  try {
    const { drivers, ownerId, ownerCode } = req.body;
    if (!drivers?.length) return res.status(400).json({ success: false, message: 'No data' });

    // ✅ ownerCode DB se fetch karo agar direct nahi aaya
    let finalOwnerCode = ownerCode;
    if (!finalOwnerCode && ownerId) {
      const ownerRes = await pool.query(
        `SELECT owner_code FROM public.owners WHERE id = $1`, [parseInt(ownerId)]
      );
      finalOwnerCode = ownerRes.rows[0]?.owner_code;
    }
    if (!finalOwnerCode) return res.status(400).json({ success: false, message: 'Owner not found' });

    const results = { success: [], failed: [] };

    for (const driver of drivers) {
      try {
        const phone = String(driver.mobile_number || '').replace(/\s/g, '').trim();
        const name = (driver.full_name || '').trim();

        if (!name) { results.failed.push({ name, reason: 'Name missing' }); continue; }
        if (/[0-9]/.test(name)) { results.failed.push({ name, reason: 'Name mein numbers' }); continue; }
        if (!/^\d{10}$/.test(phone)) { results.failed.push({ name, reason: `${phone} — invalid phone` }); continue; }

        const existing = await pool.query(
          'SELECT id FROM public.drivers WHERE mobile_number = $1', [phone]
        );
        if (existing.rows.length > 0) {
          results.failed.push({ name, reason: `${phone} already exists` }); continue;
        }
        const driverCode = 'DRV' + Date.now().toString().slice(-5) + Math.random().toString(36).substr(2,3).toUpperCase();

        await pool.query(
          `INSERT INTO public.drivers 
            (full_name, mobile_number, owner_code, driver_code, wallet_balance, status,
             date_of_birth, emergency_contact_name, emergency_contact_number,
             driving_license_number, driving_license_expiry, security_deposit)
           VALUES ($1,$2,$3,$4,0,'ACTIVE',$5,$6,$7,$8,$9,$10)`,
          [
            name, phone, finalOwnerCode, driverCode,
            parseDate(driver.date_of_birth),
            driver.emergency_contact_name || null,
            driver.emergency_contact_number || null,
            driver.driving_license_number || null,
            parseDate(driver.driving_license_expiry),
            parseFloat(driver.security_deposit) || 0
          ]
        );
        results.success.push(name);
      } catch(err) {
        results.failed.push({ name: driver.full_name, reason: err.message });
      }
    }

    res.json({ 
      success: true, 
      imported: results.success.length, 
      failed: results.failed.length, 
      failures: results.failed 
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// MARK notifications as read
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const { driverId, ownerId } = req.query;
    
    if (driverId) {
      await pool.query(
        'UPDATE public.notifications SET is_read = TRUE WHERE driver_id = $1',
        [driverId]
      );
    } else if (ownerId) {
      await pool.query(
        'UPDATE public.notifications SET is_read = TRUE WHERE user_type = $1 AND (owner_id = $2 OR driver_id = $3)',
        ['OWNER', ownerId, null]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false });
  }
});

// CHECK PENDING (Inquiry API) 
router.post('/check-pending', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {

    const pending = await pool.query("SELECT * FROM ms_orders WHERE transaction_status = 'PENDING'");


    if (pending.rows.length === 0) {

      return res.json({ message: 'No pending orders' });

    }


    const token = await getToken();

    const updated = [];


    for (const order of pending.rows) {

      try {

        const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${order.order_id}`, {

          headers: { 'Authorization': `Bearer ${token}` }

        });

        const data = await statusRes.json();        

        let rawStatus = data.transactionStatus || data.status;        


        // STATUS MAPPER
        let newStatus = rawStatus ? String(rawStatus).toUpperCase() : null;

        if (newStatus === 'INITIATED') newStatus = 'PENDING';

        if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';


        if (newStatus && newStatus !== 'PENDING') {

          const amount = parseFloat(order.order_amount);


          if (newStatus === 'SUCCESS') {

            await pool.query(

              `UPDATE public.drivers
               SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
                   amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
                   updated_at = NOW()
               WHERE mobile_number = $2`,

              [amount, order.payer_mobile]

            );

          }

          

          const paymentMode = data.paymentMode || data.paymentMethod || data.payment_mode || data.method || null;


          await pool.query(

            `UPDATE ms_orders SET 
              transaction_status = $1,
              pg_transaction_id = COALESCE($2, pg_transaction_id),
              bank_reference_no = COALESCE($3, bank_reference_no),
              bank_utr_no = COALESCE($4, bank_utr_no),
              payment_mode = COALESCE($5, payment_mode),
              order_completion_date = NOW()
             WHERE order_id = $6`,

            [

              newStatus, 

              data.transactionId || data.transactionPublicId || null, 

              data.bankReferenceNo || data.rrn || null, 

              data.bankUTRNo || null, 

              paymentMode, 

              order.order_id

            ]

          );

          updated.push(order.order_number);

        }

      } catch (err) {

        console.error(`Inquiry failed for ${order.order_id}:`, err.message);

      }

    }


    res.json({ message: 'Inquiry complete', updated: updated.length });


  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Inquiry failed' });

  }

});


// SINGLE ORDER STATUS (Frontend ke liye)
router.get('/order/:orderId', async (req, res) => {
  try {
    // Frontend se 'ORD-xxx' aayega
    const { orderId } = req.params;
    
    // BINGO FIX: Yahan 'order_number' column use karna hai, 'order_id' nahi!
    const order = await pool.query(
      `SELECT * FROM ms_orders WHERE order_number = $1`, 
      [orderId]
    );
    
    // Agar Webhook slow hai ya DB me record nahi hai
    if (order.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order strictly not found in ms_orders' });
    }
    
    // Frontend ko 100% Real DB Data bhej do
    res.json({ success: true, data: order.rows[0] });
  } catch (err) {
    console.error('DB Fetch Error:', err.message);
    res.status(500).json({ success: false, message: `DB Crash: ${err.message}` });
  }
});


// INQUIRY BY PAYYANTRA ORDER ID 
router.get('/inquiry-by-order/:payyantraOrderId', async (req, res) => {

  const { payyantraOrderId } = req.params;

  console.log('🔍 Inquiry requested for PayYantra Order ID:', payyantraOrderId);


  try {

    const token = await getToken();

    const pyRes = await fetch(`${BASE_URL}/api/pay/status/${payyantraOrderId}`, {

      headers: { 'Authorization': `Bearer ${token}` },

    });


    const rawData = await pyRes.json();

    const pyData = rawData.data || {}; 


    // STATUS MAPPER
    let rawStatus = pyData.status ? String(pyData.status).toUpperCase() : 'PENDING';

    let pyStatus = rawStatus;

    if (rawStatus === 'INITIATED') pyStatus = 'PENDING';

    if (rawStatus === 'SUCCESSFUL') pyStatus = 'SUCCESS';


    const localOrderId = pyData.referenceId;

    const amount = parseFloat(pyData.amount || 0);


    if (!localOrderId) {

      return res.status(404).json({ 

        success: false, 

        message: 'PayYantra order found, but referenceId is missing in their response.' 

      });

    }


    const localOrderResult = await pool.query(

      'SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1', 

      [localOrderId]

    );


    if (localOrderResult.rows.length === 0) {

      return res.status(404).json({ success: false, message: 'Order not found in local DB' });

    }


    const currentLocalStatus = localOrderResult.rows[0].transaction_status;


    if (pyStatus === 'SUCCESS' && currentLocalStatus !== 'SUCCESS') {

      await pool.query(

        `UPDATE public.drivers
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
             amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
             updated_at = NOW()
         WHERE mobile_number = $2`,

        [amount, localOrderResult.rows[0].payer_mobile]

      );

      console.log(`💰 Wallet Automatically Updated via Inquiry API for ${localOrderResult.rows[0].payer_mobile}`);

    }


    const paymentMode = pyData.paymentMode || pyData.paymentMethod || pyData.payment_mode || pyData.method || null;


    await pool.query(

      `UPDATE ms_orders SET 
        transaction_status = $1,
        pg_transaction_id = COALESCE($2, pg_transaction_id),
        bank_reference_no = COALESCE($3, bank_reference_no),
        bank_utr_no = COALESCE($4, bank_utr_no),
        payment_mode = COALESCE($5, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $6`,

      [

        pyStatus,

        pyData.transactionPublicId || pyData.transactionId || null,

        pyData.rrn || pyData.bankReferenceNo || null,

        pyData.bankUTRNo || null,

        paymentMode,

        localOrderId

      ]

    );


    res.json({

      success: true,

      status: pyStatus,

      amount: amount,

      orderId: localOrderId,

      payyantraOrderId: payyantraOrderId,

      pyData: pyData

    });


  } catch (err) {

    console.error('❌ Inquiry API Error:', err.message);

    res.status(500).json({ success: false, message: 'Inquiry processing failed', error: err.message });

  }

});


// VERIFY SINGLE ORDER BY REFERENCE (our internal MG... order_id → PayYantra by-reference endpoint)
router.get('/verify-by-reference/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;
  console.log('🔍 Verify by reference for order:', orderId);
  try {
    const localOrderResult = await pool.query(
      'SELECT * FROM ms_orders WHERE order_id = $1 LIMIT 1', [orderId]
    );
    if (localOrderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found in DB' });
    }
    const order = localOrderResult.rows[0];
    const token = await getToken();
    const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await statusRes.json();
    let rawStatus = data.transactionStatus || data.status;
    let newStatus = rawStatus ? String(rawStatus).toUpperCase() : null;
    if (newStatus === 'INITIATED') newStatus = 'PENDING';
    if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';
    const paymentMode = data.paymentMode || data.paymentMethod || data.payment_mode || data.method || null;
    const amount = parseFloat(order.order_amount || 0);
    if (newStatus === 'SUCCESS' && order.transaction_status !== 'SUCCESS') {
      await pool.query(
        `UPDATE public.drivers
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
             amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
             updated_at = NOW()
         WHERE mobile_number = $2`,
        [amount, order.payer_mobile]
      );
      console.log(`💰 Wallet credited ₹${amount} for ${order.payer_mobile} via verify-by-reference`);
    }
    await pool.query(
      `UPDATE ms_orders SET 
        transaction_status = COALESCE($1, transaction_status),
        pg_transaction_id = COALESCE($2, pg_transaction_id),
        bank_reference_no = COALESCE($3, bank_reference_no),
        bank_utr_no = COALESCE($4, bank_utr_no),
        payment_mode = COALESCE($5, payment_mode),
        order_completion_date = CASE WHEN $1 = 'SUCCESS' THEN NOW() ELSE order_completion_date END
       WHERE order_id = $6`,
      [newStatus, data.transactionId || data.transactionPublicId || null,
       data.bankReferenceNo || data.rrn || null, data.bankUTRNo || null,
       paymentMode, orderId]
    );
    res.json({
      success: true,
      orderId,
      previousStatus: order.transaction_status,
      newStatus: newStatus || order.transaction_status,
      walletCredited: newStatus === 'SUCCESS' && order.transaction_status !== 'SUCCESS',
      amount: order.order_amount,
      payyantraRaw: data
    });
  } catch (err) {
    console.error('❌ Verify by reference error:', err.message);
    res.status(500).json({ success: false, message: 'Verification failed', error: err.message });
  }
});


// SYNC ALL MISSING DATA (One-Time Backfill)
router.post('/sync-all-orders', verifyToken, async (req, res) => {

  console.log('Starting full sync for missing payment modes...');

  try {

    const missingData = await pool.query("SELECT * FROM ms_orders WHERE payment_mode IS NULL OR payment_mode = ''");


    if (missingData.rows.length === 0) {

      return res.json({ message: 'All orders are already updated! No missing data found.' });

    }


    const token = await getToken();

    const updated = [];


    for (const order of missingData.rows) {

      try {

        const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${order.order_id}`, {

          headers: { 'Authorization': `Bearer ${token}` }

        });

        const data = await statusRes.json();        

        let rawStatus = data.transactionStatus || data.status;        

        // STATUS MAPPER
        let newStatus = rawStatus ? String(rawStatus).toUpperCase() : null;

        if (newStatus === 'INITIATED') newStatus = 'PENDING';

        if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';


        const paymentMode = data.paymentMode || data.paymentMethod || data.payment_mode || data.method || null;


        if (paymentMode || newStatus) {

          await pool.query(

            `UPDATE ms_orders SET 
              transaction_status = COALESCE($1, transaction_status),
              pg_transaction_id = COALESCE($2, pg_transaction_id),
              bank_reference_no = COALESCE($3, bank_reference_no),
              bank_utr_no = COALESCE($4, bank_utr_no),
              payment_mode = COALESCE($5, payment_mode)
             WHERE order_id = $6`,

            [

              newStatus, 

              data.transactionId || data.transactionPublicId || null, 

              data.bankReferenceNo || data.rrn || null, 

              data.bankUTRNo || null, 

              paymentMode, 

              order.order_id

            ]

          );

          updated.push(order.order_number);

        }

      } catch (err) {

        console.error(`Sync failed for ${order.order_id}:`, err.message);

      }

    }

    res.json({ message: 'Sync complete', updatedCount: updated.length, updatedOrders: updated });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: 'Sync failed' });

  }

});
// ── DRIVER LOGIN: List all active drivers ──
router.get('/drivers-list', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number, d.driver_code,
              COALESCE(v.vehicle_number, 'Not Assigned') as vehicle
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.status = 'ACTIVE'
       ORDER BY d.full_name`
    );
    res.json({ success: true, drivers: result.rows });
  } catch (err) { res.json({ success: true, drivers: [] }); }
});

// ── DRIVER OTP REQUEST ──
router.post('/driver-otp-request', async (req, res) => {
  try {
    const { phone } = req.body;
    const driver = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code
       FROM public.drivers WHERE mobile_number = $1 AND status = 'ACTIVE'`,
      [phone]
    );
    if (driver.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, message: 'OTP sent', name: driver.rows[0].full_name });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// ── DRIVER OTP VERIFY ──
router.post('/driver-otp-verify', async (req, res) => {
  return res.status(503).json({ success: false, message: 'OTP login not yet available — use PIN login' });
});
router.get('/driver/notifications', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json([]);
    const result = await pool.query(
      `SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.metadata
       FROM public.notifications n
       JOIN public.drivers d ON d.id = n.driver_id
       WHERE d.mobile_number = $1
       AND n.user_type = 'DRIVER'  -- ✅ SIRF DRIVER notifications
       ORDER BY n.created_at DESC LIMIT 50`,
      [phone]
    );
    res.json(result.rows);
  } catch (err) { res.json([]); }
});
// ─── DAILY RENT SCHEDULER ────────────────────────────────────
const generateDailyRentEntries = async () => {
  try {
    console.log('🔄 Generating daily rent entries...');
    
    const drivers = await pool.query(`
      SELECT d.id, d.full_name, v.daily_rent, v.vehicle_number
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.status = 'ACTIVE' AND v.status = 'ASSIGNED'
    `);

    let count = 0;
    for (const driver of drivers.rows) {
      const existing = await pool.query(`
        SELECT id FROM public.driver_ledger
        WHERE driver_id = $1 
        AND entry_type = 'RENT_CHARGE'
        AND DATE(created_at) = CURRENT_DATE
      `, [driver.id]);

      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO public.driver_ledger 
            (driver_id, entry_type, amount, description, created_by)
          VALUES ($1, 'RENT_CHARGE', $2, $3, 'SYSTEM')
        `, [
          driver.id,
          parseFloat(driver.daily_rent),
          `Daily rent - ${driver.vehicle_number} - ${new Date().toLocaleDateString('en-IN')}`
        ]);
        count++;
      }
    }

    console.log(`✅ Daily rent generated for ${count} drivers`);
  } catch(err) {
    console.error('Daily rent error:', err.message);
  }
};
const cron = require('node-cron');

// Schedule daily rent generation at 00:00 (midnight) every day
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Running daily rent generation...');
  try {
    await generateDailyRentEntries();
    console.log('✅ Daily rent generation completed.');
  } catch (err) {
    console.error('❌ Cron rent generation error:', err.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // adjust to your timezone
});
// Manual trigger for testing
router.post('/admin/generate-daily-rent', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  await generateDailyRentEntries();
  res.json({ success: true, message: 'Done!' });
});
// ─── PER-DRIVER INCENTIVE RULE ───────────────────────────────────────
router.post('/owner/driver-incentive-rule', verifyToken, async (req, res) => {
  try {
    const { driverId, ruleIndex } = req.body;
    // Verify the driver belongs to the requesting owner
    const ownerCodeRes = await pool.query(
      `SELECT owner_code FROM public.owners WHERE id = $1`, [req.user.id]
    );
    if (ownerCodeRes.rows.length === 0) {
      return res.status(403).json({ error: 'Owner not found' });
    }
    const ownerCode = ownerCodeRes.rows[0].owner_code;
    const driverCheck = await pool.query(
      `SELECT id FROM public.drivers WHERE id = $1 AND owner_code = $2`,
      [driverId, ownerCode]
    );
    if (driverCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Driver does not belong to this owner' });
    }
    await pool.query(
      `UPDATE public.drivers SET incentive_rule_index = $1 WHERE id = $2`,
      [ruleIndex, driverId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── DRIVER ATTENDANCE (from vehicle assignment history) ─────────────────────
// Driver's own monthly attendance
router.get('/driver/my-attendance', verifyToken, async (req, res) => {
  try {
    const { phone, month } = req.query; // month = 'YYYY-MM'
    const dr = await pool.query(`SELECT id FROM public.drivers WHERE mobile_number = $1`, [phone]);
    if (!dr.rows[0]) return res.json({ success: false });
    const driverId = dr.rows[0].id;

    const target = month || new Date().toISOString().slice(0, 7);
    const monthStart = new Date(`${target}-01T00:00:00Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const daysInMonth = new Date(monthEnd - 1).getDate();

    // Get vehicle assignment date — prefer driver_vehicle_history, fall back to vehicles.created_at
    // (history table may be empty if vehicle was assigned directly in DB without going through API)
    const assignRes = await pool.query(
      `SELECT COALESCE(
         (SELECT dvh.assigned_at FROM public.driver_vehicle_history dvh
          WHERE dvh.driver_id = $1 AND dvh.unassigned_at IS NULL
          ORDER BY dvh.assigned_at DESC LIMIT 1),
         v.created_at
       ) AS assigned_at
       FROM public.vehicles v
       WHERE v.driver_id = $1
       LIMIT 1`,
      [driverId]
    );
    const assignedAt = assignRes.rows[0]?.assigned_at ? new Date(assignRes.rows[0].assigned_at) : null;

    // Effective start = max(monthStart, assignedAt) — only count days since assignment
    const effectiveStart = assignedAt && assignedAt > monthStart ? assignedAt : monthStart;

    // UNION: driver_activity (ping-based, has historical data) + driver_daily_log (login-based)
    const effectiveStartDate = effectiveStart.toISOString().slice(0, 10);
    const logs = await pool.query(
      `SELECT EXTRACT(DAY FROM activity_date)::INTEGER as day, activity_date::date as log_date
       FROM public.driver_activity
       WHERE driver_id = $1
         AND activity_date >= $3::date
         AND DATE_TRUNC('month', activity_date) = $2::date
       UNION
       SELECT EXTRACT(DAY FROM log_date)::INTEGER as day, log_date
       FROM public.driver_daily_log
       WHERE driver_id = $1
         AND log_date >= $3::date
         AND DATE_TRUNC('month', log_date) = $2::date
       ORDER BY log_date`,
      [driverId, target + '-01', effectiveStartDate]
    );

    const presentDays = new Set(logs.rows.map(r => Number(r.day)));
    const today = new Date();
    const isCurrentMonth = target === today.toISOString().slice(0, 7);
    // daysElapsed counts from effectiveStart, not month start
    let daysElapsed;
    if (isCurrentMonth) {
      daysElapsed = Math.floor((today - effectiveStart) / 86400000) + 1;
      daysElapsed = Math.max(1, Math.min(daysElapsed, today.getDate()));
    } else {
      daysElapsed = daysInMonth;
    }

    res.json({
      success: true,
      month: target,
      daysInMonth,
      daysElapsed,
      assignedFrom: assignedAt ? assignedAt.toISOString().slice(0, 10) : null,
      daysPresent: presentDays.size,
      attendancePct: daysElapsed > 0 ? Math.round((presentDays.size / daysElapsed) * 100) : 0,
      todayPresent: isCurrentMonth && presentDays.has(today.getDate()),
      logs: Array.from(presentDays).sort((a, b) => a - b).map(day => ({ day, minutes: 0 }))
    });
  } catch (err) {
    console.error('Driver attendance error:', err);
    res.status(500).json({ success: false });
  }
});

router.get('/owner/attendance', async (req, res) => {
  try {
    const { ownerId, month } = req.query;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    // Default to current month if not specified
    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, mon] = targetMonth.split('-').map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd   = new Date(year, mon, 0, 23, 59, 59); // last day of month
    const daysInMonth = monthEnd.getDate();

    // Get owner_code
    const ownerRes = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id=$1', [parseInt(ownerId)]
    );
    if (!ownerRes.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    const ownerCode = ownerRes.rows[0].owner_code;

    // Get all drivers for this owner (owner_code OR owner_id match)
    const ownerIdRes = await pool.query('SELECT id FROM public.owners WHERE owner_code=$1 LIMIT 1', [ownerCode]);
    const ownerIdVal = ownerIdRes.rows[0]?.id || null;
    const driversRes = await pool.query(
  `SELECT id, full_name, driver_code
   FROM public.drivers
   WHERE (owner_code=$1 OR (owner_id IS NOT NULL AND owner_id=$2))
     AND deleted_at IS NULL
   ORDER BY full_name`,
  [ownerCode, ownerIdVal]
);

    const driverIds = driversRes.rows.map(d => d.id);
    if (driverIds.length === 0) return res.json({ month: targetMonth, daysInMonth, drivers: [] });

    const today = new Date();
    const isCurrentMonth = targetMonth === today.toISOString().slice(0, 7);

    // Get actual present days from driver_activity (ping-based) OR driver_daily_log (login-based)
    const logsRes = await pool.query(
      `SELECT driver_id, EXTRACT(DAY FROM activity_date)::INTEGER as day
       FROM public.driver_activity
       WHERE driver_id = ANY($1::int[])
         AND DATE_TRUNC('month', activity_date) = $2::date
       UNION
       SELECT driver_id, EXTRACT(DAY FROM log_date)::INTEGER as day
       FROM public.driver_daily_log
       WHERE driver_id = ANY($1::int[])
         AND DATE_TRUNC('month', log_date) = $2::date`,
      [driverIds, targetMonth + '-01']
    );

    // Get assignment dates: prefer driver_vehicle_history, fall back to vehicles.created_at
    // This handles cases where vehicle was assigned without creating a history record
    const asgnRes = await pool.query(
      `SELECT v.driver_id,
              COALESCE(
                (SELECT dvh.assigned_at FROM public.driver_vehicle_history dvh
                 WHERE dvh.driver_id = v.driver_id AND dvh.unassigned_at IS NULL
                 ORDER BY dvh.assigned_at DESC LIMIT 1),
                v.created_at
              ) AS assigned_at
       FROM public.vehicles v
       WHERE v.driver_id = ANY($1::int[])`,
      [driverIds]
    );
    const asgnMap = {};
    asgnRes.rows.forEach(r => { asgnMap[r.driver_id] = new Date(r.assigned_at); });

    const attendanceMap = {};
    driversRes.rows.forEach(d => {
      attendanceMap[d.id] = { driverId: d.id, name: d.full_name, code: d.driver_code, presentDays: new Set() };
    });
    logsRes.rows.forEach(l => {
      if (attendanceMap[l.driver_id]) attendanceMap[l.driver_id].presentDays.add(l.day);
    });

    const drivers = Object.values(attendanceMap).map(d => {
      const assignedAt = asgnMap[d.driverId];
      // No vehicle assignment → skip (eligibleDays = 0, no attendance to track)
      if (!assignedAt) {
        return {
          driverId: d.driverId, name: d.name, code: d.code,
          presentDays: [], totalPresent: 0, totalAbsent: 0,
          eligibleDays: 0, firstAssignedDay: null, attendancePct: 0,
          noVehicle: true,
        };
      }
      const effectiveStart = assignedAt > monthStart ? assignedAt : monthStart;
      const firstDay = effectiveStart.getDate();
      const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
      const eligibleDays = Math.max(1, lastDay - firstDay + 1);
      return {
        driverId: d.driverId, name: d.name, code: d.code,
        presentDays: Array.from(d.presentDays).sort((a, b) => a - b),
        totalPresent: d.presentDays.size,
        totalAbsent: Math.max(0, eligibleDays - d.presentDays.size),
        eligibleDays,
        firstAssignedDay: firstDay,
        attendancePct: Math.min(100, Math.round((d.presentDays.size / eligibleDays) * 100)),
      };
    });

    res.json({ month: targetMonth, daysInMonth, drivers });

  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// ─── PREMIUM PLAN CHECK ──────────────────────────────────────────────────────
const isPremium = async (ownerId) => {
  const r = await pool.query(
    `SELECT plan, plan_expires_at FROM public.owners WHERE id=$1`, [ownerId]
  );
  const o = r.rows[0];
  if (!o) return false;
  if (o.plan === 'PREMIUM') {
    if (!o.plan_expires_at || new Date(o.plan_expires_at) > new Date()) return true;
    // Expired — downgrade
    await pool.query(`UPDATE public.owners SET plan='FREE' WHERE id=$1`, [ownerId]);
  }
  return false;
};

// ─── MANAGERS ────────────────────────────────────────────────────────────────

// Get managers list
router.get('/owner/managers', verifyToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!await isPremium(ownerId)) {
      return res.status(403).json({ error: 'PREMIUM_REQUIRED' });
    }
    const r = await pool.query(
      `SELECT * FROM public.managers WHERE owner_id=$1 AND status='ACTIVE' ORDER BY created_at DESC`,
      [ownerId]
    );
    res.json({ success: true, managers: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add manager
router.post('/owner/managers/add', verifyToken, async (req, res) => {
  try {
    const { fullName, mobileNumber, permissions } = req.body;
    const ownerId = req.user.id;
    if (!await isPremium(ownerId)) {
      return res.status(403).json({ error: 'PREMIUM_REQUIRED' });
    }
    // Check if mobile already a manager
    const exists = await pool.query(
      `SELECT id FROM public.managers WHERE mobile_number=$1 AND status='ACTIVE'`, [mobileNumber]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'This number is already a manager' });
    }
    const code = 'MGR' + Math.random().toString(36).substr(2,6).toUpperCase();
    const r = await pool.query(
      `INSERT INTO public.managers (owner_id, full_name, mobile_number, manager_code, permissions)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [ownerId, fullName, mobileNumber, code, JSON.stringify(permissions || {})]
    );
    // Notify manager
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message)
       SELECT id, 'DRIVER', '🎉 Manager Access', 'You have been added as a manager. Login with your phone number.'
       FROM public.drivers WHERE mobile_number=$1`,
      [mobileNumber]
    ).catch(() => {});
    // ADM-06: Audit log
    logAudit('MANAGER_CREATED', 'manager', r.rows[0]?.id, 'owner:' + ownerId, { full_name: fullName, mobile_number: mobileNumber, manager_code: code });
    res.json({ success: true, manager: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update manager permissions
router.put('/owner/managers/:managerId/permissions', verifyToken, async (req, res) => {
  try {
    const { permissions } = req.body;
    const ownerId = req.user.id;
    if (!await isPremium(ownerId)) {
      return res.status(403).json({ error: 'PREMIUM_REQUIRED' });
    }
    await pool.query(
      `UPDATE public.managers SET permissions=$1 WHERE id=$2 AND owner_id=$3`,
      [JSON.stringify(permissions), req.params.managerId, ownerId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove manager
router.delete('/owner/managers/:managerId', verifyToken, async (req, res) => {
  try {
    const ownerId = req.user.id;
    await pool.query(
      `UPDATE public.managers SET status='REMOVED' WHERE id=$1 AND owner_id=$2`,
      [req.params.managerId, ownerId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Driver attendance for a given month
router.get('/driver/my-attendance', verifyToken, async (req, res) => {
  try {
    const { phone, month } = req.query; // month = "2026-06"
    if (!phone || !month) return res.status(400).json({ message: 'phone and month required' });
    if (req.user.role === 'DRIVER' && req.user.mobile_number && req.user.mobile_number !== phone)
      return res.status(403).json({ error: 'Not authorized' });

    // Get driver id
    const dr = await pool.query(`SELECT id FROM public.drivers WHERE mobile_number=$1`, [phone]);
    if (!dr.rows[0]) return res.status(404).json({ message: 'Driver not found' });
    const driverId = dr.rows[0].id;

    // Get assignment date for this month (most recent active assignment)
    const asgn = await pool.query(
      `SELECT assigned_at FROM public.driver_vehicle_history
       WHERE driver_id=$1 AND (unassigned_at IS NULL OR DATE_TRUNC('month', assigned_at) <= $2::date)
       ORDER BY assigned_at DESC LIMIT 1`,
      [driverId, month + '-01']
    );
    const assignedAt = asgn.rows[0]?.assigned_at ? new Date(asgn.rows[0].assigned_at) : null;

    const monthStart = new Date(month + '-01T00:00:00.000Z');
    const now = new Date();
    const isCurrentMonth = now.toISOString().slice(0, 7) === month;
    const monthEnd = isCurrentMonth ? now : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    // Effective start = max(monthStart, assignedAt)
    const effectiveStart = assignedAt && assignedAt > monthStart ? assignedAt : monthStart;

    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const daysElapsed = Math.max(1, Math.ceil((monthEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + (isCurrentMonth ? 0 : 1));

    // Get present days from driver_activity (ping-based) OR driver_daily_log (login-based)
    const logs = await pool.query(
      `SELECT EXTRACT(DAY FROM activity_date)::INTEGER as day, activity_date as log_date
       FROM public.driver_activity
       WHERE driver_id=$1 AND DATE_TRUNC('month', activity_date) = $2::date
       UNION
       SELECT EXTRACT(DAY FROM log_date)::INTEGER as day, log_date
       FROM public.driver_daily_log
       WHERE driver_id=$1 AND DATE_TRUNC('month', log_date) = $2::date
       ORDER BY log_date`,
      [driverId, month + '-01']
    );

    const daysPresent = logs.rows.length;
    const todayPresent = logs.rows.some(l => {
      const d = new Date(l.log_date);
      const t = new Date();
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    });
    const attendancePct = daysElapsed > 0 ? Math.round((daysPresent / daysElapsed) * 100) : 0;

    res.json({
      month,
      daysPresent,
      daysElapsed,
      daysInMonth,
      attendancePct,
      todayPresent,
      assignedFrom: assignedAt ? assignedAt.toISOString().slice(0, 10) : null,
      logs: logs.rows.map(l => ({ day: l.day })),
    });
  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ message: 'Failed' });
  }
});

// Manager login check
router.get('/manager/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    const r = await pool.query(
      `SELECT m.*, o.full_name as owner_name, o.owner_code, o.mobile_number as owner_phone
       FROM public.managers m
       JOIN public.owners o ON o.id = m.owner_id
       WHERE m.mobile_number=$1 AND m.status='ACTIVE'`,
      [phone]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not a manager' });
    res.json({ success: true, manager: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upgrade to premium (admin manually upgrades, or payment webhook)                                                                                                                                                                                                                                                                                                                                                       