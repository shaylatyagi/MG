// apps/api/src/routes/payment.js — per DevSpec §payment routes
const crypto             = require('crypto');
const router             = require('express').Router();
const pool               = require('../config/db');
const { requireRole }    = require('../middleware/roleCheck');
const { AppError }       = require('../utils/errors');

// ── Inline PayYantra order creation (no external service file) ────────────────
const createPayyantraOrder = async ({ amount, driverCode, mobile, orderId }) => {
  const axios      = require('axios');
  const merchantId = process.env.PAYYANTRA_MERCHANT_ID;
  const apiKey     = process.env.PAYYANTRA_API_KEY;
  const baseUrl    = process.env.PAYYANTRA_BASE_URL || 'https://api.payyantra.com';

  if (!merchantId || !apiKey) {
    console.log(JSON.stringify({ level: 'info', event: 'payyantra_mock', orderId, amount }));
    return {
      order_id:    orderId,
      payment_url: `http://localhost:3000/pay/mock?orderId=${orderId}`,
      status:      'PENDING',
    };
  }

  const payload = {
    merchant_id:   merchantId,
    order_id:      orderId,
    order_amount:  amount,
    payer_mobile:  mobile,
    driver_code:   driverCode,
    callback_url:  process.env.PAYYANTRA_CALLBACK_URL,
  };

  const resp = await axios.post(`${baseUrl}/v1/orders/create`, payload, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  return resp.data;
};

// POST /api/payment/initiate — driver only
router.post(
  '/initiate',
  requireRole('driver'),
  async (req, res, next) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
        throw new AppError('Valid amount required', 400, 'VALIDATION_ERROR');

      const driverId = req.user.id;

      const driverRes = await pool.query(
        'SELECT driver_code, owner_code, phone_number FROM public.drivers WHERE id = $1 LIMIT 1',
        [driverId]
      );
      if (!driverRes.rows[0]) throw new AppError('Driver not found', 404, 'NOT_FOUND');
      const { driver_code, owner_code, phone_number } = driverRes.rows[0];

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      const pgResponse = await createPayyantraOrder({
        amount:     Number(amount),
        driverCode: driver_code,
        mobile:     phone_number,
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
  }
);

// POST /api/payment/webhook — PUBLIC, no auth middleware
// HMAC verified if PAYYANTRA_WEBHOOK_SECRET is set; skipped in dev if absent
router.post('/webhook', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const secret = process.env.PAYYANTRA_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers['x-payyantra-signature'] || '';
      const body      = JSON.stringify(req.body);
      const expected  = crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (signature !== expected)
        throw new AppError('Invalid webhook signature', 401, 'UNAUTHORIZED');
    }

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

    // SUCCESS path — atomic transaction
    await client.query('BEGIN');

    const orderRes = await client.query(
      "SELECT * FROM public.ms_orders WHERE order_id = $1 FOR UPDATE",
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
});

// GET /api/payment/status/:orderId
router.get(
  '/status/:orderId',
  requireRole('driver', 'owner', 'admin'),
  async (req, res, next) => {
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
  }
);

// GET /api/payment/history?driverId=&page=1
router.get(
  '/history',
  requireRole('driver', 'owner', 'admin'),
  async (req, res, next) => {
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

      const total      = countRes.rows[0].total;
      const totalPages = Math.ceil(total / pageSize);

      res.json({
        success: true,
        data: rowsRes.rows,
        pagination: { page, pageSize, total, totalPages },
      });
    } catch (err) { next(err); }
  }
);

module.exports = router;
