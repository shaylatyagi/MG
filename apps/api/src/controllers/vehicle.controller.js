// apps/api/src/controllers/vehicle.controller.js — DevSpec §vehicle
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

// GET /api/vehicle
exports.list = async (req, res, next) => {
  try {
    const ownerId     = resolveOwnerId(req);
    const whereClause = ownerId ? 'WHERE v.owner_id = $1' : '';
    const params      = ownerId ? [ownerId] : [];

    const { rows } = await pool.query(
      `SELECT v.id, v.reg_number, v.model, v.status,
              v.driver_id, d.name AS driver_name, d.phone_number AS driver_phone,
              d.driver_code, v.created_at, v.updated_at
         FROM public.vehicles v
         LEFT JOIN public.drivers d ON d.id = v.driver_id
         ${whereClause}
         ORDER BY v.created_at DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// POST /api/vehicle
exports.create = async (req, res, next) => {
  try {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) throw new AppError('owner_id required for admin', 400, 'VALIDATION_ERROR');

    const { reg_number, model } = req.body;
    const normalised = reg_number.toUpperCase().replace(/\s/g, '');

    const duplicate = await pool.query(
      'SELECT id FROM public.vehicles WHERE reg_number = $1 LIMIT 1',
      [normalised]
    );
    if (duplicate.rows[0])
      throw new AppError('Vehicle with this registration already exists', 409, 'CONFLICT');

    const { rows } = await pool.query(
      `INSERT INTO public.vehicles (reg_number, model, owner_id, status)
       VALUES ($1, $2, $3, 'AVAILABLE')
       RETURNING id, reg_number, model, status, owner_id, created_at`,
      [normalised, model || null, ownerId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/vehicle/:id
exports.update = async (req, res, next) => {
  try {
    const ownerId   = resolveOwnerId(req);
    const vehicleId = req.params.id;
    const { model, reg_number } = req.body;

    const setClauses = [];
    const values     = [];

    if (model !== undefined) {
      values.push(model);
      setClauses.push(`model = $${values.length}`);
    }
    if (reg_number !== undefined) {
      values.push(reg_number.toUpperCase().replace(/\s/g, ''));
      setClauses.push(`reg_number = $${values.length}`);
    }

    if (setClauses.length === 0)
      throw new AppError('No updatable fields provided', 400, 'VALIDATION_ERROR');

    setClauses.push('updated_at = NOW()');

    values.push(vehicleId);
    const idParam    = values.length;
    const ownerClause = ownerId
      ? (values.push(ownerId), `AND owner_id = $${values.length}`)
      : '';

    const { rowCount, rows } = await pool.query(
      `UPDATE public.vehicles
          SET ${setClauses.join(', ')}
        WHERE id = $${idParam} ${ownerClause}
        RETURNING id, reg_number, model, status, updated_at`,
      values
    );
    if (rowCount === 0) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/vehicle/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    const ownerId   = resolveOwnerId(req);
    const vehicleId = req.params.id;
    const { status } = req.body;

    const VALID_STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'INACTIVE'];
    if (!status || !VALID_STATUSES.includes(status))
      throw new AppError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400, 'VALIDATION_ERROR');

    const params      = [status, vehicleId];
    const ownerClause = ownerId ? (params.push(ownerId), `AND owner_id = $${params.length}`) : '';

    const { rowCount, rows } = await pool.query(
      `UPDATE public.vehicles
          SET status = $1, updated_at = NOW()
        WHERE id = $2 ${ownerClause}
        RETURNING id, reg_number, status, updated_at`,
      params
    );
    if (rowCount === 0) throw new AppError('Vehicle not found', 404, 'NOT_FOUND');

    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
