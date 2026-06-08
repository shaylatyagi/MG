// apps/api/src/routes/owner.js — per DevSpec §owner routes
const router             = require('express').Router();
const pool               = require('../config/db');
const { requireRole, requirePermission } = require('../middleware/roleCheck');
const { AppError }       = require('../utils/errors');

// ── Helper: extract owner_id from JWT ────────────────────────────────────────
const resolveOwnerId = (req) => {
  const { role, id, owner_id } = req.user;
  if (role === 'owner')   return id;
  if (role === 'manager') return owner_id;
  if (role === 'admin')   return req.query.owner_id || null;
  throw new AppError('Owner context required', 403, 'FORBIDDEN');
};

// ── Code generators ───────────────────────────────────────────────────────────
const generateDriverCode = () =>
  'DRV' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();

// GET /api/owner/dashboard-stats
router.get(
  '/dashboard-stats',
  requireRole('owner', 'admin', 'manager'),
  async (req, res, next) => {
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
             COALESCE(SUM(CASE WHEN payment_mode != 'CASH' THEN order_amount END), 0) AS today_online,
             COALESCE(SUM(CASE WHEN payment_mode = 'CASH'  THEN order_amount END), 0) AS today_cash
           FROM public.ms_orders
          WHERE owner_code IN (SELECT owner_code FROM public.owners WHERE id = $1)
            AND transaction_status = 'SUCCESS'
            AND COALESCE(order_completion_date, order_initiation_date)::date = CURRENT_DATE`,
          [ownerId]
        ),
        pool.query(
          `SELECT
             COALESCE(ABS(SUM(CASE WHEN wallet_balance < 0 THEN wallet_balance END)), 0) AS outstanding,
             COUNT(CASE WHEN wallet_balance < 0 THEN 1 END)::int AS overdue_count
           FROM public.drivers
          WHERE owner_id = $1`,
          [ownerId]
        ),
      ]);

      res.json({
        success: true,
        data: {
          totalVehicles:  vehiclesRes.rows[0].count,
          activeDrivers:  driversRes.rows[0].count,
          todayOnline:    Number(collectionRes.rows[0].today_online),
          todayCash:      Number(collectionRes.rows[0].today_cash),
          outstanding:    Number(balanceRes.rows[0].outstanding),
          overdueCount:   balanceRes.rows[0].overdue_count,
        },
      });
    } catch (err) { next(err); }
  }
);

// GET /api/owner/drivers?page=1&pageSize=50&search=
router.get(
  '/drivers',
  requireRole('owner', 'admin', 'manager'),
  async (req, res, next) => {
    try {
      const ownerId  = resolveOwnerId(req);
      const page     = Math.max(1, parseInt(req.query.page     || '1',  10));
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || '50', 10)));
      const offset   = (page - 1) * pageSize;
      const search   = req.query.search ? `%${req.query.search}%` : null;

      const ownerRow = await pool.query(
        'SELECT owner_code FROM public.owners WHERE id = $1 LIMIT 1',
        [ownerId]
      );
      if (!ownerRow.rows[0]) throw new AppError('Owner not found', 404, 'NOT_FOUND');
      const { owner_code } = ownerRow.rows[0];

      const baseWhere = search
        ? 'WHERE d.owner_code = $1 AND (d.name ILIKE $2 OR d.phone_number ILIKE $2)'
        : 'WHERE d.owner_code = $1';
      const params = search ? [owner_code, search] : [owner_code];

      const [countRes, rowsRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total FROM public.drivers d ${baseWhere}`,
          params
        ),
        pool.query(
          `SELECT d.id, d.name, d.phone_number, d.driver_code, d.status,
                  d.wallet_balance, d.created_at,
                  v.registration_number, v.model
             FROM public.drivers d
             LEFT JOIN public.vehicles v ON v.driver_id = d.id
             ${baseWhere}
             ORDER BY d.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, pageSize, offset]
        ),
      ]);

      const total      = countRes.rows[0].total;
      const totalPages = Math.ceil(total / pageSize);

      res.json({
        success: true,
        data: rowsRes.rows,
        pagination: { page, pageSize, total, totalPages },
      });
    } catch (err) { next(err); }
  }
);

// POST /api/owner/drivers
router.post(
  '/drivers',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const ownerId = resolveOwnerId(req);
      const { name, phone_number, company_id } = req.body;
      if (!name || !phone_number)
        throw new AppError('name and phone_number are required', 400, 'VALIDATION_ERROR');
      if (!/^[6-9]\d{9}$/.test(phone_number))
        throw new AppError('Valid 10-digit Indian mobile required', 400, 'VALIDATION_ERROR');

      const ownerRow = await pool.query(
        'SELECT owner_code, company_id FROM public.owners WHERE id = $1 LIMIT 1',
        [ownerId]
      );
      if (!ownerRow.rows[0]) throw new AppError('Owner not found', 404, 'NOT_FOUND');
      const { owner_code, company_id: ownerCompanyId } = ownerRow.rows[0];

      const existing = await pool.query(
        'SELECT id FROM public.drivers WHERE phone_number = $1 LIMIT 1',
        [phone_number]
      );
      if (existing.rows[0])
        throw new AppError('Phone number already registered', 409, 'CONFLICT');

      const driver_code = generateDriverCode();
      const { rows } = await pool.query(
        `INSERT INTO public.drivers
           (name, phone_number, driver_code, owner_id, owner_code, company_id, status, wallet_balance)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', 0)
         RETURNING id, name, phone_number, driver_code, status, created_at`,
        [name, phone_number, driver_code, ownerId, owner_code, company_id || ownerCompanyId]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

// GET /api/owner/drivers/:id
router.get(
  '/drivers/:id',
  requireRole('owner', 'admin', 'manager'),
  async (req, res, next) => {
    try {
      const ownerId  = resolveOwnerId(req);
      const driverId = req.params.id;

      const { rows } = await pool.query(
        `SELECT d.id, d.name, d.phone_number, d.driver_code, d.status,
                d.wallet_balance, d.owner_id, d.company_id, d.created_at,
                v.id AS vehicle_id, v.registration_number, v.model, v.status AS vehicle_status
           FROM public.drivers d
           LEFT JOIN public.vehicles v ON v.driver_id = d.id
          WHERE d.id = $1 AND d.owner_id = $2
          LIMIT 1`,
        [driverId, ownerId]
      );
      if (!rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
      res.json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

// PUT /api/owner/drivers/:id/deactivate
router.put(
  '/drivers/:id/deactivate',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const ownerId  = resolveOwnerId(req);
      const driverId = req.params.id;

      const { rowCount } = await pool.query(
        "UPDATE public.drivers SET status = 'INACTIVE' WHERE id = $1 AND owner_id = $2",
        [driverId, ownerId]
      );
      if (rowCount === 0)
        throw new AppError('Driver not found or not owned by you', 404, 'NOT_FOUND');

      res.json({ success: true, message: 'Driver deactivated' });
    } catch (err) { next(err); }
  }
);

// GET /api/owner/vehicles
router.get(
  '/vehicles',
  requireRole('owner', 'admin', 'manager'),
  async (req, res, next) => {
    try {
      const ownerId = resolveOwnerId(req);
      const { rows } = await pool.query(
        `SELECT v.id, v.registration_number, v.model, v.status,
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
  }
);

// POST /api/owner/vehicles
router.post(
  '/vehicles',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const ownerId = resolveOwnerId(req);
      const { registration_number, model } = req.body;
      if (!registration_number)
        throw new AppError('registration_number is required', 400, 'VALIDATION_ERROR');

      const duplicate = await pool.query(
        'SELECT id FROM public.vehicles WHERE registration_number = $1 LIMIT 1',
        [registration_number.toUpperCase()]
      );
      if (duplicate.rows[0])
        throw new AppError('Vehicle already registered', 409, 'CONFLICT');

      const { rows } = await pool.query(
        `INSERT INTO public.vehicles (registration_number, model, owner_id, status)
         VALUES ($1, $2, $3, 'AVAILABLE')
         RETURNING id, registration_number, model, status, created_at`,
        [registration_number.toUpperCase(), model || null, ownerId]
      );
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

// GET /api/owner/collections/trend — always returns 30-day array, never empty
router.get(
  '/collections/trend',
  requireRole('owner', 'admin', 'manager'),
  async (req, res, next) => {
    try {
      const ownerId = resolveOwnerId(req);

      const ownerRow = await pool.query(
        'SELECT owner_code FROM public.owners WHERE id = $1 LIMIT 1',
        [ownerId]
      );
      if (!ownerRow.rows[0]) throw new AppError('Owner not found', 404, 'NOT_FOUND');
      const { owner_code } = ownerRow.rows[0];

      const { rows } = await pool.query(
        `SELECT
           COALESCE(order_completion_date, order_initiation_date)::date AS day,
           COALESCE(SUM(CASE WHEN payment_mode != 'CASH' THEN order_amount ELSE 0 END), 0) AS online,
           COALESCE(SUM(CASE WHEN payment_mode = 'CASH'  THEN order_amount ELSE 0 END), 0) AS cash
         FROM public.ms_orders
        WHERE owner_code = $1
          AND transaction_status = 'SUCCESS'
          AND COALESCE(order_completion_date, order_initiation_date)::date
              >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY 1`,
        [owner_code]
      );

      const dataMap = {};
      for (const row of rows) {
        dataMap[row.day.toISOString().slice(0, 10)] = {
          online: Number(row.online),
          cash:   Number(row.cash),
        };
      }

      // Always exactly 30 items — fill zeros for days with no data
      const trend = [];
      for (let i = 29; i >= 0; i--) {
        const d   = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        trend.push({
          day:    key,
          online: dataMap[key]?.online ?? 0,
          cash:   dataMap[key]?.cash   ?? 0,
        });
      }

      res.json({ success: true, data: trend });
    } catch (err) { next(err); }
  }
);

// POST /api/owner/wallet-entry — atomic wallet mutation
router.post(
  '/wallet-entry',
  requireRole('owner', 'admin', 'manager'),
  requirePermission('record_cash'),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const ownerId = resolveOwnerId(req);
      const { driver_id, amount, entry_type, description } = req.body;
      if (!driver_id || amount == null || !entry_type)
        throw new AppError('driver_id, amount, and entry_type are required', 400, 'VALIDATION_ERROR');

      await client.query('BEGIN');

      const driverRes = await client.query(
        'SELECT id, wallet_balance FROM public.drivers WHERE id = $1 AND owner_id = $2 FOR UPDATE',
        [driver_id, ownerId]
      );
      if (!driverRes.rows[0]) {
        await client.query('ROLLBACK');
        throw new AppError('Driver not found', 404, 'NOT_FOUND');
      }

      const ledgerRes = await client.query(
        `INSERT INTO public.driver_ledger (driver_id, entry_type, amount, description, recorded_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [driver_id, entry_type, amount, description || null, req.user.id]
      );

      const newBalanceRes = await client.query(
        `UPDATE public.drivers SET wallet_balance = wallet_balance + $1
          WHERE id = $2
          RETURNING wallet_balance`,
        [amount, driver_id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          ledger_id:      ledgerRes.rows[0].id,
          wallet_balance: Number(newBalanceRes.rows[0].wallet_balance),
          created_at:     ledgerRes.rows[0].created_at,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
