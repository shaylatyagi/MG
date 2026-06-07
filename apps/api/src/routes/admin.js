// apps/api/src/routes/admin.js — per DevSpec §13.8
// All admin routes: JWT role=admin + x-admin-key header (dual factor — §requireAdminKey)
const router = require('express').Router();
const { requireAdminKey } = require('../middleware/roleCheck');
const { AppError } = require('../utils/errors');
const pool = require('../config/db');

// Apply dual-factor to ALL admin routes
router.use(requireAdminKey);

// ── PLATFORM STATS ─────────────────────────────────────────────────────────
router.get('/platform-stats', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM client_companies)::int                       AS total_companies,
        (SELECT COUNT(*) FROM owners)::int                                 AS total_owners,
        (SELECT COUNT(*) FROM drivers WHERE deleted_at IS NULL)::int       AS total_drivers,
        (SELECT COUNT(*) FROM vehicles WHERE status != 'INACTIVE')::int    AS total_vehicles,
        COALESCE((
          SELECT SUM(amount) FROM ms_orders
          WHERE transaction_status = 'SUCCESS' AND payment_date >= CURRENT_DATE
        ), 0) AS collection_today,
        COALESCE((
          SELECT SUM(amount) FROM ms_orders
          WHERE transaction_status = 'SUCCESS'
          AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS collection_month,
        COALESCE((
          SELECT SUM(amount) FROM ms_orders WHERE transaction_status = 'SUCCESS'
        ), 0) AS collection_total
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── COMPANIES — single CTE, never N+1 (per DevSpec §13.8) ─────────────────
router.get('/companies', async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await pool.query(`
      SELECT
        c.id,
        c.company_name,
        c.company_code,
        c.company_status,
        c.city,
        c.cin,
        c.created_at,
        COUNT(DISTINCT o.id)::int  AS owner_count,
        COUNT(DISTINCT d.id)::int  AS driver_count,
        COUNT(DISTINCT v.id)::int  AS vehicle_count,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date >= CURRENT_DATE
        ), 0) AS collection_today,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS collection_month,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
        ), 0) AS total_revenue
      FROM client_companies c
      LEFT JOIN owners  o  ON o.company_id = c.id
      LEFT JOIN drivers d  ON d.owner_id = o.id AND d.deleted_at IS NULL
      LEFT JOIN vehicles v ON v.owner_id = o.id AND v.status != 'INACTIVE'
      LEFT JOIN ms_orders mo ON mo.driver_id = d.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// POST /api/admin/companies — register new company
router.post('/companies', async (req, res, next) => {
  try {
    const { company_name, cin, city } = req.body;
    if (!company_name) throw new AppError('company_name required', 400, 'VALIDATION_ERROR');
    const code = company_name
      .replace(/\s+/g, '_').toUpperCase().slice(0, 20) +
      '_' + Date.now().toString(36).toUpperCase();
    const { rows } = await pool.query(
      'INSERT INTO client_companies (company_name, company_code, cin, city) VALUES ($1,$2,$3,$4) RETURNING *',
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
    if (!valid.includes(status))
      throw new AppError(`status must be one of: ${valid.join(', ')}`, 400, 'VALIDATION_ERROR');
    const { rows } = await pool.query(
      'UPDATE client_companies SET company_status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) throw new AppError('Company not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── COMPANY DRILL-DOWN: owners with aggregated stats ──────────────────────
router.get('/companies/:id/owners', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id,
        o.name,
        o.phone_number,
        o.status,
        o.subscription_status,
        o.created_at,
        COUNT(DISTINCT d.id)::int  AS driver_count,
        COUNT(DISTINCT v.id)::int  AS vehicle_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'ASSIGNED')::int AS assigned_vehicle_count,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS' AND mo.payment_date >= CURRENT_DATE
        ), 0) AS collection_today,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS collection_month,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
        ), 0) AS collection_total
      FROM owners o
      LEFT JOIN drivers d  ON d.owner_id = o.id AND d.deleted_at IS NULL
      LEFT JOIN vehicles v ON v.owner_id = o.id AND v.status != 'INACTIVE'
      LEFT JOIN ms_orders mo ON mo.driver_id = d.id
      WHERE o.company_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── OWNER DRILL-DOWN: drivers with payment stats ───────────────────────────
router.get('/owners/:id/drivers', async (req, res, next)