// apps/api/src/controllers/assignment.controller.js — DevSpec §assignment
'use strict';

const pool         = require('../config/db');
const { AppError } = require('../utils/errors');

// POST /api/assignment/assign
exports.assign = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { driver_id, vehicle_id, rent_amount, rent_model, deposit_amount } = req.body;
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : jwtOwnerId;

    await client.query('BEGIN');

    const driverRes = await client.query(
      'SELECT id, status, owner_id FROM public.drivers WHERE id = $1 FOR UPDATE',
      [driver_id]
    );
    if (!driverRes.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Driver not found', 404, 'NOT_FOUND');
    }
    if (ownerId && driverRes.rows[0].owner_id !== ownerId) {
      await client.query('ROLLBACK');
      throw new AppError('Driver does not belong to your fleet', 403, 'FORBIDDEN');
    }

    const driverAlreadyAssigned = await client.query(
      "SELECT id FROM public.vehicles WHERE driver_id = $1 AND status = 'ASSIGNED' LIMIT 1",
      [driver_id]
    );
    if (driverAlreadyAssigned.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Driver is already assigned to a vehicle', 409, 'CONFLICT');
    }

    const vehicleRes = await client.query(
      'SELECT id, status, owner_id, driver_id FROM public.vehicles WHERE id = $1 FOR UPDATE',
      [vehicle_id]
    );
    if (!vehicleRes.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }
    if (ownerId && vehicleRes.rows[0].owner_id !== ownerId) {
      await client.query('ROLLBACK');
      throw new AppError('Vehicle does not belong to your fleet', 403, 'FORBIDDEN');
    }
    if (vehicleRes.rows[0].status !== 'AVAILABLE') {
      await client.query('ROLLBACK');
      throw new AppError(
        `Vehicle is not available (current status: ${vehicleRes.rows[0].status})`,
        409, 'CONFLICT'
      );
    }

    const effectiveOwnerId = ownerId || vehicleRes.rows[0].owner_id;

    const assignRes = await client.query(
      `INSERT INTO public.assignments
         (driver_id, vehicle_id, owner_id, rent_amount, rent_model, deposit_amount, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, assigned_at`,
      [driver_id, vehicle_id, effectiveOwnerId,
       rent_amount || null, rent_model || null, deposit_amount || null]
    );

    await client.query(
      "UPDATE public.vehicles SET driver_id = $1, status = 'ASSIGNED', updated_at = NOW() WHERE id = $2",
      [driver_id, vehicle_id]
    );

    await client.query(
      "UPDATE public.drivers SET status = 'ACTIVE' WHERE id = $1",
      [driver_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        assignment_id: assignRes.rows[0].id,
        driver_id,
        vehicle_id,
        assigned_at:   assignRes.rows[0].assigned_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/assignment/unassign
exports.unassign = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { driver_id, vehicle_id } = req.body;
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : jwtOwnerId;

    await client.query('BEGIN');

    const vehicleRes = await client.query(
      'SELECT id, driver_id, owner_id, status FROM public.vehicles WHERE id = $1 FOR UPDATE',
      [vehicle_id]
    );
    if (!vehicleRes.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }
    if (ownerId && vehicleRes.rows[0].owner_id !== ownerId) {
      await client.query('ROLLBACK');
      throw new AppError('Vehicle does not belong to your fleet', 403, 'FORBIDDEN');
    }
    if (String(vehicleRes.rows[0].driver_id) !== String(driver_id)) {
      await client.query('ROLLBACK');
      throw new AppError('Driver is not assigned to this vehicle', 409, 'CONFLICT');
    }

    await client.query(
      "UPDATE public.vehicles SET driver_id = NULL, status = 'AVAILABLE', updated_at = NOW() WHERE id = $1",
      [vehicle_id]
    );

    await client.query(
      `UPDATE public.assignments
          SET unassigned_at = NOW()
        WHERE driver_id = $1 AND vehicle_id = $2 AND unassigned_at IS NULL`,
      [driver_id, vehicle_id]
    );

    let incentiveApplied = false;
    const effectiveOwnerId = ownerId || vehicleRes.rows[0].owner_id;
    if (effectiveOwnerId) {
      const incentiveRes = await client.query(
        `SELECT id FROM public.owner_incentive_rules
          WHERE owner_id = $1 AND is_active = true LIMIT 1`,
        [effectiveOwnerId]
      );
      if (incentiveRes.rows[0]) {
        await client.query(
          `UPDATE public.assignments SET incentive_applied = true
            WHERE driver_id = $1 AND vehicle_id = $2 AND unassigned_at IS NOT NULL
            ORDER BY unassigned_at DESC
            LIMIT 1`,
          [driver_id, vehicle_id]
        );
        incentiveApplied = true;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        driver_id,
        vehicle_id,
        unassigned_at:     new Date(),
        incentive_applied: incentiveApplied,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/assignment/history/:driverId
exports.getHistory = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const page     = Math.max(1, parseInt(req.query.page     || '1',  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const offset   = (page - 1) * pageSize;

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS total FROM public.assignments WHERE driver_id = $1',
        [driverId]
      ),
      pool.query(
        `SELECT a.id, a.driver_id, a.vehicle_id, a.owner_id,
                a.rent_amount, a.rent_model, a.deposit_amount,
                a.assigned_at, a.unassigned_at, a.incentive_applied,
                v.registration_number, v.model
           FROM public.assignments a
           LEFT JOIN public.vehicles v ON v.id = a.vehicle_id
          WHERE a.driver_id = $1
          ORDER BY a.assigned_at DESC
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
