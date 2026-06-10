// apps/api/src/controllers/collection.controller.js — DevSpec §collection
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
      'SELECT id, wallet_balance FROM public.drivers WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [driver_id, ownerId]
    );
    if (!driverRes.rows[0]) {
      await client.query('ROLLBACK');
      throw new AppError('Driver not found or not owned by you', 404, 'NOT_FOUND');
    }

    const amt = Number(amount);

    const ledgerRes = await client.query(
      `INSERT INTO public.driver_ledger
         (driver_id, entry_type, amount, description, recorded_by)
       VALUES ($1, 'CASH', $2, $3, $4)
       RETURNING id, created_at`,
      [driver_id, amt, description || 'Cash collection', userId]
    );

    const balanceRes = await client.query(
      `UPDATE public.drivers
          SET wallet_balance = wallet_balance + $1
        WHERE id = $2
        RETURNING wallet_balance`,
      [amt, driver_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ledger_id:      ledgerRes.rows[0].id,
        driver_id,
        amount:         amt,
        wallet_balance: Number(balanceRes.rows[0].wallet_balance),
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
