// apps/api/src/controllers/payment.controller.js
// DevSpec §13.6 — Payment layer. No axios/PayYantra calls here — use payyantraService.
// ADR-007: webhook verifies HMAC then publishes to SQS; DB work done by webhookWorker.
'use strict';

const pool             = require('../config/db');
const { AppError }     = require('../utils/errors');
const payyantraService = require('../services/payyantra');
const { publishWebhook } = require('../services/sqs');

const generateOrderId = () =>
  `MG${Date.now()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// POST /api/payment/initiate — driver only
exports.initiatePayment = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const driverId   = req.user.id;

    const driverRes = await pool.query(
      'SELECT owner_id, phone_number FROM public.drivers WHERE id = $1 LIMIT 1',
      [driverId]
    );
    if (!driverRes.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
    const { owner_id, phone_number } = driverRes.rows[0];

    const orderId = generateOrderId();

    const pgResponse = await payyantraService.createOrder({
      amount:  Number(amount),
      mobile:  phone_number,
      orderId,
    });

    await pool.query(
      `INSERT INTO public.ms_orders
         (order_id, amount, transaction_status, payment_mode, driver_id, owner_id)
       VALUES ($1, $2, 'PENDING', 'ONLINE', $3, $4)`,
      [orderId, Number(amount), driverId, owner_id]
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
// ADR-007: verify signature here, then enqueue to SQS. DB work is done by webhookWorker.
exports.webhook = async (req, res, next) => {
  try {
    const rawBody   = JSON.stringify(req.body);
    const signature = req.headers['x-payyantra-signature'] || '';

    if (!payyantraService.verifyWebhookSignature(rawBody, signature))
      throw new AppError('Invalid webhook signature', 401, 'UNAUTHORIZED');

    const { order_id } = req.body;
    if (!order_id) throw new AppError('order_id required', 400, 'VALIDATION_ERROR');

    // Publish to SQS — worker handles all DB mutations
    await publishWebhook({
      ...req.body,
      raw_body:  rawBody,
      signature,
    });

    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET /api/payment/status/:orderId
exports.getStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { rows } = await pool.query(
      `SELECT order_id, amount, transaction_status, payment_mode,
              driver_id, owner_id, txn_id, payment_date, created_at
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

    let filterDriverId = null;
    if (req.user.role === 'driver') {
      filterDriverId = req.user.id;
    } else if (req.query.driverId) {
      filterDriverId = parseInt(req.query.driverId, 10);
    }

    const whereClause = filterDriverId ? 'WHERE driver_id = $1' : 'WHERE TRUE';
    const params      = filterDriverId ? [filterDriverId] : [];

    const [countRes, rowsRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM public.ms_orders ${whereClause}`,
        params
      ),
      pool.query(
        `SELECT order_id, amount, transaction_status, payment_mode,
                driver_id, owner_id, txn_id, payment_date, created_at
           FROM public.ms_orders
           ${whereClause}
           ORDER BY created_at DESC
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

// GET /api/payment/verify-by-reference/:orderId — manual re-sync with PayYantra
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

    const rawData   = await payyantraService.getOrderStatusByReference(orderId);
    const newStatus = payyantraService.normaliseStatus(rawData.transactionStatus || rawData.status);

    let walletCredited = false;

    if (newStatus === 'SUCCESS' && previous !== 'SUCCESS') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE public.ms_orders
              SET transaction_status = 'SUCCESS', payment_date = NOW()
            WHERE order_id = $1`,
          [orderId]
        );

        const driverId = order.driver_id;
        const amt      = Number(order.amount);

        const drRes = await client.query(
          'SELECT wallet_balance FROM public.drivers WHERE id = $1 FOR UPDATE',
          [driverId]
        );
        const newBalance = Number(drRes.rows[0].wallet_balance) + amt;

        await client.query(
          `INSERT INTO public.driver_ledger
             (driver_id, owner_id, entry_type, amount, description, balance_after, order_id)
           VALUES ($1, $2, 'PAYMENT', $3, 'Online payment (re-verified)', $4, $5)`,
          [driverId, order.owner_id, amt, newBalance, order.id]
        );
        await client.query(
          'UPDATE public.drivers SET wallet_balance = $1, updated_at = NOW() WHERE id = $2',
          [newBalance, driverId]
        );
        walletCredited = true;

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    } else if (newStatus !== previous) {
      await pool.query(
        `UPDATE public.ms_orders SET transaction_status = $1 WHERE order_id = $2`,
        [newStatus, orderId]
      );
    }

    res.json({
      success: true,
      orderId,
      previousStatus: previous,
      newStatus,
      walletCredited,
      amount:       Number(order.amount),
      payyantraRaw: rawData,
    });
  } catch (err) { next(err); }
};
