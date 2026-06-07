// backend/src/routes/owner.js
// Owner API — spec-compliant (DevSpec §13.3–13.6)
// Schema: drivers(name,phone_number), vehicles(reg_number,type,rent_type,daily_rent)
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// All owner routes require a valid JWT
router.use(verifyToken);

// Helper: get owner row (id + company_id) from JWT user id
async function getOwner(userId) {
  const r = await pool.query(
    'SELECT id, company_id FROM owners WHERE id = $1',
    [userId]
  );
  return r.rows[0] || null;
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
// GET /api/owner/stats
// Returns: total_vehicles, total_drivers, active_contracts, pending_kyc,
//          collection_today, collection_month, outstanding, collection_efficiency
router.get('/stats', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const oid = owner.id;

    const [vehicles, drivers, contracts, pendingKyc, today, month] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM vehicles WHERE owner_id = $1', [oid]),
      pool.query('SELECT COUNT(*) FROM drivers WHERE owner_id = $1 AND deleted_at IS NULL', [oid]),
      pool.query(
        'SELECT COUNT(*) FROM driver_vehicle_history WHERE owner_id = $1 AND unassigned_at IS NULL',
        [oid]
      ),
      pool.query(
        "SELECT COUNT(*) FROM drivers WHERE owner_id = $1 AND kyc_status IN ('PENDING','PARTIAL') AND deleted_at IS NULL",
        [oid]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
           AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'`,
        [oid]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
           AND DATE_TRUNC('month', created_at AT TIME ZONE 'Asia/Kolkata')
             = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')`,
        [oid]
      ),
    ]);

    const totalDrivers  = parseInt(drivers.rows[0].count);
    const activeContracts = parseInt(contracts.rows[0].count);

    // Outstanding = active drivers * their daily rent - today's collection
    const rentSum = await pool.query(
      `SELECT COALESCE(SUM(dvh.rent_amount),0) AS total
       FROM driver_vehicle_history dvh
       WHERE dvh.owner_id = $1 AND dvh.unassigned_at IS NULL`,
      [oid]
    );
    const outstanding = Math.max(
      0,
      parseFloat(rentSum.rows[0].total) - parseFloat(today.rows[0].total)
    );

    const efficiency = activeContracts > 0
      ? ((parseFloat(today.rows[0].total) / parseFloat(rentSum.rows[0].total || 1)) * 100).toFixed(1)
      : '0.0';

    res.json({
      success: true,
      data: {
        total_vehicles:   parseInt(vehicles.rows[0].count),
        total_drivers:    totalDrivers,
        active_contracts: activeContracts,
        pending_kyc:      parseInt(pendingKyc.rows[0].count),
        collection_today: parseFloat(today.rows[0].total),
        collection_month: parseFloat(month.rows[0].total),
        outstanding,
        collection_efficiency: parseFloat(efficiency),
      },
    });
  } catch (err) {
    console.error('owner/stats:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
// GET /api/owner/vehicles
router.get('/vehicles', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const result = await pool.query(
      `SELECT v.id, v.reg_number, v.type, v.status, v.daily_rent, v.rent_type,
              v.created_at,
              d.id   AS driver_id,
              d.name AS driver_name,
              d.phone_number AS driver_phone,
              d.kyc_status   AS driver_kyc_status
       FROM vehicles v
       LEFT JOIN drivers d ON d.id = v.driver_id AND d.deleted_at IS NULL
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [owner.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('owner/vehicles GET:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/owner/vehicles
// Body: { reg_number, type, rent_type, daily_rent, model? }
router.post('/vehicles', async (req, res) => {
  const { reg_number, type, rent_type = 'DAILY', daily_rent, model } = req.body;
  if (!reg_number || !type)
    return res.status(400).json({ success: false, message: 'reg_number and type are required' });

  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const existing = await pool.query(
      'SELECT id FROM vehicles WHERE reg_number = $1', [reg_number]
    );
    if (existing.rows.length)
      return res.status(409).json({ success: false, message: 'Vehicle already registered' });

    const result = await pool.query(
      `INSERT INTO vehicles (owner_id, company_id, reg_number, type, model, rent_type, daily_rent, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'AVAILABLE',NOW(),NOW()) RETURNING *`,
      [owner.id, owner.company_id, reg_number, type, model || null,
       rent_type, parseFloat(daily_rent) || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('owner/vehicles POST:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DRIVERS ──────────────────────────────────────────────────────────────────
// GET /api/owner/drivers
router.get('/drivers', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const result = await pool.query(
      `SELECT d.id, d.name, d.phone_number, d.status, d.kyc_status,
              d.wallet_balance, d.created_at,
              v.id         AS vehicle_id,
              v.reg_number AS vehicle_reg,
              v.daily_rent,
              COALESCE(
                (SELECT SUM(o.amount) FROM ms_orders o
                 WHERE o.driver_id = d.id AND o.transaction_status = 'SUCCESS'
                   AND DATE(o.created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'),
                0
              ) AS paid_today,
              COALESCE(
                (SELECT SUM(o.amount) FROM ms_orders o
                 WHERE o.driver_id = d.id AND o.transaction_status = 'SUCCESS'
                   AND DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Kolkata')
                     = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')),
                0
              ) AS paid_month
       FROM drivers d
       LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
       WHERE d.owner_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [owner.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('owner/drivers GET:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/owner/drivers
// Body: { name, phone_number, emergency_contact? }
router.post('/drivers', async (req, res) => {
  const { name, phone_number, emergency_contact } = req.body;
  if (!name || !phone_number)
    return res.status(400).json({ success: false, message: 'name and phone_number are required' });
  if (!/^\d{10}$/.test(phone_number))
    return res.status(400).json({ success: false, message: 'phone_number must be 10 digits' });

  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const existing = await pool.query(
      'SELECT id FROM drivers WHERE phone_number = $1', [phone_number]
    );
    if (existing.rows.length)
      return res.status(409).json({ success: false, message: 'Driver with this phone already exists' });

    const result = await pool.query(
      `INSERT INTO drivers (owner_id, company_id, name, phone_number, emergency_contact,
                            wallet_balance, status, kyc_status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5, 0,'ACTIVE','PENDING',NOW(),NOW()) RETURNING *`,
      [owner.id, owner.company_id, name.trim(), phone_number,
       emergency_contact || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('owner/drivers POST:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ASSIGN VEHICLE → DRIVER ──────────────────────────────────────────────────
// POST /api/owner/assign
// Body: { driver_id, vehicle_id, rent_type?, rent_amount?, deposit_amount? }
router.post('/assign', async (req, res) => {
  const { driver_id, vehicle_id, rent_type = 'DAILY', rent_amount, deposit_amount = 0 } = req.body;
  if (!driver_id || !vehicle_id)
    return res.status(400).json({ success: false, message: 'driver_id and vehicle_id are required' });

  const client = await pool.connect();
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    // Ownership checks
    const [driverRow, vehicleRow] = await Promise.all([
      client.query('SELECT id, name, assigned_vehicle_id FROM drivers WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL', [driver_id, owner.id]),
      client.query('SELECT id, reg_number, daily_rent, status FROM vehicles WHERE id = $1 AND owner_id = $2', [vehicle_id, owner.id]),
    ]);
    if (!driverRow.rows.length)  return res.status(404).json({ success: false, message: 'Driver not found' });
    if (!vehicleRow.rows.length) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const driver  = driverRow.rows[0];
    const vehicle = vehicleRow.rows[0];

    if (driver.assigned_vehicle_id)
      return res.status(409).json({ success: false, message: 'Driver already has an assigned vehicle' });
    if (vehicle.status !== 'AVAILABLE')
      return res.status(409).json({ success: false, message: 'Vehicle is not available' });

    const effectiveRent = parseFloat(rent_amount) || vehicle.daily_rent;

    await client.query('BEGIN');

    // 1. Create assignment history record
    await client.query(
      `INSERT INTO driver_vehicle_history
         (driver_id, vehicle_id, owner_id, rent_type, rent_amount, deposit_amount, assigned_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [driver.id, vehicle.id, owner.id, rent_type, effectiveRent, parseFloat(deposit_amount)]
    );

    // 2. Update driver: set assigned_vehicle_id
    await client.query(
      'UPDATE drivers SET assigned_vehicle_id = $1, updated_at = NOW() WHERE id = $2',
      [vehicle.id, driver.id]
    );

    // 3. Update vehicle: set driver_id + status = ASSIGNED
    await client.query(
      "UPDATE vehicles SET driver_id = $1, status = 'ASSIGNED', updated_at = NOW() WHERE id = $2",
      [driver.id, vehicle.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${vehicle.reg_number} assigned to ${driver.name}`,
      data: { driver_id: driver.id, vehicle_id: vehicle.id, rent_amount: effectiveRent },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('owner/assign:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ─── UNASSIGN ─────────────────────────────────────────────────────────────────
// POST /api/owner/unassign
// Body: { driver_id }
router.post('/unassign', async (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) return res.status(400).json({ success: false, message: 'driver_id required' });

  const client = await pool.connect();
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const driverRow = await client.query(
      'SELECT id, assigned_vehicle_id FROM drivers WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
      [driver_id, owner.id]
    );
    if (!driverRow.rows.length) return res.status(404).json({ success: false, message: 'Driver not found' });

    const driver = driverRow.rows[0];
    if (!driver.assigned_vehicle_id)
      return res.status(400).json({ success: false, message: 'Driver has no assigned vehicle' });

    await client.query('BEGIN');

    // Close the history record
    await client.query(
      'UPDATE driver_vehicle_history SET unassigned_at = NOW() WHERE driver_id = $1 AND unassigned_at IS NULL',
      [driver.id]
    );

    // Free vehicle
    await client.query(
      "UPDATE vehicles SET driver_id = NULL, status = 'AVAILABLE', updated_at = NOW() WHERE id = $1",
      [driver.assigned_vehicle_id]
    );

    // Clear driver assignment
    await client.query(
      'UPDATE drivers SET assigned_vehicle_id = NULL, updated_at = NOW() WHERE id = $1',
      [driver.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Vehicle unassigned successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('owner/unassign:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
});

// ─── PAYMENT HISTORY ──────────────────────────────────────────────────────────
// GET /api/owner/payments?driver_id=&limit=20&offset=0
router.get('/payments', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const { driver_id, limit = 20, offset = 0 } = req.query;
    const params = [owner.id];
    let extra = '';
    if (driver_id) {
      params.push(parseInt(driver_id));
      extra = `AND o.driver_id = $${params.length}`;
    }
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT o.id, o.amount, o.payment_mode, o.transaction_status,
              o.created_at, d.name AS driver_name, d.phone_number,
              v.reg_number AS vehicle_reg
       FROM ms_orders o
       JOIN drivers d ON d.id = o.driver_id
       LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
       WHERE o.owner_id = $1 ${extra}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('owner/payments GET:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
