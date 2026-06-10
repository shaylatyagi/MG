// apps/api/src/controllers/driver.controller.js — DevSpec §13.3
'use strict';

const pool         = require('../config/db');
const { AppError } = require('../utils/errors');

const resolveDriverId = (req) => {
  const { role, id } = req.user;
  if (role === 'driver') return id;
  const driverId = req.query.driverId || req.body.driverId;
  if (!driverId)
    throw new AppError('driverId query param required for this role', 400, 'VALIDATION_ERROR');
  return driverId;
};

// GET /api/driver/profile
exports.getProfile = async (req, res, next) => {
  try {
    const driverId = resolveDriverId(req);
    const { rows } = await pool.query(
      `SELECT d.id, d.name, d.phone_number, d.driver_code, d.status,
              d.owner_id, d.company_id, d.created_at,
              v.registration_number, v.model, v.status AS vehicle_status
         FROM public.drivers d
         LEFT JOIN public.vehicles v ON v.driver_id = d.id AND v.status = 'ASSIGNED'
        WHERE d.id = $1
        LIMIT 1`,
      [driverId]
    );
    if (!rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/driver/wallet
exports.getWallet = async (req, res, next) => {
  try {
    const driverId = resolveDriverId(req);

    const [walletRes, ledgerRes] = await Promise.all([
      pool.query(
        'SELECT wallet_balance FROM public.drivers WHERE id = $1 LIMIT 1',
        [driverId]
      ),
      pool.query(
        `SELECT id, entry_type, amount, description, created_at
           FROM public.driver_ledger
          WHERE driver_id = $1
          ORDER BY created_at DESC
          LIMIT 5`,
        [driverId]
      ),
    ]);

    if (!walletRes.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');

    res.json({
      success: true,
      data: {
        balance:       walletRes.rows[0].wallet_balance,
        recentEntries: ledgerRes.rows,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/driver/ledger?page=1&pageSize=20
exports.getLedger = async (req, res, next) => {
  try {
    const driverId  = resolveDriverId(req);
    const page      = Math.max(1, parseInt(req.query.page     || '1',  10));
    const pageSize  = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const offset    = (page - 1) * pageSize;

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS total FROM public.driver_ledger WHERE driver_id = $1',
        [driverId]
      ),
      pool.query(
        `SELECT id, entry_type, amount, description, reference_id, created_at
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

// POST /api/driver/sos
exports.createSos = async (req, res, next) => {
  try {
    const driverId = req.user.id;
    const { lat, lng } = req.body;

    const driverRes = await pool.query(
      'SELECT owner_id, name FROM public.drivers WHERE id = $1 LIMIT 1',
      [driverId]
    );
    if (!driverRes.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    const { owner_id, name } = driverRes.rows[0];

    const sosRes = await pool.query(
      `INSERT INTO public.sos_alerts (driver_id, owner_id, lat, lng)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [driverId, owner_id, lat, lng]
    );

    if (owner_id) {
      await pool.query(
        `INSERT INTO public.notifications
           (recipient_id, recipient_role, type, title, body)
         VALUES ($1, 'owner', 'SOS', $2, $3)`,
        [
          owner_id,
          'SOS Alert',
          `Driver ${name || driverId} has triggered an SOS at (${lat}, ${lng})`,
        ]
      );
    }

    res.status(201).json({ success: true, data: sosRes.rows[0] });
  } catch (err) { next(err); }
};

// GET /api/driver/notifications?page=1
exports.getNotifications = async (req, res, next) => {
  try {
    const recipientId   = req.user.id;
    const recipientRole = req.user.role;
    const page     = Math.max(1, parseInt(req.query.page     || '1',  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const offset   = (page - 1) * pageSize;

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS total FROM public.notifications WHERE recipient_id = $1 AND recipient_role = $2',
        [recipientId, recipientRole]
      ),
      pool.query(
        `SELECT id, type, title, body, read_at, created_at
           FROM public.notifications
          WHERE recipient_id = $1 AND recipient_role = $2
          ORDER BY created_at DESC
          LIMIT $3 OFFSET $4`,
        [recipientId, recipientRole, pageSize, offset]
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
