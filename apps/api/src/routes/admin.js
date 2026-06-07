// apps/api/src/routes/admin.js — per DevSpec §13.8
// All admin routes: JWT role=admin + x-admin-key header (dual factor)
const router = require('express').Router();
const { requireAdminKey } = require('../middleware/roleCheck');
const pool = require('../config/db');

// Apply dual-factor to ALL admin routes
router.use(requireAdminKey);

// GET /api/admin/platform-stats
router.get('/platform-stats', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM client_companies)::int           AS total_companies,
        (SELECT COUNT(*) FROM owners)::int                     AS total_owners,
        (SELECT COUNT(*) FROM drivers WHERE deleted_at IS NULL)::int AS total_drivers,
        (SELECT COUNT(*) FROM vehicles WHERE status != 'INACTIVE')::int AS total_vehicles,
        COALESCE((SELECT SUM(amount) FROM ms_orders
          WHERE transaction_status = 'SUCCESS'
          AND payment_date >= CURRENT_DATE), 0)               AS gmv_today,
        COALESCE((SELECT SUM(amount) FROM ms_orders
          WHERE transaction_status = 'SUCCESS'
          AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS gmv_month,
        COALESCE((SELECT SUM(amount) FROM ms_orders
          WHERE transaction_status = 'SUCCESS'), 0)            AS gmv_total
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/admin/companies — single CTE, never N+1 (per DevSpec §13.8)
router.get('/companies', async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await pool.query(`
      SELECT
        c.id, c.company_name, c.company_code, c.company_status, c.city, c.created_at,
        COUNT(DISTINCT o.id)::int  AS owner_count,
        COUNT(DISTINCT d.id)::int  AS driver_count,
        COUNT(DISTINCT v.id)::int  AS vehicle_count,
        COALESCE(SUM(mo.amount) FILTER (WHERE mo.transaction_status = 'SUCCESS'), 0) AS total_revenue
      FROM client_companies c
      LEFT JOIN owners  o  ON o.company_id = c.id
      LEFT JOIN drivers d  ON d.owner_id   = o.id AND d.deleted_at IS NULL
      LEFT JOIN vehicles v ON v.owner_id   = o.id AND v.status != 'INACTIVE'
      LEFT JOIN ms_orders mo ON mo.driver_id = d.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// POST /api/admin/companies
router.post('/companies', async (req, res, next) => {
  try {
    const { company_name, cin, city } = req.body;
    if (!company_name) throw require('../utils/errors').AppError('company_name required', 400, 'VALIDATION_ERROR');
    const code = company_name.replace(/\s+/g, '_').toUpperCase().slice(0, 20) + '_' + Date.now().toString(36).toUpperCase();
    const { rows } = await pool.query(
      'INSERT INTO client_companies (company_name, company_code, cin, city) VALUES ($1, $2, $3, $4) RETURNING *',
      [company_name, code, cin || null, city || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/admin/companies/:id/status
router.patch('/companies/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];
    if (!valid.includes(status)) throw new (require('../utils/errors').AppError)(`status must be one of: ${valid.join(', ')}`, 400, 'VALIDATION_ERROR');
    const { rows } = await pool.query(
      'UPDATE client_companies SET company_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) throw new (require('../utils/errors').AppError)('Company not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// GET /api/admin/companies/:id/owners
router.get('/companies/:id/owners', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, phone_number, status, subscription_status, created_at FROM owners WHERE company_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/admin/owners/:id/drivers
router.get('/owners/:id/drivers', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.name, d.phone_number, d.wallet_balance, d.status, d.kyc_status, d.created_at,
              v.reg_number AS vehicle_reg
       FROM drivers d
       LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id
       WHERE d.owner_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/admin/documents?status=pending — KYC queue
router.get('/documents', async (req, res, next) => {
  try {
    const status = req.query.status?.toUpperCase();
    const where  = status ? "AND d.kyc_status = $1" : "";
    const params = status ? [status] : [];
    const { rows } = await pool.query(`
      SELECT d.id, d.name, d.phone_number, d.kyc_status,
             o.name AS owner_name, c.company_name
      FROM drivers d
      JOIN owners          o ON o.id = d.owner_id
      JOIN client_companies c ON c.id = d.company_id
      WHERE d.deleted_at IS NULL ${where}
      ORDER BY d.created_at DESC
      LIMIT 500
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// POST /api/admin/documents/:id/approve
router.post('/documents/:id/approve', async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE drivers SET kyc_status = 'APPROVED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/admin/documents/:id/reject
router.post('/documents/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    await pool.query(
      "UPDATE drivers SET kyc_status = 'REJECTED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true, reason });
  } catch (err) { next(err); }
});

module.exports = router;
