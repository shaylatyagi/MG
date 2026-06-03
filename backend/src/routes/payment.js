require('dotenv').config(); //read backend .env fileyou 

const express = require('express');

const router = express.Router();

const { v4: uuidv4 } = require('uuid');

const pool = require('../config/db');
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
router.get('/owner/incentive-config', async (req, res) => {
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
router.post('/owner/incentive-config', async (req, res) => {
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
router.get('/owner/driver-history/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

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
router.get('/owner/vehicle-history/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
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
router.get('/owner/driver-activity', async (req, res) => {
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
router.get('/owner/incentive-rules', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const res2 = await pool.query(
      `SELECT * FROM public.owner_incentive_rules WHERE owner_id = $1`, [ownerId]
    );
    res.json(res2.rows[0] || { is_enabled: false, rules: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/owner/incentive-rules', async (req, res) => {
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
// TEST ENDPOINT - Set test dues for a driver (REMOVE IN PRODUCTION)
router.post('/driver/set-test-dues', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    
    // Create a test vehicle assignment
    const userResult = await pool.query(
      'SELECT id FROM auth.users WHERE mobile_number = $1',
      [phone]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    
    const driverId = userResult.rows[0].id;
    
    // Check if driver already has a vehicle
    const existingVehicle = await pool.query(
      'SELECT id FROM auth.owner_vehicles WHERE driver_id = $1',
      [driverId]
    );
    
    if (existingVehicle.rows.length === 0) {
      // Create a test vehicle for this driver
      await pool.query(
        `INSERT INTO auth.owner_vehicles 
         (owner_id, vehicle_number, vehicle_model, daily_rent, driver_id, status)
         VALUES 
         ((SELECT id FROM auth.users WHERE user_type = 'PLATFORM_ADMIN' LIMIT 1),
          'TEST-001', 'Test EV Vehicle', $1, $2, 'ASSIGNED')`,
        [amount || 850, driverId]
      );
    }
    
    res.json({ success: true, message: `Test dues set to ₹${amount || 850}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to set test dues' });
  }
});
router.get('/driver/dues', async (req, res) => {
  try {
    const { phone } = req.query;
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
router.post('/owner/damage-record', async (req, res) => {
  try {
    const { vehicleId, driverId, ownerId, damageType, description, amount, recoveryMethod } = req.body;
    
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
router.get('/owner/damage-records/:vehicleId', async (req, res) => {
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
router.put('/owner/damage-record/:id/resolve', async (req, res) => {
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
router.post('/owner/vehicles', async (req, res) => {
  try {
    
    const { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id,
        vehicle_type, insurance_expiry, fitness_expiry, chassis_number } = req.body;
    console.log('Add Vehicle:', { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id });
    
    if (!owner_id || !vehicle_number) {
      return res.status(400).json({ success: false, message: 'Vehicle number and owner ID required' });
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
  [vehicle_number, vehicle_model||'Standard', daily_rent||850, 
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
router.post('/owner/ledger-entry', async (req, res) => {
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

    // Entry insert karo
    await pool.query(
      `INSERT INTO public.driver_ledger 
       (driver_id, owner_id, entry_type, amount, description, created_by)
       VALUES ($1, $2, $3, $4, $5, 'OWNER')`,
      [driverId, ownerId, entryType, amount, description || '']
    );

    // Advance ya repair credit hone pe driver balance update
    if (['ADVANCE_CREDIT', 'REPAIR_CREDIT', 'REFUND'].includes(entryType)) {
      await pool.query(
        `UPDATE public.drivers SET advance_balance = COALESCE(advance_balance, 0) + $1 WHERE id = $2`,
        [amount, driverId]
      );
    }
    // Damage ya penalty pe advance se deduct karo pehle
    if (['DAMAGE_CHARGE', 'PENALTY'].includes(entryType)) {
      await pool.query(
        `UPDATE public.drivers 
         SET advance_balance = GREATEST(0, COALESCE(advance_balance, 0) - $1) 
         WHERE id = $2`,
        [amount, driverId]
      );
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
router.get('/owner/driver-ledger', async (req, res) => {
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
router.post('/owner/notify-unpaid', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const paidResult = await pool.query(
      `SELECT DISTINCT payer_mobile FROM ms_orders 
       WHERE transaction_status='SUCCESS' AND DATE(order_completion_date)=CURRENT_DATE`
    );
    const paidPhones = paidResult.rows.map(r => r.payer_mobile);
    const unpaidDrivers = await pool.query(
      `SELECT id, full_name, mobile_number FROM public.drivers 
       WHERE status='ACTIVE' AND mobile_number != ALL($1::text[])`,
      [paidPhones]
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
router.post('/owner/cash-payment', async (req, res) => {
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

    await pool.query(`
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

    await pool.query(
      `UPDATE public.drivers SET wallet_balance = COALESCE(wallet_balance,0) + $1 WHERE mobile_number = $2`,
      [parseFloat(amount), driverPhone]
    );

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
    let where = '';
    switch(period) {
      case 'yesterday': where = `DATE(order_completion_date) = CURRENT_DATE - INTERVAL '1 day'`; break;
      case 'week':      where = `order_completion_date >= NOW() - INTERVAL '7 days'`; break;
      case 'this_month':where = `DATE_TRUNC('month', order_completion_date) = DATE_TRUNC('month', NOW())`; break;
      case 'last_month':where = `DATE_TRUNC('month', order_completion_date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')`; break;
      default:          where = `DATE(order_completion_date) = CURRENT_DATE`;
    }
    const received = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders WHERE transaction_status='SUCCESS' AND ${where}`
    );
    const pending = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders WHERE transaction_status='PENDING' AND DATE(order_initiation_date)=CURRENT_DATE`
    );
    res.json({
      received: parseFloat(received.rows[0].total),
      outstanding: parseFloat(pending.rows[0].total),
    });
  } catch(err) { res.json({ received: 0, outstanding: 0 }); }
});
router.get('/owner/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    console.log('🔍 /owner/by-phone called for phone:', phone);
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, owner_code, wallet_balance, status, created_at
       FROM public.owners 
       WHERE mobile_number = $1`,
      [phone]
    );
    
    console.log('📊 Query result rows:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('❌ Owner not found for phone:', phone);
      return res.status(404).json({ error: 'Owner not found' });
    }
    
    console.log('✅ Owner found:', result.rows[0]);
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
    console.log('Fetching vehicles for ownerId:', ownerId);
    
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID required' });
    }
    
    const result = await pool.query(
      `SELECT 
         v.id, 
         v.vehicle_number, 
         v.vehicle_model, 
         v.daily_rent, 
         v.status, 
         v.created_at,
         v.driver_id,
         v.driver_name,
         v.driver_phone
       FROM public.vehicles v
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [parseInt(ownerId)]
    );
    
    console.log('Vehicles found:', result.rows.length);
    res.json(result.rows);
    
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles', error: err.message });
  }
});
router.post('/owner/add-driver', async (req, res) => {
  try {
    const { full_name, mobile_number, date_of_birth, emergency_contact_name,
        emergency_contact_number, driving_license_number, 
        driving_license_expiry, security_deposit } = req.body;

    if (!full_name || !mobile_number)
      return res.status(400).json({ success: false, message: 'Name and phone required' });

    if (/[0-9]/.test(full_name))
      return res.status(400).json({ success: false, message: '❌ Name cannot contain numbers!' });

    if (!/^\d{10}$/.test(mobile_number))
      return res.status(400).json({ success: false, message: '❌ Phone must be 10 digits' });

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
   VALUES ($1,$2,'OWN701951',$3,0,'ACTIVE',$4,$5,$6,$7,$8,$9) 
   RETURNING id, driver_code`,
  [full_name, mobile_number, driverCode,
   date_of_birth||null, emergency_contact_name||null, emergency_contact_number||null,
   driving_license_number||null, driving_license_expiry||null, security_deposit||0]
);

    res.json({ success: true, message: '✅ Driver added!', driver_code: result.rows[0].driver_code });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add driver: ' + err.message });
  }
});
router.get('/owner/transactions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mo.order_id, mo.order_number, mo.order_amount,
              mo.order_initiation_date, mo.order_completion_date,
              mo.transaction_status, mo.payment_mode, mo.payer_mobile,
              COALESCE(d.full_name, mo.payer_name) as driver_name,
              v.vehicle_number
       FROM public.ms_orders mo
       LEFT JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE mo.transaction_status = 'SUCCESS'
       ORDER BY mo.order_initiation_date DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Transactions error:', err);
    res.json([]);
  }
});
// GET all active drivers for login screen - NO HARDCODE, ONLY DATABASE
router.get('/drivers/list', async (req, res) => {
  try {
    console.log('📋 Fetching all active drivers from database...');
    
    const result = await pool.query(
      `SELECT 
         d.id, 
         d.full_name, 
         d.mobile_number, 
         d.driver_code,
         COALESCE(d.wallet_balance, 0) as wallet_balance,
         d.status
       FROM public.drivers d
       WHERE d.status = 'ACTIVE'
       ORDER BY d.full_name`
    );
    
    console.log(`✅ Found ${result.rows.length} active drivers in database`);
    
    if (result.rows.length === 0) {
      console.log('⚠️ No active drivers found in database');
      return res.status(404).json({ 
        success: false, 
        message: 'No active drivers found in database',
        drivers: [] 
      });
    }
    
    res.json({ 
      success: true, 
      drivers: result.rows,
      count: result.rows.length
    });
    
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + err.message,
      drivers: [] 
    });
  }
});

// GET all owners list (for login screen)
router.get('/owners/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, owner_code
       FROM public.owners 
       WHERE status = 'ACTIVE'
       ORDER BY full_name`
    );
    res.json({ owners: result.rows });
  } catch (err) {
    console.error('Error fetching owners:', err);
    res.json({ owners: [] });
  }
});
router.get('/owner/drivers/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number as phone_number,
              d.driver_code, d.wallet_balance, d.status, d.created_at,
              COALESCE(v.vehicle_number, 'Not Assigned') as assigned_vehicle,
              v.id as vehicle_id
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.status = 'ACTIVE'
       ORDER BY d.full_name`
    );
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error('Get drivers error:', err);
    res.json({ drivers: [] });
  }
});

// ============================================
// OWNER STATS
// ============================================
router.get('/owner/stats', async (req, res) => {
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
    
    const earnings = await pool.query(
  `SELECT COALESCE(SUM(order_amount), 0) as total 
   FROM public.ms_orders mo
   JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
   WHERE d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
   AND mo.transaction_status = 'SUCCESS'`,
  [parseInt(ownerId)]
);
    
    res.json({
      total_vehicles: parseInt(vehicles.rows[0].count || 0),
      total_drivers: parseInt(drivers.rows[0].count || 0),
      total_earnings: parseFloat(earnings.rows[0].total || 0)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.json({ total_vehicles: 0, total_drivers: 0, total_earnings: 0 });
  }
});
router.post('/create-order', async (req, res) => {
  try {
    const { amount, customerName, customerPhone, customerEmail } = req.body;
    if (!amount || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Amount and phone required' });
    }

    const BASE = process.env.PAYYANTRA_BASE_URL || 'https://payin-api-uat.payyantra.com';
    
    // ✅ DEBUG LOG — Render mein dikheга
    console.log('🔑 Using PayYantra BASE:', BASE);
    console.log('🔑 CLIENT_ID:', process.env.PAYYANTRA_CLIENT_ID ? '✅' : '❌ MISSING');

    // ✅ FIX: json() ki jagah text() use karo pehle
    const tokenRes = await fetch(`${BASE}/api/auth/token`, {
      method: 'POST',
      headers: {
        'x-client-id': process.env.PAYYANTRA_CLIENT_ID,
        'x-client-secret': process.env.PAYYANTRA_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
    });

    const tokenText = await tokenRes.text();
    console.log('📡 Token API status:', tokenRes.status);
    console.log('📡 Token API response:', tokenText);

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
    const orderRes = await fetch(`${BASE}/api/merchant/orders`, {
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
        returnUrl: `https://mg-sandy.vercel.app/driver?status=success&orderId=${orderId}`,
        notifyUrl: 'https://mg-qw5s.onrender.com/api/payment/webhook'
      })
    });
//linkbasedpayments-chat in notifications-
    const orderData = await orderRes.json();

    // ✅ FIX 2: Agar PayYantra se response nahi aaya toh error do, mock mat banao
    const intentURL   = orderData?.intentURL   || orderData?.data?.intentURL;
    const checkoutUrl = orderData?.checkoutUrl || orderData?.data?.checkoutUrl;
    const upiQrLink   = orderData?.data?.upiQrLink;
    const pgTxnId     = orderData?.data?.transactionId || orderData?.transactionId;

    if (!intentURL && !checkoutUrl && !upiQrLink) {
      return res.status(500).json({ 
        success: false, 
        message: 'PayYantra se koi URL nahi aaya',
        raw: orderData   // ← yahan se exactly dekh kya aa raha hai
      });
    }

    // ✅ DB mein save karo — purpose aur owner_id bhi
    await pool.query(
      `INSERT INTO ms_orders 
        (order_id, order_number, order_amount, currency, payer_name, 
         payer_mobile, transaction_status, pg_transaction_id, order_initiation_date,
         purpose, payment_mode)
       VALUES ($1, $2, $3, 'INR', $4, $5, 'PENDING', $6, NOW(), $7, 'ONLINE')
       ON CONFLICT (order_id) DO NOTHING`,
      [orderId, orderNumber, parseFloat(amount), 
       customerName || 'Driver', customerPhone, pgTxnId || null, purpose || 'RENT']
    );

    // Response mein ye sab fields return karo
res.json({
  success: true,
  checkoutUrl: orderData?.data?.checkoutUrl || orderData?.checkoutUrl,
  intentURL: orderData?.data?.intentURL || orderData?.intentURL,
  upiQrLink: orderData?.data?.upiQrLink,
  orderId,
  transactionId: pgTxnId,
  data: orderData.data
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
router.get('/owner/driver-statement', async (req, res) => {
  try {
    const { driverId } = req.query;

    const driver = await pool.query(
      `SELECT full_name, mobile_number FROM public.drivers WHERE id = $1`,
      [driverId]
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

    // SOS DB mein save karo
    await pool.query(
      `INSERT INTO public.sos_alerts (driver_id, driver_phone, message)
       VALUES ($1, $2, $3)`,
      [d.id, phone, message || 'SOS Alert!']
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

    await pool.query(
      `INSERT INTO public.chat_messages (driver_id, owner_id, sender_type, message)
       VALUES ($1, $2, $3, $4)`,
      [driverId, ownerId || 1, senderType || 'DRIVER', message]
    );
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
}else {
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
    const { driverPhone, ownerId } = req.query;

    const driver = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
    );
    if (!driver.rows[0]) return res.json([]);
    const driverId = driver.rows[0].id;

    const messages = await pool.query(
      `SELECT id, sender_type, message, is_read, created_at
       FROM public.chat_messages
       WHERE driver_id = $1
       ORDER BY created_at ASC
       LIMIT 100`,
      [driverId]
    );

    // Messages read mark karo
    await pool.query(
      `UPDATE public.chat_messages SET is_read = TRUE
       WHERE driver_id = $1 AND sender_type != $2`,
      [driverId, ownerId ? 'OWNER' : 'DRIVER']
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
    
    const result = await pool.query(
      `SELECT COUNT(*) FROM public.chat_messages
       WHERE driver_id = $1 AND is_read = FALSE AND sender_type != $2`,
      [driver.rows[0].id, viewerType || 'DRIVER']
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch(err) {
    res.json({ count: 0 });
  }
});

// WEBHOOK
router.post('/webhook', async (req, res) => {

  const body = req.body;

  console.log('Webhook received:', body);


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
    // Update driver_details
    await pool.query(
      `UPDATE public.driver_details 
       SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
           amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
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
   VALUES ($1, 'DRIVER', '✅ Payment Successful', 
           'Your payment of ₹${amount} has been received successfully.',
           $2, NOW())`,
  [driverUserId, JSON.stringify({ amount, status: 'SUCCESS', type: 'payment' })]
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
router.get('/driver/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone required' });

    const result = await pool.query(
  `SELECT 
     d.id, d.full_name as name, d.mobile_number as phone,
     d.driver_code, d.wallet_balance, d.status, d.advance_balance,
     d.security_deposit,
     v.id as vehicle_id, v.vehicle_number, v.vehicle_model,
     v.daily_rent as vehicle_daily_rent, v.status as vehicle_status,
     v.created_at as assigned_since
   FROM public.drivers d
   LEFT JOIN public.vehicles v ON v.driver_id = d.id
   WHERE d.mobile_number = $1`,
  [phone]
);
    if (!result.rows[0]) return res.status(404).json({ message: 'Driver not found' });
    const p = result.rows[0];

    // ✅ BAHAR declare karo — sab 0 se shuru
    let amount_paid_today = 0;
    let total_outstanding = 0;
    let dailyDepositRecovery = 0;    // ← const tha if block mein, ab let bahar
    let effectiveDailyCharge = 0;    // ← same

    if (p.vehicle_number && p.vehicle_daily_rent) {
      const dailyRent = parseFloat(p.vehicle_daily_rent);
      
      const totalPaidRes = await pool.query(
        `SELECT COALESCE(SUM(order_amount),0) as total FROM public.ms_orders
         WHERE payer_mobile=$1 AND transaction_status='SUCCESS'`, [phone]
      );
      const totalPaid = parseFloat(totalPaidRes.rows[0].total);

      const assignedSince = p.assigned_since ? new Date(p.assigned_since) : new Date();
      const daysDiff = Math.max(1, Math.floor((new Date()-assignedSince)/(1000*60*60*24)));

      const securityDeposit = parseFloat(p.security_deposit || 0);
      dailyDepositRecovery = securityDeposit > 0 ? Math.round(securityDeposit/100) : 0;
      effectiveDailyCharge = dailyRent + dailyDepositRecovery;
      const totalCharged = daysDiff * effectiveDailyCharge;
      const advance = parseFloat(p.advance_balance || 0);
      total_outstanding = Math.max(0, totalCharged - totalPaid - advance);

      const todayPaidRes = await pool.query(
        `SELECT COALESCE(SUM(order_amount),0) as total FROM public.ms_orders
         WHERE payer_mobile=$1 AND transaction_status='SUCCESS' AND DATE(order_completion_date)=CURRENT_DATE`,
        [phone]
      );
      amount_paid_today = parseFloat(todayPaidRes.rows[0].total);
    }

    res.json({
      ...p,
      amount_paid_today,
      total_outstanding,
      current_dues: total_outstanding,
      daily_deposit_recovery: dailyDepositRecovery,
      effective_daily_charge: effectiveDailyCharge
    });

  } catch (err) {
    console.error('Driver profile error:', err);
    res.status(500).json({ message: 'Failed' });
  }
});
router.get('/owner/sos-alerts', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const result = await pool.query(
      `SELECT s.*, d.full_name, d.mobile_number
       FROM public.sos_alerts s
       JOIN public.drivers d ON d.id = s.driver_id
       WHERE s.status = 'ACTIVE'
       AND d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
       ORDER BY s.created_at DESC LIMIT 5`,
      [ownerId]
    );
    res.json(result.rows);
  } catch(err) { res.json([]); }
});

router.put('/owner/sos-dismiss/:id', async (req, res) => {
  try {
    await pool.query(
      `UPDATE public.sos_alerts SET status='DISMISSED' WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});
router.get('/owner/notifications', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    
    const ownerResult = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id = $1', [ownerId]
    );
    if (ownerResult.rows.length === 0) return res.json([]);
    
    const ownerCode = ownerResult.rows[0].owner_code;
    
    // ✅ notifResult — duplicate const result avoid, aur driver_id bhi add
    const notifResult = await pool.query(
      `SELECT n.id, n.driver_id, n.title, n.message, n.is_read, 
              n.created_at, n.metadata, d.full_name as driver_name
       FROM public.notifications n
       LEFT JOIN public.drivers d ON d.id = n.driver_id
       WHERE (d.owner_code = $1 OR n.user_type = 'OWNER')
       AND n.user_type != 'DRIVER'
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [ownerCode]
    );
    
    res.json(notifResult.rows);
  } catch (err) {
    console.error('Owner notifications error:', err);
    res.json([]);
  }
});
router.post('/owner/bulk-upload-vehicles', async (req, res) => {
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
router.post('/owner/bulk-upload', async (req, res) => {
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
        'UPDATE public.notifications SET is_read = TRUE WHERE user_type = $1',
        ['OWNER']
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false });
  }
});

// CHECK PENDING (Inquiry API) 
router.post('/check-pending', async (req, res) => {

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

              `UPDATE driver_details 
               SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
                   amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
                   updated_at = NOW()
               WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,

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

        `UPDATE driver_details 
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
             amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
             updated_at = NOW()
         WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,

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


// SYNC ALL MISSING DATA (One-Time Backfill)
router.post('/sync-all-orders', async (req, res) => {

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
router.get('/drivers-list', async (req, res) => {
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
  try {
    const { phone, otp } = req.body;
    if (otp !== '123456')
      return res.status(400).json({ success: false, message: 'Invalid OTP. Demo OTP is 123456' });

    const driver = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number, d.driver_code, d.wallet_balance,
              COALESCE(v.vehicle_number, 'Not Assigned') as vehicle_number,
              COALESCE(v.vehicle_model, '') as vehicle_model,
              COALESCE(v.daily_rent, 0) as daily_rent
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.mobile_number = $1 AND d.status = 'ACTIVE'`,
      [phone]
    );
    if (driver.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Driver not found' });

    const d = driver.rows[0];
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: d.id, driver_code: d.driver_code, user_type: 'VEHICLE_DRIVER' },
      process.env.JWT_SECRET || 'voltops_super_secret_key_2025',
      { expiresIn: '7d' }
    );
    res.json({
      success: true, token,
      data: {
        id:           d.id,
        name:         d.full_name,
        usercode:     d.driver_code,
        phone_number: d.mobile_number,
        phone:        d.mobile_number,
        mobile_number:d.mobile_number,
        vehicle:      d.vehicle_number,
        daily_rent:   d.daily_rent,
        userType:     'VEHICLE_DRIVER'
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
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
scheduleDailyRent();

// Manual trigger for testing
router.post('/admin/generate-daily-rent', async (req, res) => {
  await generateDailyRentEntries();
  res.json({ success: true, message: 'Done!' });
});
// ─── PER-DRIVER INCENTIVE RULE ───────────────────────────────────────
router.post('/owner/driver-incentive-rule', async (req, res) => {
  try {
    const { driverId, ruleIndex } = req.body;
    await pool.query(
      `UPDATE public.drivers SET incentive_rule_index = $1 WHERE id = $2`,
      [ruleIndex, driverId]
    );
    res.json({ success: true });
  } catch (err) {
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
router.get('/owner/managers', async (req, res) => {
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
router.post('/owner/managers/add', async (req, res) => {
  try {
    const { ownerId, fullName, mobileNumber, permissions } = req.body;
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
    res.json({ success: true, manager: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update manager permissions
router.put('/owner/managers/:managerId/permissions', async (req, res) => {
  try {
    const { ownerId, permissions } = req.body;
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
router.delete('/owner/managers/:managerId', async (req, res) => {
  try {
    const { ownerId } = req.query;
    await pool.query(
      `UPDATE public.managers SET status='REMOVED' WHERE id=$1 AND owner_id=$2`,
      [req.params.managerId, ownerId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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

// Upgrade to premium (admin manually upgrades, or payment webhook)
router.post('/owner/upgrade-premium', async (req, res) => {
  try {
    const { ownerId, months = 1 } = req.body;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + months);
    await pool.query(
      `UPDATE public.owners SET plan='PREMIUM', plan_expires_at=$1 WHERE id=$2`,
      [expires, ownerId]
    );
    res.json({ success: true, expires_at: expires });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get owner plan status
router.get('/owner/plan', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const r = await pool.query(
      `SELECT plan, plan_expires_at FROM public.owners WHERE id=$1`, [ownerId]
    );
    const o = r.rows[0];
    const premium = o?.plan === 'PREMIUM' && (!o.plan_expires_at || new Date(o.plan_expires_at) > new Date());
    res.json({ plan: o?.plan || 'FREE', is_premium: premium, expires_at: o?.plan_expires_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});