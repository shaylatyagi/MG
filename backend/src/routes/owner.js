// backend/src/routes/owner.js
// Owner API — spec-compliant (DevSpec §13.3–13.6)
// Schema: drivers(name,phone_number), vehicles(reg_number,type,rent_type,daily_rent)
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { verifyToken } = require('../middleware/auth.middleware');

// All owner routes require a valid JWT
router.use(verifyToken);

// Helper: get owner row (id + company_id) from JWT user id
async function getOwner(userId) {
  const r = await pool.query(
    'SELECT id, company_id, owner_code FROM owners WHERE id = $1',
    [userId]
  );
  return r.rows[0] || null;
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
// GET /api/owner/me — real owner profile + company name
router.get('/me', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT o.id, o.full_name, o.mobile_number, o.owner_code, o.status,
             o.wallet_balance, o.company_id, o.created_at, o.email,
             c.name AS company_name, c.company_code, c.city,
             COALESCE(c.payment_mode, 'BOTH') AS payment_mode
      FROM public.owners o
      LEFT JOIN public.companies c ON c.id = o.company_id
      WHERE o.id = $1
    `, [req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json({ success: true, owner: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/owner/stats
// Returns: total_vehicles, total_drivers, active_contracts, pending_kyc,
//          collection_today, collection_month, outstanding, collection_efficiency
router.get('/stats', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const oid = owner.id;

    const [vehicles, drivers, contracts, pendingKyc, today, month, total] = await Promise.all([
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
           AND DATE(payment_date AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'`,
        [oid]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
           AND DATE_TRUNC('month', payment_date AT TIME ZONE 'Asia/Kolkata')
             = DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Kolkata')`,
        [oid]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'`,
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
        collection_total: parseFloat(total.rows[0].total),
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
// GET /api/owner/drivers?q=&status=&page=1&limit=50
router.get('/drivers', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const { q, status, page = 1, limit = 50 } = req.query;
    const params = [owner.id];
    const conditions = ['d.owner_id = $1', 'd.deleted_at IS NULL'];

    if (q) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(d.name ILIKE $${params.length} OR d.phone_number ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status.toUpperCase());
      conditions.push(`d.status = $${params.length}`);
    }

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

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
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
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

    // KYC-09: block assignment if KYC not approved (unless owner has override enabled)
    const ownerSettings = await pool.query(
      'SELECT kyc_required_for_assignment FROM owners WHERE id = $1', [owner.id]
    );
    const kycRequired = ownerSettings.rows[0]?.kyc_required_for_assignment !== false;
    const driverKyc = await pool.query('SELECT kyc_status FROM drivers WHERE id = $1', [driver.id]);
    if (kycRequired && driverKyc.rows[0]?.kyc_status !== 'APPROVED')
      return res.status(422).json({ success: false, message: 'Driver KYC not approved. Complete KYC before assignment or disable KYC requirement in settings.' });

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
    const ownerCode = owner.owner_code;
    const params = [ownerCode];
    let extra = '';
    if (driver_id) {
      params.push(driver_id);
      extra = `AND o.driver_id::text = $${params.length}`;
    }
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT o.id, o.order_amount AS amount, o.payment_mode, o.transaction_status,
              o.order_completion_date AS created_at,
              o.payer_name AS driver_name, o.payer_mobile AS phone_number,
              o.vehicle_number AS vehicle_reg, o.purpose, o.order_number
       FROM ms_orders o
       WHERE o.owner_code = $1 ${extra}
       ORDER BY o.order_completion_date DESC NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('owner/payments GET:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── BULK CSV DRIVER IMPORT ───────────────────────────────────────────────────
// POST /api/owner/drivers/bulk-import
// Body: multipart/form-data, field "file" = CSV file
// CSV format: name,phone_number,emergency_contact (header row required)
const multer = require('multer');
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/drivers/bulk-import', csvUpload.single('file'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'CSV file required (field: file)' });

  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const text    = req.file.buffer.toString('utf8');
    const lines   = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2)
      return res.status(400).json({ success: false, message: 'CSV must have header + at least 1 data row' });

    const headers  = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const nameIdx  = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone_number');
    const ecIdx    = headers.indexOf('emergency_contact');

    if (nameIdx === -1 || phoneIdx === -1)
      return res.status(400).json({ success: false, message: 'CSV must have "name" and "phone_number" columns' });

    const results = { total: lines.length - 1, created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < lines.length - 1; i++) {
      const cols  = lines[i + 1].split(',').map(c => c.trim().replace(/"/g, ''));
      const name  = cols[nameIdx]  || '';
      const phone = cols[phoneIdx] || '';
      const ec    = ecIdx !== -1   ? (cols[ecIdx] || null) : null;

      if (!name)                       { results.errors.push({ row: i + 2, reason: 'Name required' }); continue; }
      if (!/^\d{10}$/.test(phone))     { results.errors.push({ row: i + 2, reason: `Invalid phone: ${phone}` }); continue; }

      const dup = await pool.query('SELECT id FROM drivers WHERE phone_number = $1', [phone]);
      if (dup.rows.length) { results.skipped++; results.errors.push({ row: i + 2, reason: `${phone} already exists` }); continue; }

      try {
        await pool.query(
          `INSERT INTO drivers (owner_id, company_id, name, phone_number, emergency_contact,
                                wallet_balance, status, kyc_status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5, 0,'ACTIVE','PENDING',NOW(),NOW())`,
          [owner.id, owner.company_id, name, phone, ec]
        );
        results.created++;
      } catch (e) {
        results.errors.push({ row: i + 2, reason: e.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('bulk-import:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── EDIT CASH COLLECTION WITHIN 24H ─────────────────────────────────────────
// PUT /api/owner/cash/:id
// Body: { amount, notes }
router.put('/cash/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, notes } = req.body;
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
    return res.status(400).json({ success: false, message: 'Valid amount required' });

  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    // Verify ownership + 24h window
    const existing = await pool.query(
      `SELECT id, amount, driver_id, created_at FROM cash_collections
       WHERE id = $1 AND owner_id = $2`,
      [id, owner.id]
    );
    if (!existing.rows.length)
      return res.status(404).json({ success: false, message: 'Cash entry not found' });

    const entry   = existing.rows[0];
    const ageMs   = Date.now() - new Date(entry.created_at).getTime();
    const MAX_MS  = 24 * 60 * 60 * 1000;
    if (ageMs > MAX_MS)
      return res.status(403).json({ success: false, message: 'Cannot edit — 24-hour window has passed' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update cash_collections
      await client.query(
        `UPDATE cash_collections SET amount = $1, notes = $2, updated_at = NOW() WHERE id = $3`,
        [parseFloat(amount), notes || entry.notes, id]
      );

      // Correct ledger: find the original CASH entry and adjust
      const diff = parseFloat(amount) - parseFloat(entry.amount);
      if (diff !== 0) {
        await client.query(
          `INSERT INTO driver_ledger (driver_id, entry_type, amount, description, created_at)
           VALUES ($1, 'CASH', $2, $3, NOW())`,
          [entry.driver_id, diff, `Cash correction (edit by owner) — ref #${id}`]
        );
        await client.query(
          `UPDATE driver_wallet SET balance = balance + $1, updated_at = NOW() WHERE driver_id = $2`,
          [diff, entry.driver_id]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Cash entry updated' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('cash PUT:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── VEH-03: MARK VEHICLE UNDER MAINTENANCE ──────────────────────────────────
// PUT /api/owner/vehicles/:id/maintenance
// Body: { reason, under_maintenance: true|false }
router.put('/vehicles/:id/maintenance', async (req, res) => {
  const { reason = '', under_maintenance = true } = req.body;
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const veh = await pool.query(
      'SELECT id, status, driver_id FROM vehicles WHERE id = $1 AND owner_id = $2',
      [req.params.id, owner.id]
    );
    if (!veh.rows.length) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    if (under_maintenance) {
      if (veh.rows[0].driver_id)
        return res.status(409).json({ success: false, message: 'Unassign the driver before marking maintenance' });
      await pool.query(
        `UPDATE vehicles SET status = 'MAINTENANCE', maintenance_reason = $1, updated_at = NOW() WHERE id = $2`,
        [reason, req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE vehicles SET status = 'AVAILABLE', maintenance_reason = NULL, updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
    }
    res.json({ success: true, message: under_maintenance ? 'Vehicle marked under maintenance' : 'Vehicle available again' });
  } catch (err) {
    console.error('vehicles/maintenance:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DRV-05: DRIVER PROFILE WITH ASSIGNMENT HISTORY ──────────────────────────
// GET /api/owner/drivers/:id/profile
router.get('/drivers/:id/profile', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const [driverRow, paymentsRow, historyRow] = await Promise.all([
      pool.query(
        `SELECT d.*, v.reg_number AS vehicle_reg, v.type AS vehicle_type,
                v.daily_rent AS vehicle_daily_rent
         FROM drivers d
         LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
         WHERE d.id = $1 AND d.owner_id = $2 AND d.deleted_at IS NULL`,
        [req.params.id, owner.id]
      ),
      pool.query(
        `SELECT id, amount, payment_mode, transaction_status, created_at
         FROM ms_orders
         WHERE driver_id = $1 AND transaction_status = 'SUCCESS'
         ORDER BY created_at DESC LIMIT 30`,
        [req.params.id]
      ),
      pool.query(
        `SELECT dvh.id, dvh.assigned_at, dvh.unassigned_at,
                dvh.rent_type, dvh.rent_amount, dvh.deposit_amount,
                v.reg_number, v.type AS vehicle_type,
                EXTRACT(EPOCH FROM (COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at))/3600 AS hours_active
         FROM driver_vehicle_history dvh
         LEFT JOIN vehicles v ON v.id = dvh.vehicle_id
         WHERE dvh.driver_id = $1
         ORDER BY dvh.assigned_at DESC`,
        [req.params.id]
      ),
    ]);

    if (!driverRow.rows.length)
      return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({
      success: true,
      data: {
        driver:      driverRow.rows[0],
        payments:    paymentsRow.rows,
        assignments: historyRow.rows,
      },
    });
  } catch (err) {
    console.error('drivers/profile:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MGR-06: REVOKE MANAGER ACCESS ───────────────────────────────────────────
// DELETE /api/owner/managers/:id
router.delete('/managers/:id', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const result = await pool.query(
      `UPDATE managers SET status = 'REVOKED', updated_at = NOW()
       WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [req.params.id, owner.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Manager not found' });

    res.json({ success: true, message: 'Manager access revoked' });
  } catch (err) {
    console.error('managers/revoke:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── KYC-09 OVERRIDE: TOGGLE KYC REQUIREMENT ─────────────────────────────────
// PUT /api/owner/settings/kyc-required
// Body: { required: true|false }
router.put('/settings/kyc-required', async (req, res) => {
  const { required } = req.body;
  if (typeof required !== 'boolean')
    return res.status(400).json({ success: false, message: 'required (boolean) is needed' });
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    await pool.query(
      'UPDATE owners SET kyc_required_for_assignment = $1, updated_at = NOW() WHERE id = $2',
      [required, owner.id]
    );
    res.json({ success: true, message: `KYC requirement ${required ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DSH-04: SOS ALERTS FOR OWNER ────────────────────────────────────────────
// GET /api/owner/sos — unresolved SOS alerts
// POST /api/owner/sos/:id/resolve — mark resolved
router.get('/sos', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const result = await pool.query(
      `SELECT s.id, s.driver_id, s.lat, s.lng, s.created_at,
              d.name AS driver_name, d.phone_number
       FROM sos_alerts s
       JOIN drivers d ON d.id = s.driver_id
       WHERE s.owner_id = $1 AND s.resolved_at IS NULL
       ORDER BY s.created_at DESC`,
      [owner.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sos/:id/resolve', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const result = await pool.query(
      `UPDATE sos_alerts SET resolved_at = NOW()
       WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [req.params.id, owner.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'SOS alert not found' });

    res.json({ success: true, message: 'SOS resolved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/owner/payment-mode/request — submit change request
router.post('/payment-mode/request', async (req, res) => {
  try {
    const VALID = ['CASH_ONLY', 'ONLINE_ONLY', 'BOTH'];
    const { requested_mode } = req.body;
    if (!VALID.includes(requested_mode))
      return res.status(400).json({ error: 'requested_mode must be CASH_ONLY, ONLINE_ONLY, or BOTH' });
    const owner = await getOwner(req.user.id);
    if (!owner || !owner.company_id)
      return res.status(404).json({ error: 'No company linked to this owner' });
    // Cancel any existing pending request first
    await pool.query(
      `UPDATE public.payment_mode_requests SET status='REJECTED', resolved_at=NOW()
       WHERE owner_id=$1 AND status='PENDING'`, [req.user.id]
    );
    // Get company info
    const co = await pool.query('SELECT name, payment_mode FROM public.companies WHERE id=$1', [owner.company_id]);
    const company = co.rows[0] || {};
    const r = await pool.query(
      `INSERT INTO public.payment_mode_requests
         (owner_id, company_id, owner_name, company_name, current_mode, requested_mode)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, owner.company_id, owner.full_name, company.name,
       company.payment_mode || 'BOTH', requested_mode]
    );
    res.json({ success: true, request: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/owner/payment-mode/request — get current pending request
router.get('/payment-mode/request', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM public.payment_mode_requests
       WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 1`, [req.user.id]
    );
    res.json({ success: true, request: r.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/owner/payment-mode/request — cancel pending request
router.delete('/payment-mode/request', async (req, res) => {
  try {
    await pool.query(
      `UPDATE public.payment_mode_requests SET status='REJECTED', resolved_at=NOW()
       WHERE owner_id=$1 AND status='PENDING'`, [req.user.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/owner/driver-locations — all active drivers with last known GPS location
router.get('/driver-locations', async (req, res) => {
  try {
    const owner = await getOwner(req.user.id);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    const r = await pool.query(
      `SELECT d.id, d.name AS full_name, d.last_lat, d.last_lng, d.last_location_at,
              v.reg_number, v.type AS vehicle_type
       FROM public.drivers d
       LEFT JOIN public.driver_vehicle_history dvh ON dvh.driver_id = d.id AND dvh.unassigned_at IS NULL
       LEFT JOIN public.vehicles v ON v.id = dvh.vehicle_id
       WHERE d.owner_code = $1 AND d.last_lat IS NOT NULL
       ORDER BY d.last_location_at DESC`,
      [owner.owner_code]
    );
    res.json({ success: true, drivers: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
s = router;
