// apps/api/src/routes/owner.js — per DevSpec §13.2 + backward-compat aliases
'use strict';

const router                = require('express').Router();
const { requireRole, requirePermission } = require('../middleware/roleCheck');
const { validate, owner: v, assignment: assignV } = require('../validators');
const ctrl                  = require('../controllers/owner.controller');
const assignCtrl            = require('../controllers/assignment.controller');
const pool                  = require('../config/db');

const multer    = require('multer');
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// ── Dashboard stats ───────────────────────────────────────────────────────────
// /dashboard-stats (new canonical) + /stats (backward-compat alias for CRA)
router.get('/dashboard-stats',         requireRole('owner', 'admin', 'manager'), ctrl.getDashboardStats);
router.get('/stats', requireRole('owner', 'admin', 'manager'), async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id
                  : req.query.owner_id ? parseInt(req.query.owner_id, 10)
                  : req.user.id;

    const [veh, drv, contracts, kyc, today, month, total] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM public.vehicles WHERE owner_id = $1`, [ownerId]),
      pool.query(`SELECT COUNT(*)::int AS c FROM public.drivers WHERE owner_id = $1 AND deleted_at IS NULL`, [ownerId]),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM public.driver_vehicle_history
         WHERE owner_id = $1 AND unassigned_at IS NULL`, [ownerId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM public.drivers
         WHERE owner_id = $1 AND kyc_status IN ('PENDING','PARTIAL') AND deleted_at IS NULL`, [ownerId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0)::float AS total FROM public.ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
           AND payment_date::date = CURRENT_DATE`, [ownerId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0)::float AS total FROM public.ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'
           AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', NOW())`, [ownerId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount),0)::float AS total FROM public.ms_orders
         WHERE owner_id = $1 AND transaction_status = 'SUCCESS'`, [ownerId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        total_vehicles:       veh.rows[0].c,
        total_drivers:        drv.rows[0].c,
        active_contracts:     contracts.rows[0].c,
        pending_kyc:          kyc.rows[0].c,
        collection_today:     today.rows[0].total,
        collection_month:     month.rows[0].total,
        collection_total:     total.rows[0].total,
        outstanding:          0,
        collection_efficiency: 0,
      },
    });
  } catch (err) { next(err); }
});

// ── Owner profile ─────────────────────────────────────────────────────────────
router.get('/me', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT o.id, o.name, o.phone_number, o.email, o.status,
              o.subscription_status, o.subscription_expires_at,
              cc.company_name, cc.company_code, cc.city
       FROM public.owners o
       JOIN public.client_companies cc ON cc.id = o.company_id
       WHERE o.id = $1`, [req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

// ── Drivers ───────────────────────────────────────────────────────────────────
router.get('/drivers',                 requireRole('owner', 'admin', 'manager'), ctrl.listDrivers);
router.post('/drivers',                requireRole('owner', 'admin'), validate(v.createDriver), ctrl.createDriver);
router.get('/drivers/:id',             requireRole('owner', 'admin', 'manager'), ctrl.getDriver);
router.put('/drivers/:id/deactivate',  requireRole('owner', 'admin'), ctrl.deactivateDriver);
router.get('/drivers/:id/ledger',      requireRole('owner', 'admin', 'manager'), ctrl.getDriverLedger);
router.get('/drivers/:id/profile',     requireRole('owner', 'admin', 'manager'), ctrl.getDriver); // alias

// CSV upload: /csv-upload (canonical) + /bulk-import (CRA alias)
router.post('/drivers/csv-upload',  requireRole('owner', 'admin'), csvUpload.single('file'), ctrl.csvUploadDrivers);
router.post('/drivers/bulk-import', requireRole('owner', 'admin'), csvUpload.single('file'), ctrl.csvUploadDrivers);

// ── Vehicles ──────────────────────────────────────────────────────────────────
router.get('/vehicles',                requireRole('owner', 'admin', 'manager'), ctrl.listVehicles);
router.post('/vehicles',               requireRole('owner', 'admin'), validate(v.createVehicle), ctrl.createVehicle);
router.put('/vehicles/:id/maintenance', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.body; // 'UNDER_MAINTENANCE' or 'AVAILABLE'
    const newStatus = status || 'UNDER_MAINTENANCE';
    const r = await pool.query(
      `UPDATE public.vehicles SET status = $1, updated_at = NOW()
       WHERE id = $2 AND owner_id = $3 RETURNING id, reg_number, status`,
      [newStatus, req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
});

// ── Assignment (CRA uses /api/owner/assign; apps/api canonical is /api/assignment) ──
router.post('/assign',   requireRole('owner', 'admin'), validate(assignV.assign), assignCtrl.assign);
router.post('/unassign', requireRole('owner', 'admin'), assignCtrl.unassign);

// ── Collections / wallet ──────────────────────────────────────────────────────
router.get('/collections/trend', requireRole('owner', 'admin', 'manager'), ctrl.getCollectionTrend);
router.post('/wallet-entry',
  requireRole('owner', 'admin', 'manager'),
  requirePermission('record_cash'),
  validate(v.createWalletEntry),
  ctrl.createWalletEntry
);

// ── Payments history ──────────────────────────────────────────────────────────
router.get('/payments', requireRole('owner', 'admin', 'manager'), async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : parseInt(req.query.owner_id, 10) || req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const r = await pool.query(
      `SELECT mo.id, mo.order_id, mo.txn_id, mo.amount, mo.payment_mode,
              mo.transaction_status, mo.payment_date, mo.created_at,
              d.name AS driver_name, d.phone_number AS driver_phone
       FROM public.ms_orders mo
       JOIN public.drivers d ON d.id = mo.driver_id
       WHERE mo.owner_id = $1
       ORDER BY mo.created_at DESC
       LIMIT $2 OFFSET $3`,
      [ownerId, parseInt(limit), offset]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

// ── Incentive config ──────────────────────────────────────────────────────────
router.get('/incentive-config',  requireRole('owner', 'admin', 'manager'), ctrl.getIncentiveConfig);
router.post('/incentive-config', requireRole('owner', 'admin'), ctrl.upsertIncentiveConfig);

// ── SOS alerts ────────────────────────────────────────────────────────────────
router.get('/sos', requireRole('owner', 'admin', 'manager'), async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : parseInt(req.query.owner_id, 10) || req.user.id;
    const r = await pool.query(
      `SELECT s.id, s.driver_id, s.lat, s.lng, s.created_at,
              d.name AS driver_name, d.phone_number
       FROM public.sos_alerts s
       JOIN public.drivers d ON d.id = s.driver_id
       WHERE s.owner_id = $1 AND s.resolved_at IS NULL
       ORDER BY s.created_at DESC`,
      [ownerId]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { next(err); }
});

router.post('/sos/:id/resolve', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : parseInt(req.query.owner_id, 10) || req.user.id;
    const r = await pool.query(
      `UPDATE public.sos_alerts SET resolved_at = NOW()
       WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [req.params.id, ownerId]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'SOS alert not found' });
    res.json({ success: true, message: 'SOS resolved' });
  } catch (err) { next(err); }
});

// ── Managers ──────────────────────────────────────────────────────────────────
router.delete('/managers/:id', requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE public.managers SET status = 'INACTIVE'
       WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Manager not found' });
    res.json({ success: true, message: 'Manager revoked' });
  } catch (err) { next(err); }
});

module.exports = router;
