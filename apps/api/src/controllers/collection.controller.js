// apps/api/src/controllers/collection.controller.js — DevSpec §13.7
'use strict';

const pool         = require('../config/db');
const { AppError } = require('../utils/errors');

// POST /api/collection/cash — atomic: ledger INSERT + wallet UPDATE
exports.recordCash = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { driver_id, amount, description } = req.body;
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : jwtOwnerId;

    await client.query('BEGIN');

    const driverRes = await client.query(
      'SELECT id, wallet_balance, owner_id FROM public.drivers WHERE id = $1 FOR UPDATE',
      [driver_id]
    );
    if (!driverRes.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Driver not found', 404, 'NOT_FOUND');
    }
    if (ownerId && String(driverRes.rows[0].owner_id) !== String(ownerId)) {
      await client.query('ROLLBACK');
      throw new AppError('Driver does not belong to your fleet', 403, 'FORBIDDEN');
    }

    const amt        = Number(amount);
    const newBalance = Number(driverRes.rows[0].wallet_balance) + amt;
    const effectiveOwnerId = ownerId || driverRes.rows[0].owner_id;

    const ledgerRes = await client.query(
      `INSERT INTO public.driver_ledger
         (driver_id, owner_id, entry_type, amount, description, balance_after, created_by)
       VALUES ($1, $2, 'CASH_PAYMENT', $3, $4, $5, $6)
       RETURNING id, created_at`,
      [driver_id, effectiveOwnerId, amt, description || 'Cash collection', newBalance, effectiveOwnerId]
    );

    await client.query(
      `UPDATE public.drivers
          SET wallet_balance = $1, updated_at = NOW()
        WHERE id = $2`,
      [newBalance, driver_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ledger_id:      ledgerRes.rows[0].id,
        driver_id,
        amount:         amt,
        wallet_balance: newBalance,
        created_at:     ledgerRes.rows[0].created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/collection/summary — DevSpec §13.7
exports.getSummary = async (req, res, next) => {
  try {
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : (req.query.ownerId || jwtOwnerId);
    if (!ownerId) throw new AppError('ownerId required', 400, 'VALIDATION_ERROR');

    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE transaction_status = 'SUCCESS' AND payment_date::date = CURRENT_DATE
        ), 0) AS online_today,
        COALESCE(SUM(amount) FILTER (
          WHERE transaction_status = 'SUCCESS'
          AND   payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS online_month,
        COALESCE(SUM(amount) FILTER (
          WHERE transaction_status = 'SUCCESS'
        ), 0) AS online_total,
        COUNT(*) FILTER (WHERE transaction_status = 'SUCCESS')::int AS online_count
      FROM public.ms_orders
      WHERE owner_id = $1
    `, [ownerId]);

    const cashRes = await pool.query(`
      SELECT
        COALESCE(SUM(ABS(amount)) FILTER (
          WHERE entry_type = 'CASH_PAYMENT' AND created_at::date = CURRENT_DATE
        ), 0) AS cash_today,
        COALESCE(SUM(ABS(amount)) FILTER (
          WHERE entry_type = 'CASH_PAYMENT'
          AND   created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS cash_month,
        COALESCE(SUM(ABS(amount)) FILTER (
          WHERE entry_type = 'CASH_PAYMENT'
        ), 0) AS cash_total
      FROM public.driver_ledger
      WHERE owner_id = $1
    `, [ownerId]);

    res.json({
      success: true,
      data: {
        ...rows[0],
        ...cashRes.rows[0],
      },
    });
  } catch (err) { next(err); }
};

// GET /api/collection/by-driver — DevSpec §13.7
exports.getByDriver = async (req, res, next) => {
  try {
    const { role, id: userId, owner_id: jwtOwnerId } = req.user;
    const ownerId = role === 'owner' ? userId : (req.query.ownerId || jwtOwnerId);
    if (!ownerId) throw new AppError('ownerId required', 400, 'VALIDATION_ERROR');

    const { from, to } = req.query;
    const params = [ownerId];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND mo.payment_date >= $${params.length}`; }
    if (to)   { params.push(to);   dateFilter += ` AND mo.payment_date <= $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT
        d.id          AS driver_id,
        d.name        AS driver_name,
        d.phone_number,
        d.wallet_balance,
        v.reg_number  AS vehicle_number,
        COALESCE(SUM(mo.amount) FILTER (WHERE mo.transaction_status = 'SUCCESS'), 0) AS online_total,
        COALESCE(SUM(mo.amount) FILTER (
          WHERE mo.transaction_status = 'SUCCESS' AND mo.payment_date::date = CURRENT_DATE
        ), 0) AS online_today,
        COUNT(mo.id) FILTER (WHERE mo.transaction_status = 'SUCCESS')::int AS payment_count,
        MAX(mo.payment_date) FILTER (WHERE mo.transaction_status = 'SUCCESS') AS last_payment_at
      FROM public.drivers d
      LEFT JOIN public.vehicles  v  ON v.driver_id = d.id AND v.status = 'ASSIGNED'
      LEFT JOIN public.ms_orders mo ON mo.driver_id = d.id ${dateFilter}
      WHERE d.owner_id = $1 AND d.deleted_at IS NULL
      GROUP BY d.id, v.reg_number
      ORDER BY online_total DESC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};
