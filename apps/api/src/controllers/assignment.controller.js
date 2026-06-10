// apps/api/src/controllers/assignment.controller.js — DevSpec §13.5
// Table: driver_vehicle_history (NOT assignments)
'use strict';

const pool         = require('../config/db');
const { AppError } = require('../utils/errors');
const { publishNotification } = require('../services/sqs');

/**
 * Calculate incentive credit amount — INC-02/03 DevSpec §13.5
 * @param {'FULL_WAIVER'|'PERCENTAGE'|'FIXED'} type
 * @param {number} value  — percent or fixed amount
 * @param {number} rent   — rent_amount on the history record
 */
function calcIncentive(type, value, rent) {
  const r = Number(rent);
  switch (type) {
    case 'FULL_WAIVER': return r;
    case 'PERCENTAGE':  return parseFloat((r * Number(value) / 100).toFixed(2));
    case 'FIXED':       return Number(value);
    default:            return 0;
  }
}

// POST /api/assignment/assign
exports.assign = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { driver_id, vehicle_id, rent_amount, rent_type, deposit_amount } = req.body;
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : jwtOwnerId;

    await client.query('BEGIN');

    const driverRes = await client.query(
      'SELECT id, status, owner_id, assigned_vehicle_id FROM public.drivers WHERE id = $1 FOR UPDATE',
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
    if (driverRes.rows[0].assigned_vehicle_id) {
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
        `Vehicle is not available (status: ${vehicleRes.rows[0].status})`,
        409, 'CONFLICT'
      );
    }

    const effectiveOwnerId = ownerId || vehicleRes.rows[0].owner_id;

    const historyRes = await client.query(
      `INSERT INTO public.driver_vehicle_history
         (driver_id, vehicle_id, owner_id, rent_type, rent_amount, deposit_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, assigned_at`,
      [driver_id, vehicle_id, effectiveOwnerId,
       rent_type || 'DAILY', rent_amount || 0, deposit_amount || 0]
    );

    await client.query(
      `UPDATE public.vehicles
          SET driver_id = $1, status = 'ASSIGNED', updated_at = NOW()
        WHERE id = $2`,
      [driver_id, vehicle_id]
    );

    await client.query(
      `UPDATE public.drivers
          SET assigned_vehicle_id = $1, updated_at = NOW()
        WHERE id = $2`,
      [vehicle_id, driver_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        history_id:  historyRes.rows[0].id,
        driver_id,
        vehicle_id,
        assigned_at: historyRes.rows[0].assigned_at,
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
      `UPDATE public.vehicles
          SET driver_id = NULL, status = 'AVAILABLE', updated_at = NOW()
        WHERE id = $1`,
      [vehicle_id]
    );

    await client.query(
      `UPDATE public.drivers
          SET assigned_vehicle_id = NULL, updated_at = NOW()
        WHERE id = $1`,
      [driver_id]
    );

    // Close the open history record — return assigned_at + rent_amount for incentive calc
    const historyUpdate = await client.query(
      `UPDATE public.driver_vehicle_history
          SET unassigned_at = NOW()
        WHERE driver_id = $1 AND vehicle_id = $2 AND unassigned_at IS NULL
        RETURNING id, assigned_at, rent_amount, owner_id`,
      [driver_id, vehicle_id]
    );
    const histRec = historyUpdate.rows[0];

    // ── INC-02: Incentive auto-calc ────────────────────────────────────────────
    let incentiveApplied = false;
    let incentiveAmount  = 0;

    if (histRec) {
      // Hours the driver worked this assignment
      const hoursWorked = (Date.now() - new Date(histRec.assigned_at).getTime()) / 3_600_000;

      const ruleRes = await client.query(
        `SELECT * FROM public.owner_incentive_rules
          WHERE owner_id = $1 AND is_active = TRUE LIMIT 1`,
        [histRec.owner_id]
      );
      const rule = ruleRes.rows[0];

      if (rule && hoursWorked >= rule.min_hours) {
        incentiveAmount = calcIncentive(rule.incentive_type, rule.incentive_value, histRec.rent_amount);

        if (incentiveAmount > 0) {
          // INC-03: Mark history record
          await client.query(
            `UPDATE public.driver_vehicle_history
                SET incentive_applied = TRUE, incentive_amount = $1
              WHERE id = $2`,
            [incentiveAmount, histRec.id]
          );

          // INC-03: Credit driver wallet (append-only ledger + wallet update)
          const balRes = await client.query(
            'SELECT wallet_balance FROM public.drivers WHERE id = $1 FOR UPDATE',
            [driver_id]
          );
          const newBalance = Number(balRes.rows[0].wallet_balance) + incentiveAmount;

          await client.query(
            `INSERT INTO public.driver_ledger
               (driver_id, owner_id, entry_type, amount, description, balance_after, created_by)
             VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6)`,
            [
              driver_id,
              histRec.owner_id,
              incentiveAmount,
              `Incentive — ${rule.incentive_type} for ${Math.round(hoursWorked)}h worked`,
              newBalance,
              histRec.owner_id,
            ]
          );

          await client.query(
            'UPDATE public.drivers SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
            [newBalance, driver_id]
          );

          incentiveApplied = true;

          // INC-05: WhatsApp notification (fire-and-forget via SQS)
          pool.query(
            'SELECT phone_number FROM public.drivers WHERE id = $1 LIMIT 1',
            [driver_id]
          ).then(r => {
            if (r.rows[0]) {
              publishNotification({
                recipientId:   driver_id,
                recipientRole: 'driver',
                type:          'INCENTIVE',
                title:         `🎉 Incentive credited: ₹${incentiveAmount}`,
                body:          `You earned an incentive of ₹${incentiveAmount} for working ${Math.round(hoursWorked)} hours. It has been credited to your wallet.`,
              }).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    }
    // ── end incentive calc ──────────────────────────────────────────────────────

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        driver_id,
        vehicle_id,
        unassigned_at:     new Date(),
        incentive_applied: incentiveApplied,
        incentive_amount:  incentiveAmount,
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
        'SELECT COUNT(*)::int AS total FROM public.driver_vehicle_history WHERE driver_id = $1',
        [driverId]
      ),
      pool.query(
        `SELECT h.id, h.driver_id, h.vehicle_id, h.owner_id,
                h.rent_amount, h.rent_type, h.deposit_amount,
                h.assigned_at, h.unassigned_at,
                h.incentive_applied, h.incentive_amount,
                v.reg_number, v.model
           FROM public.driver_vehicle_history h
           LEFT JOIN public.vehicles v ON v.id = h.vehicle_id
          WHERE h.driver_id = $1
          ORDER BY h.assigned_at DESC
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

// GET /api/assignment/available/vehicles — DevSpec §13.5
exports.availableVehicles = async (req, res, next) => {
  try {
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : (req.query.ownerId || jwtOwnerId);
    if (!ownerId) throw new AppError('ownerId required', 400, 'VALIDATION_ERROR');

    const { rows } = await pool.query(
      `SELECT id, reg_number, model, type, rent_type, daily_rent, status
         FROM public.vehicles
        WHERE owner_id = $1 AND status = 'AVAILABLE'
        ORDER BY created_at DESC`,
      [ownerId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// GET /api/assignment/available/drivers — DevSpec §13.5
exports.availableDrivers = async (req, res, next) => {
  try {
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : (req.query.ownerId || jwtOwnerId);
    if (!ownerId) throw new AppError('ownerId required', 400, 'VALIDATION_ERROR');

    const { rows } = await pool.query(
      `SELECT id, name, phone_number, kyc_status, wallet_balance, status
         FROM public.drivers
        WHERE owner_id = $1
          AND assigned_vehicle_id IS NULL
          AND status = 'ACTIVE'
          AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [ownerId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
