// apps/api/src/controllers/payment.controller.js
// DevSpec §13.6 — Payment layer.  No axios/PayYantra calls here — use payyantraService.
'use strict';

const pool             = require('../config/db');
const { AppError }     = require('../utils/errors');
const payyantraService = require('../services/payyantra');

const generateOrderId = () =>
  `MG${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// POST /api/payment/initiate — driver only
exports.initiatePayment = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const driverId   = req.user.id;

    const driverRes = await pool.query(
      'SELECT driver_code, owner_code, phone_number FROM public.drivers WHERE id = $1 LIMIT 1',
      [driverId]
    );
    if (!driverRes.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    const { driver_code, owner_code, phone_number } = driverRes.rows[0];

    const orderId = generateOrderId();

    const pgResponse = await payyantraService.createOrder({
      amount:      Number(amount),
      driverCode:  driver_code,
      mobile:      phone_number,
      orderId,
    });

    await pool.query(
      `INSERT INTO public.ms_orders
         (order_id, order_amount, payer_mobile, transaction_status, payment_mode,
          driver_code, owner_code, order_initiation_date)
       VALUES ($1, $2, $3, 'PENDING', 'UPI', $4, $5, NOW())`,
      [orderId, Number(amount), phone_number, driver_code, owner_code]
    );

    res.status(201).json({
      success: true,
      data: {
        order_id:    orderId,
        payment_url: pgResponse.payment_url,
        amount:      Number(amount),
      },
    });
  } catch (err) { next(err); }
};

// POST /api/payment/webhook — PUBLIC, HMAC-verified
exports.webhook = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const rawBody   = JSON.stringify(req.body);
    const signature = req.headers['x-payyantra-signature'] || '';

    if (!payyantraService.verifyWebhookSignature(rawBody, signature))
      throw new AppError('Invalid webhook signature', 401, 'UNAUTHORIZED');

    const { order_id, transaction_status, payment_mode, order_amount } = req.body;
    if (!order_id) throw new AppError('order_id required', 400, 'VALIDATION_ERROR');

    if (transaction_status !== 'SUCCESS') {
      await pool.query(
        `UPDATE public.ms_orders
            SET transaction_status = $1, order_completion_date = NOW()
          WHERE order_id = $2 AND transaction_status = 'PENDING'`,
        [transaction_status, order_id]
      );
      return res.json({ success: true });
    }

    // SUCCESS path — atomic
    await client.query('BEGIN');

    const orderRes = await client.query(
      'SELECT * FROM public.ms_orders WHERE order_id = $1 FOR UPDATE',
      [order_id]
    );
    const order = orderRes.rows[0];
    if (!order) {
      await client.query('ROLLBACK');
      return res.json({ success: true }); // unknown order — idempotent
    }
    if (order.transaction_status === 'SUCCESS') {
      await client.query('ROLLBACK');
      return res.json({ success: true }); // already processed
    }

    await client.query(
      `UPDATE public.ms_orders
          SET transaction_status    = 'SUCCESS',
              payment_mode          = $1,
              order_completion_date = NOW()
        WHERE order_id = $2`,
      [payment_mode || order.payment_mode, order_id]
    );

    const driverRes = await client.query(
      'SELECT id FROM public.drivers WHERE driver_code = $1 LIMIT 1',
      [order.driver_code]
    );
    if (driverRes.rows[0]) {
      const driverId = driverRes.rows[0].id;
      const amt      = Number(order.order_amount || order_amount || 0);

      await client.query(
        `INSERT INTO public.driver_ledger
           (driver_id, entry_type, amount, description, reference_id)
         VALUES ($1, 'PAYMENT', $2, 'Online payment received', $3)`,
        [driverId, amt, order_id]
      );

      await client.query(
        'UPDATE public.drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2',
        [amt, driverId]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/payment/status/:orderId
exports.getStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { rows } = await pool.query(
      `SELECT order_id, order_amount, transaction_status, payment_mode,
              driver_code, owner_code, order_initiation_date, order_completion_date
         FROM public.ms_orders
        WHERE order_id = $1 LIMIT 1`,
      [orderId]
    );
    if (!rows[0]) throw new AppError('Order not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// GET /api/payment/history?driverId=&page=1
exports.getHistory = async (req, res, next) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page     || '1',  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '20', 10)));
    const offset   = (page - 1) * pageSize;

    let driverCode = null;
    if (req.user.role === 'driver') {
      const dr = await pool.query(
        'SELECT driver_code FROM public.drivers WHERE id = $1 LIMIT 1',
        [req.user.id]
      );
      driverCode = dr.rows[0]?.driver_code;
    } else if (req.query.driverId) {
      const dr = await pool.query(
        'SELECT driver_code FROM public.drivers WHERE id = $1 LIMIT 1',
        [req.query.driverId]
      );
      driverCode = dr.rows[0]?.driver_code;
    }

    const whereClause = driverCode ? 'WHERE driver_code = $1' : 'WHERE TRUE';
    const params      = driverCode ? [driverCode] : [];

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM public.ms_orders ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT order_id, order_amount, transaction_status, payment_mode,
                driver_code, owner_code, order_initiation_date, order_completion_date
           FROM public.ms_orders
           ${whereClause}
           ORDER BY order_initiation_date DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
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

// GET /api/payment/verify-by-reference/:orderId — manual re-sync
exports.verifyByReference = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const localOrderResult = await pool.query(
      'SELECT * FROM public.ms_orders WHERE order_id = $1 LIMIT 1',
      [orderId]
    );
    if (!localOrderResult.rows[0])
      throw new AppError('Order not found', 404, 'NOT_FOUND');

    const order    = localOrderResult.rows[0];
    const previous = order.transaction_status;

    const rawData = await payyantraService.getOrderStatusByReference(orderId);
    const newStatus = payyantraService.normaliseStatus(rawData.transactionStatus || rawData.status);

    let walletCredited = false;

    if (newStatus === 'SUCCESS' && previous !== 'SUCCESS') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE public.ms_orders
              SET transaction_status = 'SUCCESS', order_completion_date = NOW()
            WHERE order_id = $1`,
          [orderId]
        );

        const driverRes = await client.query(
          'SELECT id FROM public.drivers WHERE driver_code = $1 LIMIT 1',
          [order.driver_code]
        );
        if (driverRes.rows[0]) {
          const driverId = driverRes.rows[0].id;
          const amt      = Number(order.order_amount || 0);

          await client.query(
            `INSERT INTO public.driver_ledger
               (driver_id, entry_type, amount, description, reference_id)
             VALUES ($1, 'PAYMENT', $2, 'Online payment (re-verified)', $3)`,
            [driverId, amt, orderId]
          );
          await client.query(
            'UPDATE public.drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2',
            [amt, driverId]
          );
          walletCredited = true;
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      }
    } else if (newStatus !== previous) {
      await pool.query(
        `UPDATE public.ms_orders
            SET transaction_status = $1
          WHERE order_id = $2`,
        [newStatus, orderId]
      );
    }

    res.json({
      success: true,
      orderId,
      previousStatus: previous,
      newStatus,
      walletCredited,
      amount:        Number(order.order_amount),
      payyantraRaw:  rawData,
    });
  } catch (err) { next(err); }
};
