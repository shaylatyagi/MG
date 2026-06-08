// apps/api/src/routes/manager.js — per DevSpec §manager routes
const router             = require('express').Router();
const pool               = require('../config/db');
const { requireRole }    = require('../middleware/roleCheck');
const { AppError }       = require('../utils/errors');

// ── Helper: resolve owner_id from JWT ────────────────────────────────────────
const resolveOwnerId = (req) => {
  const { role, id, owner_id } = req.user;
  if (role === 'owner') return id;
  if (role === 'admin') return req.query.owner_id || req.body.owner_id || null;
  throw new AppError('Owner context required', 403, 'FORBIDDEN');
};

const VALID_PERMISSIONS = [
  'view_drivers',
  'record_cash',
  'view_collections',
  'view_reports',
  'manage_vehicles',
];

// GET /api/manager — owner's managers list
router.get(
  '/',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const ownerId     = resolveOwnerId(req);
      const whereClause = ownerId ? "WHERE m.owner_id = $1 AND m.status != 'INACTIVE'" : "WHERE m.status != 'INACTIVE'";
      const params      = ownerId ? [ownerId] : [];

      const { rows } = await pool.query(
        `SELECT m.id, m.name, m.phone_number, m.permissions, m.status, m.created_at
           FROM public.managers m
           ${whereClause}
           ORDER BY m.created_at DESC`,
        params
      );

      res.json({ success: true, data: rows });
    } catch (err) { next(err); }
  }
);

// POST /api/manager — create manager
router.post(
  '/',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) throw new AppError('owner_id required for admin', 400, 'VALIDATION_ERROR');

      const { name, phone_number, permissions } = req.body;
      if (!name || !phone_number)
        throw new AppError('name and phone_number are required', 400, 'VALIDATION_ERROR');
      if (!/^[6-9]\d{9}$/.test(phone_number))
        throw new AppError('Valid 10-digit Indian mobile required', 400, 'VALIDATION_ERROR');

      const perms   = Array.isArray(permissions) ? permissions : [];
      const invalid = perms.filter(p => !VALID_PERMISSIONS.includes(p));
      if (invalid.length > 0)
        throw new AppError(
          `Invalid permissions: ${invalid.join(', ')}. Valid: ${VALID_PERMISSIONS.join(', ')}`,
          400, 'VALIDATION_ERROR'
        );

      const existing = await pool.query(
        "SELECT id FROM public.managers WHERE phone_number = $1 AND status != 'INACTIVE' LIMIT 1",
        [phone_number]
      );
      if (existing.rows[0])
        throw new AppError('Phone number already registered to a manager', 409, 'CONFLICT');

      const { rows } = await pool.query(
        `INSERT INTO public.managers (owner_id, name, phone_number, permissions, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         RETURNING id, name, phone_number, permissions, status, created_at`,
        [ownerId, name, phone_number, JSON.stringify(perms)]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) { next(err); }
  }
);

// DELETE /api/manager/:id — soft-delete (set status = INACTIVE)
router.delete(
  '/:id',
  requireRole('owner', 'admin'),
  async (req, res, next) => {
    try {
      const ownerId   = resolveOwnerId(req);
      const managerId = req.params.id;

      const params      = ['INACTIVE', managerId];
      const ownerClause = ownerId ? (params.push(ownerId), `AND owner_id = $${params.length}`) : '';

      const { rowCount } = await pool.query(
        `UPDATE public.managers SET status = $1 WHERE id = $2 ${ownerClause}`,
        params
      );
      if (rowCount === 0)
        throw new AppError('Manager not found', 404, 'NOT_FOUND');

      res.json({ success: true, message: 'Manager deactivated' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
