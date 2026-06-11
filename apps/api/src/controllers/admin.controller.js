// apps/api/src/controllers/admin.controller.js — DevSpec §13.8
'use strict';

const pool         = require('../config/db');
const { AppError } = require('../utils/errors');

// ── PLATFORM STATS ──────────────────────────────────────────────────────────
exports.getPlatformStats = async (req, res, next) => {
  try {
    const [countsRes, collectionRes] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM public.client_companies)::int          AS total_companies,
          (SELECT COUNT(*) FROM public.owners)::int                    AS total_owners,
          (SELECT COUNT(*) FROM public.drivers WHERE status != 'INACTIVE')::int AS total_drivers,
          (SELECT COUNT(*) FROM public.vehicles WHERE status != 'INACTIVE')::int AS total_vehicles
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN
            payment_date::date = CURRENT_DATE AND transaction_status = 'SUCCESS'
            THEN amount END), 0) AS collection_today,
          COALESCE(SUM(CASE WHEN
            payment_date >= DATE_TRUNC('month', CURRENT_DATE) AND transaction_status = 'SUCCESS'
            THEN amount END), 0) AS collection_month,
          COALESCE(SUM(CASE WHEN transaction_status = 'SUCCESS' THEN amount END), 0) AS collection_total
        FROM public.ms_orders
      `),
    ]);
    res.json({ success: true, data: { ...countsRes.rows[0], ...collectionRes.rows[0] } });
  } catch (err) { next(err); }
};

// ── COMPANIES — single CTE, never N+1 ──────────────────────────────────────
exports.listCompanies = async (req, res, next) => {
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
          AND   mo.payment_date::date = CURRENT_DATE
        ), 0) AS collection_today,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS collection_month,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
        ), 0) AS total_revenue
      FROM public.client_companies c
      LEFT JOIN public.owners   o  ON o.company_id = c.id
      LEFT JOIN public.drivers  d  ON d.owner_id = o.id AND d.status != 'INACTIVE'
      LEFT JOIN public.vehicles v  ON v.owner_id = o.id AND v.status != 'INACTIVE'
      LEFT JOIN public.ms_orders mo ON mo.owner_id IN (
        SELECT id FROM public.owners WHERE company_id = c.id
      )
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/admin/companies
exports.createCompany = async (req, res, next) => {
  try {
    const { company_name, cin, city } = req.body;
    if (!company_name) throw new AppError('company_name required', 400, 'VALIDATION_ERROR');
    const code = company_name.replace(/\s+/g, '_').toUpperCase().slice(0, 20) +
      '_' + Date.now().toString(36).toUpperCase();
    const { rows } = await pool.query(
      `INSERT INTO public.client_companies (company_name, company_code, cin, city)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [company_name, code, cin || null, city || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PATCH /api/admin/companies/:id/status
exports.updateCompanyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];
    if (!VALID.includes(status))
      throw new AppError(`status must be one of: ${VALID.join(', ')}`, 400, 'VALIDATION_ERROR');
    const { rows } = await pool.query(
      `UPDATE public.client_companies
          SET company_status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) throw new AppError('Company not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/admin/companies/:id/owners
exports.getCompanyOwners = async (req, res, next) => {
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
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date::date = CURRENT_DATE
        ), 0) AS collection_today,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS collection_month,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
        ), 0) AS collection_total
      FROM public.owners o
      LEFT JOIN public.drivers  d  ON d.owner_id = o.id AND d.status != 'INACTIVE'
      LEFT JOIN public.vehicles v  ON v.owner_id = o.id AND v.status != 'INACTIVE'
      LEFT JOIN public.ms_orders mo ON mo.owner_id = o.id
      WHERE o.company_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/admin/owners/:id/drivers
exports.getOwnerDrivers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        d.id,
        d.name,
        d.phone_number,
        d.status,
        d.kyc_status,
        d.wallet_balance,
        d.created_at,
        v.reg_number AS vehicle_number,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date::date = CURRENT_DATE
        ), 0) AS paid_today,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
          AND   mo.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS paid_month,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
        ), 0) AS total_paid,
        MAX(mo.payment_date) FILTER (
          WHERE mo.transaction_status = 'SUCCESS'
        ) AS last_payment_date
      FROM public.drivers d
      LEFT JOIN public.vehicles  v  ON v.driver_id = d.id AND v.status = 'ASSIGNED'
      LEFT JOIN public.ms_orders mo ON mo.driver_id = d.id
      WHERE d.owner_id = $1 AND d.status != 'INACTIVE'
      GROUP BY d.id, v.reg_number
      ORDER BY d.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/admin/drivers/:id
exports.getDriverDetail = async (req, res, next) => {
  try {
    const id = req.params.id;
    const [driverRes, ledgerRes, statsRes] = await Promise.all([
      pool.query(`
        SELECT
          d.id, d.name, d.phone_number,
          d.status, d.kyc_status, d.wallet_balance, d.created_at,
          o.name         AS owner_name,
          o.phone_number AS owner_phone,
          c.company_name,
          v.reg_number AS vehicle_number,
          v.model      AS vehicle_model
        FROM public.drivers d
        LEFT JOIN public.owners           o ON o.id = d.owner_id
        LEFT JOIN public.client_companies c ON c.id = d.company_id
        LEFT JOIN public.vehicles         v ON v.driver_id = d.id AND v.status = 'ASSIGNED'
        WHERE d.id = $1
      `, [id]),
      pool.query(`
        SELECT id, entry_type, amount, description, created_at
        FROM public.driver_ledger
        WHERE driver_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, [id]),
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE transaction_status = 'SUCCESS'), 0) AS total_paid,
          COALESCE(SUM(amount) FILTER (
            WHERE transaction_status = 'SUCCESS'
            AND   payment_date::date = CURRENT_DATE
          ), 0) AS paid_today,
          COUNT(*) FILTER (WHERE transaction_status = 'SUCCESS')::int AS payment_count
        FROM public.ms_orders
        WHERE driver_id = $1
      `, [id]),
    ]);
    if (!driverRes.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    res.json({
      success: true,
      data: { driver: { ...driverRes.rows[0], ...statsRes.rows[0] }, ledger: ledgerRes.rows },
    });
  } catch (err) { next(err); }
};

// POST /api/admin/drivers
exports.createDriver = async (req, res, next) => {
  try {
    const { name, phone_number, owner_id, emergency_contact } = req.body;
    if (!name || !phone_number || !owner_id)
      throw new AppError('name, phone_number, owner_id required', 400, 'VALIDATION_ERROR');
    const ownerRes = await pool.query(
      'SELECT company_id FROM public.owners WHERE id = $1 LIMIT 1', [owner_id]
    );
    if (!ownerRes.rows[0]) throw new AppError('Owner not found', 404, 'NOT_FOUND');
    const { rows } = await pool.query(
      `INSERT INTO public.drivers (owner_id, company_id, name, phone_number, emergency_contact)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [owner_id, ownerRes.rows[0].company_id, name.trim(), phone_number, emergency_contact || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PATCH /api/admin/drivers/:id/status
exports.updateDriverStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!VALID.includes(status))
      throw new AppError(`status must be one of: ${VALID.join(', ')}`, 400, 'VALIDATION_ERROR');
    const { rows } = await pool.query(
      `UPDATE public.drivers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ── VEHICLES ────────────────────────────────────────────────────────────────
exports.listVehicles = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status && req.query.status !== 'ALL' ? req.query.status : null;

    const params = [limit, offset];
    let whereClause = "v.status != 'INACTIVE'";
    if (status) {
      params.push(status);
      whereClause = 'v.status = $' + params.length;
    }

    const { rows } = await pool.query(`
      SELECT
        v.id, v.reg_number, v.type, v.model, v.status,
        v.rent_type, v.daily_rent, v.created_at,
        o.name         AS owner_name,
        o.phone_number AS owner_phone,
        c.company_name,
        d.name         AS driver_name,
        d.phone_number AS driver_phone,
        d.status       AS driver_status
      FROM public.vehicles v
      LEFT JOIN public.owners           o ON o.id = v.owner_id
      LEFT JOIN public.client_companies c ON c.id = v.company_id
      LEFT JOIN public.drivers          d ON d.id = v.driver_id
      WHERE ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── TRANSACTIONS (ADM-03) ───────────────────────────────────────────────────
exports.listTransactions = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { date_from, date_to, status, phone, order_id } = req.query;

    const params = [limit, offset];
    const conditions = [];

    if (date_from)                    { params.push(date_from); conditions.push('mo.payment_date::date >= $' + params.length + '::date'); }
    if (date_to)                      { params.push(date_to);   conditions.push('mo.payment_date::date <= $' + params.length + '::date'); }
    if (status && status !== 'ALL')   { params.push(status);    conditions.push('mo.transaction_status = $' + params.length); }
    if (phone)                        { params.push(phone);     conditions.push('d.phone_number = $' + params.length); }
    if (order_id)                     { params.push(order_id);  conditions.push('mo.order_id = $' + params.length); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const { rows } = await pool.query(`
      SELECT
        mo.id,
        mo.order_id,
        mo.txn_id,
        mo.amount,
        mo.payment_mode,
        mo.transaction_status,
        mo.payment_date,
        mo.created_at,
        d.name         AS driver_name,
        d.phone_number AS driver_phone,
        o.name         AS owner_name,
        c.company_name
      FROM public.ms_orders mo
      LEFT JOIN public.drivers          d ON d.id = mo.driver_id
      LEFT JOIN public.owners           o ON o.id = mo.owner_id
      LEFT JOIN public.client_companies c ON c.id = o.company_id
      ${where}
      ORDER BY mo.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── KYC / DOCUMENTS ─────────────────────────────────────────────────────────
exports.getKycSummary = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT kyc_status AS status, COUNT(*)::int AS count
      FROM public.drivers WHERE status != 'INACTIVE'
      GROUP BY kyc_status ORDER BY kyc_status
    `);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// Returns drivers with their per-document status objects
async function fetchKycDrivers(statusFilter) {
  const where  = statusFilter ? 'AND d.kyc_status = $1' : '';
  const params = statusFilter ? [statusFilter] : [];
  const { rows } = await pool.query(`
    SELECT
      d.id,
      d.name,
      d.phone_number,
      d.kyc_status,
      d.status       AS driver_status,
      d.wallet_balance,
      d.created_at,
      o.name         AS owner_name,
      c.company_name,
      v.reg_number   AS vehicle_number,
      COALESCE(
        json_agg(
          json_build_object(
            'id',               doc.id,
            'doc_type',         doc.doc_type,
            'status',           doc.status,
            'rejection_reason', doc.rejection_reason,
            'file_url',         doc.file_url
          ) ORDER BY doc.uploaded_at
        ) FILTER (WHERE doc.id IS NOT NULL),
        '[]'::json
      ) AS documents
    FROM public.drivers d
    LEFT JOIN public.owners           o   ON o.id = d.owner_id
    LEFT JOIN public.client_companies c   ON c.id = d.company_id
    LEFT JOIN public.vehicles         v   ON v.driver_id = d.id AND v.status = 'ASSIGNED'
    LEFT JOIN public.documents        doc ON doc.entity_type = 'driver' AND doc.entity_id = d.id
    WHERE d.status != 'INACTIVE' ${where}
    GROUP BY d.id, o.name, c.company_name, v.reg_number
    ORDER BY d.created_at DESC
    LIMIT 500
  `, params);
  return rows;
}

exports.getKycPending = async (req, res, next) => {
  try {
    const rows = await fetchKycDrivers('PENDING');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getAllKyc = async (req, res, next) => {
  try {
    const status = (req.query.status && req.query.status !== 'ALL') ? req.query.status : null;
    const rows = await fetchKycDrivers(status);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.approveKyc = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      "UPDATE public.drivers SET kyc_status = 'APPROVED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    if (!rowCount) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.rejectKyc = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new AppError('rejection reason required', 400, 'VALIDATION_ERROR');
    const { rowCount } = await pool.query(
      "UPDATE public.drivers SET kyc_status = 'REJECTED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    if (!rowCount) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── PER-DOCUMENT APPROVAL (KYC-06) ──────────────────────────────────────────
// GET /api/admin/documents?status=pending
exports.listDocuments = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status && req.query.status !== 'ALL' ? req.query.status : null;

    const params = [limit, offset];
    const conditions = ["doc.entity_type = 'driver'"];
    if (status) { params.push(status); conditions.push('doc.status = $' + params.length); }

    const { rows } = await pool.query(`
      SELECT
        doc.id,
        doc.entity_id  AS driver_id,
        doc.doc_type,
        doc.status,
        doc.rejection_reason,
        doc.uploaded_at,
        doc.reviewed_at,
        d.name         AS driver_name,
        d.phone_number AS driver_phone,
        o.name         AS owner_name,
        c.company_name
      FROM public.documents doc
      LEFT JOIN public.drivers          d ON d.id = doc.entity_id
      LEFT JOIN public.owners           o ON o.id = d.owner_id
      LEFT JOIN public.client_companies c ON c.id = d.company_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY doc.uploaded_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// PATCH /api/admin/documents/:id/approve
exports.approveDocument = async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE public.documents
          SET status = 'approved', reviewed_at = NOW()
        WHERE id = $1 AND entity_type = 'driver'`,
      [req.params.id]
    );
    if (!rowCount) throw new AppError('Document not found', 404, 'NOT_FOUND');
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /api/admin/documents/:id/reject
exports.rejectDocument = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new AppError('rejection reason required', 400, 'VALIDATION_ERROR');
    const { rowCount } = await pool.query(
      `UPDATE public.documents
          SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW()
        WHERE id = $2 AND entity_type = 'driver'`,
      [reason, req.params.id]
    );
    if (!rowCount) throw new AppError('Document not found', 404, 'NOT_FOUND');
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── AUDIT LOG ───────────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await pool.query(`
      SELECT id, actor_id, actor_role, action, entity_type, entity_id,
             before_state, after_state, ip_address, created_at
      FROM public.audit_log
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
