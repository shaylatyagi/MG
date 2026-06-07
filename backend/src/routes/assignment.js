const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// ─── HISTORY HELPERS ──────────────────────────────────────────────────────────
const logAssignment = async (driverId, vehicleId, ownerId, dailyRent, rentType) => {
  try {
    // Close any open record for this driver
    await pool.query(
      `UPDATE public.driver_vehicle_history SET unassigned_at = NOW()
       WHERE driver_id = $1 AND unassigned_at IS NULL`,
      [driverId]
    );
    // New record
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
// ──────────────────────────────────────────────────────────────────────────────
// Get available vehicles for a driver (vehicles without driver)
router.get('/available/vehicles', async (req, res) => {
  try {
    const { driverId } = req.query;
    
    const result = await pool.query(
      `SELECT id, vehicle_number, vehicle_model, daily_rent 
       FROM vehicles 
       WHERE driver_id IS NULL 
AND status IN ('ACTIVE', 'AVAILABLE')
       ORDER BY vehicle_number`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router.post('/unassign', async (req, res) => {
  const client = await pool.connect();
  try {
    const { vehicleId } = req.body;
    await client.query('BEGIN');
    
    const veh = await client.query(
      'SELECT driver_id FROM vehicles WHERE id=$1', [vehicleId]
    );
    const driverId = veh.rows[0]?.driver_id;

    await client.query(
      `UPDATE vehicles SET driver_id=NULL, driver_name=NULL, driver_phone=NULL, status='AVAILABLE' WHERE id=$1`,
      [vehicleId]
    );
    if (driverId) {
      await client.query('UPDATE drivers SET assigned_vehicle_id=NULL WHERE id=$1', [driverId]);
    }
    await client.query('COMMIT');

    // ✅ History update + incentive calculate
    await logUnassignment(vehicleId);

    if (driverId) {
      // Duration calculate karo
      const histRes = await pool.query(
        `SELECT assigned_at, daily_rent,
         EXTRACT(EPOCH FROM (NOW() - assigned_at))/3600 as hours_held
         FROM public.driver_vehicle_history
         WHERE driver_id = $1 AND unassigned_at IS NOT NULL
         ORDER BY unassigned_at DESC LIMIT 1`,
        [driverId]
      );
      const hist = histRes.rows[0];
      const hoursHeld = parseFloat(hist?.hours_held || 0);

      // Owner ka incentive rule fetch karo
      const ownerRes = await pool.query(
        `SELECT o.id FROM public.owners o
         JOIN public.drivers d ON d.owner_code = o.owner_code
         WHERE d.id = $1`, [driverId]
      );
      const ownerId = ownerRes.rows[0]?.id;

      if (ownerId) {
        const rulesRes = await pool.query(
          `SELECT * FROM public.owner_incentive_rules
           WHERE owner_id = $1 AND is_enabled = TRUE`, [ownerId]
        );
        const rules = rulesRes.rows[0]?.rules || [];

        // Per-driver override check
        const driverRuleRes = await pool.query(
          `SELECT incentive_rule_index FROM public.drivers WHERE id = $1`, [driverId]
        );
        const overrideIdx = driverRuleRes.rows[0]?.incentive_rule_index;

        let applicableRule = null;
        if (overrideIdx === -1) {
          // No incentive for this driver
        } else if (overrideIdx !== null && rules[overrideIdx]) {
          // Specific rule for this driver
          if (hoursHeld >= rules[overrideIdx].min_hours) {
            applicableRule = rules[overrideIdx];
          }
        } else {
          // Global rules — best applicable dhundo
          applicableRule = rules
            .filter(r => hoursHeld >= r.min_hours)
            .sort((a, b) => b.min_hours - a.min_hours)[0] || null;
        }

        if (applicableRule) {
          const dailyRent = parseFloat(hist?.daily_rent || 0);
          let amt = 0;
          if (applicableRule.type === 'FULL_WAIVER') amt = dailyRent;
          else if (applicableRule.type === 'PERCENTAGE') amt = dailyRent * (applicableRule.value / 100);
          else if (applicableRule.type === 'FIXED') amt = parseFloat(applicableRule.value);

          if (amt > 0) {
            await pool.query(
              `UPDATE public.drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
              [amt, driverId]
            );
            await pool.query(
              `INSERT INTO public.notifications (driver_id, user_type, title, message)
               VALUES ($1, 'DRIVER', '🎉 Incentive Mila!', $2)`,
              [driverId, `${Math.floor(hoursHeld)} ghante vehicle rakhi! ₹${amt.toFixed(0)} wallet mein aaye.`]
            );
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally { client.release(); }
});
// Get available drivers for a vehicle (drivers without vehicle)
router.get('/available/drivers', async (req, res) => {
  try {
    const { vehicleId } = req.query;
    
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code 
       FROM drivers 
       WHERE assigned_vehicle_id IS NULL 
AND status IN ('ACTIVE', 'AVAILABLE')
       ORDER BY full_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Get unassigned drivers (for owner dashboard top section)
router.get('/unassigned/drivers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code, wallet_balance 
       FROM drivers 
       WHERE assigned_vehicle_id IS NULL 
AND status IN ('ACTIVE', 'AVAILABLE')
       ORDER BY full_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching unassigned drivers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign vehicle to driver with rent type - COMPLETE FIXED VERSION
router.post('/assign-with-rent', async (req, res) => {
  const client = await pool.connect();
  try {
    const { vehicleId, driverId, rentType, rentAmount, dailyRent } = req.body;
    
    console.log('=== ASSIGNMENT REQUEST ===');
    console.log('vehicleId:', vehicleId, 'type:', typeof vehicleId);
    console.log('driverId:', driverId, 'type:', typeof driverId);
    console.log('rentType:', rentType);
    console.log('rentAmount:', rentAmount);
    console.log('dailyRent:', dailyRent);
    
    // Validate inputs
    if (!vehicleId || !driverId || !rentType || !rentAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, driverId, rentType, rentAmount'
      });
    }

    // KYC-09 / BR-03: Check driver KYC status before assignment
    const kycCheck = await pool.query(
      `SELECT kyc_status FROM public.drivers WHERE id = $1`, [driverId]
    );
    if (kycCheck.rows[0] && kycCheck.rows[0].kyc_status === 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Driver KYC rejected. Ask driver to re-upload documents.' });
    }
    // Warn if not verified but allow (configurable — admin can override per BR-03)
    const kycStatus = kycCheck.rows[0]?.kyc_status || 'PENDING';
    if (kycStatus !== 'VERIFIED' && process.env.KYC_REQUIRED_FOR_ASSIGNMENT === 'true') {
      return res.status(400).json({ success: false, error: `Driver KYC not complete (status: ${kycStatus}). Set KYC_REQUIRED_FOR_ASSIGNMENT=false to override.` });
    }

    await client.query('BEGIN');
    
    // Check if vehicle exists and is available
    const vehicleCheck = await client.query(
      `SELECT id, driver_id, vehicle_number FROM vehicles WHERE id = $1 FOR UPDATE`,
      [vehicleId]
    );
    
    if (vehicleCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    
    if (vehicleCheck.rows[0].driver_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Vehicle already assigned' });
    }
    
    // Check if driver exists and is available
    const driverCheck = await client.query(
      `SELECT id, full_name, assigned_vehicle_id FROM drivers WHERE id = $1 FOR UPDATE`,
      [driverId]
    );
    
    if (driverCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    if (driverCheck.rows[0].assigned_vehicle_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Driver already has a vehicle' });
    }
    
    // Calculate daily rent if not provided
    let finalDailyRent = dailyRent;
    if (!finalDailyRent) {
      if (rentType === 'DAILY') finalDailyRent = rentAmount;
      else if (rentType === 'WEEKLY') finalDailyRent = rentAmount / 7;
      else if (rentType === 'MONTHLY') finalDailyRent = rentAmount / 30;
      finalDailyRent = Math.round(finalDailyRent);
    }
    
    // Update vehicle
    // Get driver details first
const dInfo = await client.query(
  'SELECT full_name, mobile_number FROM public.drivers WHERE id = $1', [driverId]
);
const dName = dInfo.rows[0]?.full_name || '';
const dPhone = dInfo.rows[0]?.mobile_number || '';

await client.query(
  `UPDATE vehicles 
   SET driver_id=$1, driver_name=$2, driver_phone=$3, 
       rent_type=$4, rent_amount=$5, daily_rent=$6, status='ASSIGNED'
   WHERE id=$7`,
  [driverId, dName, dPhone, rentType, rentAmount, finalDailyRent, vehicleId]
);

// Notify driver
await pool.query(
  `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
   VALUES ($1, 'DRIVER', '🚛 Vehicle Assigned', 
           'A vehicle has been assigned to you. Check your dashboard.', NOW())`,
  [driverId]
).catch(() => {});
    
    // Update driver
    await client.query(
      `UPDATE drivers SET assigned_vehicle_id = $1, rent_type = $2, rent_amount = $3 WHERE id = $4`,
      [vehicleId, rentType, rentAmount, driverId]
    );
    
    await client.query('COMMIT');

    // ✅ History log — BEFORE res.json
    const ownerIdFromBody = req.body.owner_id || null;
    await logAssignment(driverId, vehicleId, ownerIdFromBody, finalDailyRent, rentType);

    res.json({ 
      success: true, 
      message: 'Vehicle assigned successfully',
      driverName: driverCheck.rows[0].full_name
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assignment error DETAILS:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack 
    });
  } finally {
    client.release();
  }
});
// Unassigned vehicles
router.get('/unassigned/vehicles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, vehicle_number, vehicle_model, daily_rent, status
       FROM public.vehicles
       WHERE driver_id IS NULL
       ORDER BY vehicle_number`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});
// Assign vehicle to driver
router.post('/assign', async (req, res) => {
  const client = await pool.connect();
  try {
    const { driverId, vehicleId } = req.body;
    
    await client.query('BEGIN');
    
    // Check if vehicle is available
    const vehicleCheck = await client.query(
      `SELECT driver_id FROM vehicles WHERE id = $1 FOR UPDATE`,
      [vehicleId]
    );
    
    if (vehicleCheck.rows[0]?.driver_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Vehicle already assigned' });
    }
    
    // Check if driver is available
    const driverCheck = await client.query(
      `SELECT assigned_vehicle_id FROM drivers WHERE id = $1 FOR UPDATE`,
      [driverId]
    );
    
    if (driverCheck.rows[0]?.assigned_vehicle_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Driver already has a vehicle' });
    }
    
    // Assign vehicle to driver
    await client.query(
      `UPDATE vehicles SET driver_id = $1 WHERE id = $2`,
      [driverId, vehicleId]
    );
    
    // Update driver
    await client.query(
      `UPDATE drivers SET assigned_vehicle_id = $1 WHERE id = $2`,
      [vehicleId, driverId]
    );
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Vehicle assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, d.full_name as driver_name, v.vehicle_number
       FROM transactions t
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN vehicles v ON d.assigned_vehicle_id = v.id
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new transaction (payment collection)
router.post('/transactions', async (req, res) => {
  try {
    const { driverId, amount, type, paymentMode, orderId } = req.body;
    
    const result = await pool.query(
      `INSERT INTO transactions (driver_id, amount, type, payment_mode, order_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'completed', NOW())
       RETURNING *`,
      [driverId, amount, type || 'collection', paymentMode || 'cash', orderId || null]
    );
    
    // Update driver wallet balance
    await pool.query(
      `UPDATE drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
      [amount, driverId]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;