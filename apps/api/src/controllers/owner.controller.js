// apps/api/src/controllers/owner.controller.js — DevSpec §13.3
'use strict';

const pool         = require('../config/db');
const { AppError } = require('../utils/errors');

const resolveOwnerId = (req) => {
  const { role, id, owner_id } = req.user;
  if (role === 'owner')   return id;
  if (role === 'manager') return owner_id;
  if (role === 'admin')   return req.query.owner_id || null;
  throw new AppError('Owner context required', 403, 'FORBIDDEN');
};

// GET /api/owner/dashboard-stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);

    const [vehiclesRes, driversRes, collectionRes, balanceRes] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS count FROM public.vehicles WHERE owner_id = $1',
        [ownerId]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT d.id)::int AS count
           FROM public.drivers d
           JOIN public.vehicles v ON v.driver_id = d.id
          WHERE d.owner_id = $1 AND d.status = 'ACTIVE'`,
        [ownerId]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN payment_mode != 'CASH' THEN amount END), 0) AS today_online,
           COALESCE(SUM(CASE WHEN payment_mode = 'CASH'  THEN amount END), 0) AS today_cash
         FROM public.ms_orders
        WHERE owner_id = $1
          AND transaction_status = 'SUCCESS'
          AND payment_date::date = CURRENT_DATE`,
        [ownerId]
      ),
      pool.query(
        `SELECT
           COALESCE(ABS(SUM(CASE WHEN wallet_balance < 0 THEN wallet_balance END)), 0) AS outstanding,
           COUNT(CASE WHEN wallet_balance < 0 THEN 1 END)::int AS overdue_count
         FROM public.drivers
        WHERE owner_id = $1 AND deleted_at IS NULL`,
        [ownerId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalVehicles: vehiclesRes.rows[0].count,
        activeDrivers: driversRes.rows[0].count,
        todayOnline:   Number(collectionRes.rows[0].today_online),
        todayCash:     Number(collectionRes.rows[0].today_cash),
        outstanding:   Number(balanceRes.rows[0].outstanding),
        overdueCount:  balanceRes.rows[0].overdue_count,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/owner/drivers?page=1&pageSize=50&search=&status=
exports.listDrivers = async (req, res, next) => {
  try {
    const ownerId  = resolveOwnerId(req);
    const page     = Math.max(1, parseInt(req.query.page     || '1',  10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '50', 10)));
    const offset   = (page - 1) * pageSize;
    const search   = req.query.search   ? `%${req.query.search}%`   : null;
    const status   = req.query.status   || null;

    const conditions = ['d.owner_id = $1', 'd.deleted_at IS NULL'];
    const params     = [ownerId];

    if (search) {
      params.push(search);
      conditions.push(`(d.name ILIKE $${params.length} OR d.phone_number ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM public.drivers d ${where}`,
        params
      ),
      pool.query(
        `SELECT d.id, d.name, d.phone_number, d.status, d.kyc_status,
                d.wallet_balance, d.created_at,
                v.reg_number, v.model
           FROM public.drivers d
           LEFT JOIN public.vehicles v ON v.driver_id = d.id AND v.status = 'ASSIGNED'
           ${where}
           ORDER BY d.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      ),
    ]);

    res.json({
      success: true,
      data:       rowsRes.rows,
      pagination: {
        page,
        pageSize,
        total:      countRes.rows[0].total,
        totalPages: Math.ceil(countRes.rows[0].total / pageSize),
      },
    });
  } catch (err) { next(err); }
};

// POST /api/owner/drivers
exports.createDriver = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    const { name, phone_number } = req.body;

    const ownerRow = await pool.query(
      'SELECT company_id FROM public.owners WHERE id = $1 LIMIT 1',
      [ownerId]
    );
    if (!ownerRow.rows[0]) throw new AppError('Owner not found', 404, 'NOT_FOUND');
    const { company_id } = ownerRow.rows[0];

    const existing = await pool.query(
      'SELECT id FROM public.drivers WHERE phone_number = $1 LIMIT 1',
      [phone_number]
    );
    if (existing.rows[0])
      throw new AppError('Phone number already registered', 409, 'CONFLICT');

    const { rows } = await pool.query(
      `INSERT INTO public.drivers (name, phone_number, owner_id, company_id, status, wallet_balance)
       VALUES ($1, $2, $3, $4, 'ACTIVE', 0)
       RETURNING id, name, phone_number, status, kyc_status, created_at`,
      [name, phone_number, ownerId, company_id]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/owner/drivers/csv-upload — DevSpec §13.3
exports.csvUploadDrivers = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    if (!req.file) throw new AppError('CSV file required', 400, 'VALIDATION_ERROR');

    const ownerRow = await pool.query(
      'SELECT company_id FROM public.owners WHERE id = $1 LIMIT 1',
      [ownerId]
    );
    if (!ownerRow.rows[0]) throw new AppError('Owner not found', 404, 'NOT_FOUND');
    const { company_id } = ownerRow.rows[0];

    const lines  = req.file.buffer.toString('utf8').split('\n').map(l => l.trim()).filter(Boolean);
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx  = header.indexOf('name');
    const phoneIdx = header.indexOf('phone_number') !== -1 ? header.indexOf('phone_number') : header.indexOf('phone');

    if (nameIdx === -1 || phoneIdx === -1)
      throw new AppError('CSV must have name and phone_number columns', 400, 'VALIDATION_ERROR');

    const created = [];
    const skipped = [];

    for (let i = 1; i < lines.length; i++) {
      const cols  = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const name  = cols[nameIdx];
      const phone = cols[phoneIdx];
      if (!name || !phone) { skipped.push({ row: i + 1, reason: 'missing name or phone' }); continue; }
      if (!/^[6-9]\d{9}$/.test(phone)) { skipped.push({ row: i + 1, phone, reason: 'invalid phone' }); continue; }

      try {
        const { rows } = await pool.query(
          `INSERT INTO public.drivers (name, phone_number, owner_id, company_id, status, wallet_balance)
           VALUES ($1, $2, $3, $4, 'ACTIVE', 0)
           ON CONFLICT (phone_number) DO NOTHING
           RETURNING id, name, phone_number`,
          [name, phone, ownerId, company_id]
        );
        if (rows[0]) created.push(rows[0]);
        else skipped.push({ row: i + 1, phone, reason: 'phone already registered' });
      } catch {
        skipped.push({ row: i + 1, phone, reason: 'insert error' });
      }
    }

    res.json({ success: true, data: { created: created.length, skipped: skipped.length, skipped_rows: skipped } });
  } catch (err) { next(err); }
};

// GET /api/owner/drivers/:id
exports.getDriver = async (req, res, next) => {
  try {
    const ownerId  = resolveOwnerId(req);
    const driverId = req.params.id;

    const { rows } = await pool.query(
      `SELECT d.id, d.name, d.phone_number, d.status, d.kyc_status,
              d.wallet_balance, d.owner_id, d.company_id, d.created_at,
              v.id AS vehicle_id, v.reg_number, v.model, v.status AS vehicle_status
         FROM public.drivers d
         LEFT JOIN public.vehicles v ON v.driver_id = d.id AND v.status = 'ASSIGNED'
        WHERE d.id = $1 AND d.owner_id = $2
        LIMIT 1`,
      [driverId, ownerId]
    );
    if (!rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/owner/drivers/:id/ledger — DevSpec §13.3
exports.getDriverLedger = async (req, res, next) => {
  try {
    const ownerId  = resolveOwnerId(req);
    const driverId = req.params.id;
    const page     = Math.max(1, parseInt(req.query.page     || '1',  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const offset   = (page - 1) * pageSize;

    // Confirm driver belongs to owner
    const check = await pool.query(
      'SELECT id FROM public.drivers WHERE id = $1 AND owner_id = $2 LIMIT 1',
      [driverId, ownerId]
    );
    if (!check.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS total FROM public.driver_ledger WHERE driver_id = $1',
        [driverId]
      ),
      pool.query(
        `SELECT id, entry_type, amount, balance_after, description, order_id, created_at
           FROM public.driver_ledger
          WHERE driver_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [driverId, pageSize, offset]
      ),
    ]);

    res.json({
      success: true,
      data:       rowsRes.rows,
      pagination: {
        page,
        pageSize,
        total:      countRes.rows[0].total,
        totalPages: Math.ceil(countRes.rows[0].total / pageSize),
      },
    });
  } catch (err) { next(err); }
};

// PUT /api/owner/drivers/:id/deactivate
exports.deactivateDriver = async (req, res, next) => {
  try {
    const ownerId  = resolveOwnerId(req);
    const driverId = req.params.id;

    const { rowCount } = await pool.query(
      "UPDATE public.drivers SET status = 'INACTIVE', updated_at = NOW() WHERE id = $1 AND owner_id = $2",
      [driverId, ownerId]
    );
    if (rowCount === 0)
      throw new AppError('Driver not found or not owned by you', 404, 'NOT_FOUND');

    res.json({ success: true, message: 'Driver deactivated' });
  } catch (err) { next(err); }
};

// GET /api/owner/vehicles
exports.listVehicles = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    const { rows } = await pool.query(
      `SELECT v.id, v.reg_number, v.model, v.status,
              v.driver_id, d.name AS driver_name, d.phone_number AS driver_phone,
              v.created_at
         FROM public.vehicles v
         LEFT JOIN public.drivers d ON d.id = v.driver_id
        WHERE v.owner_id = $1
        ORDER BY v.created_at DESC`,
      [ownerId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/owner/vehicles
exports.createVehicle = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    const { reg_number, model } = req.body;

    const ownerRow = await pool.query(
      'SELECT company_id FROM public.owners WHERE id = $1 LIMIT 1',
      [ownerId]
    );
    const company_id = ownerRow.rows[0]?.company_id || null;

    const duplicate = await pool.query(
      'SELECT id FROM public.vehicles WHERE reg_number = $1 LIMIT 1',
      [reg_number.toUpperCase()]
    );
    if (duplicate.rows[0])
      throw new AppError('Vehicle already registered', 409, 'CONFLICT');

    const { rows } = await pool.query(
      `INSERT INTO public.vehicles (reg_number, model, owner_id, company_id, status)
       VALUES ($1, $2, $3, $4, 'AVAILABLE')
       RETURNING id, reg_number, model, status, created_at`,
      [reg_number.toUpperCase(), model || null, ownerId, company_id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/owner/collections/trend
exports.getCollectionTrend = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);

    const { rows } = await pool.query(
      `SELECT
         payment_date::date AS day,
         COALESCE(SUM(CASE WHEN payment_mode != 'CASH' THEN amount ELSE 0 END), 0) AS online,
         COALESCE(SUM(CASE WHEN payment_mode = 'CASH'  THEN amount ELSE 0 END), 0) AS cash
       FROM public.ms_orders
      WHERE owner_id = $1
        AND transaction_status = 'SUCCESS'
        AND payment_date >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY 1`,
      [ownerId]
    );

    const dataMap = {};
    for (const row of rows) {
      dataMap[row.day.toISOString().slice(0, 10)] = {
        online: Number(row.online),
        cash:   Number(row.cash),
      };
    }

    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ day: key, online: dataMap[key]?.online ?? 0, cash: dataMap[key]?.cash ?? 0 });
    }

    res.json({ success: true, data: trend });
  } catch (err) { next(err); }
};

// POST /api/owner/wallet-entry — atomic wallet mutation, DevSpec §16.3
exports.createWalletEntry = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const ownerId = resolveOwnerId(req);
    const { driver_id, amount, entry_type, description } = req.body;

    await client.query('BEGIN');

    const driverRes = await client.query(
      'SELECT id, wallet_balance FROM public.drivers WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [driver_id, ownerId]
    );
    if (!driverRes.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Driver not found', 404, 'NOT_FOUND');
    }

    const amt        = Number(amount);
    const newBalance = Number(driverRes.rows[0].wallet_balance) + amt;

    const ledgerRes = await client.query(
      `INSERT INTO public.driver_ledger
         (driver_id, owner_id, entry_type, amount, description, balance_after, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [driver_id, ownerId, entry_type, amt, description || null, newBalance, ownerId]
    );

    await client.query(
      'UPDATE public.drivers SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, driver_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ledger_id:      ledgerRes.rows[0].id,
        wallet_balance: newBalance,
        created_at:     ledgerRes.rows[0].created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/owner/incentive-config — DevSpec §13.3
exports.getIncentiveConfig = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    const { rows } = await pool.query(
      `SELECT id, min_hours, incentive_type, incentive_value, is_active, updated_at
         FROM public.owner_incentive_rules
        WHERE owner_id = $1
        LIMIT 1`,
      [ownerId]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) { next(err); }
};

// POST /api/owner/incentive-config — DevSpec §13.3 (upsert)
exports.upsertIncentiveConfig = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    const { min_hours, incentive_type, incentive_value, is_active } = req.body;

    const VALID_TYPES = ['FULL_WAIVER', 'PERCENTAGE', 'FIXED'];
    if (!VALID_TYPES.includes(incentive_type))
      throw new AppError(`incentive_type must be one of: ${VALID_TYPES.join(', ')}`, 400, 'VALIDATION_ERROR');

    const { rows } = await pool.query(
      `INSERT INTO public.owner_incentive_rules
         (owner_id, min_hours, incentive_type, incentive_value, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (owner_id) DO UPDATE
         SET min_hours      = EXCLUDED.min_hours,
             incentive_type = EXCLUDED.incentive_type,
             incentive_value= EXCLUDED.incentive_value,
             is_active      = EXCLUDED.is_active,
             updated_at     = NOW()
       RETURNING *`,
      [ownerId, min_hours || 10, incentive_type, incentive_value || 0, is_active !== false]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
