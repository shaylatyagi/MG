/**
 * Payment Gateway Routes (PayYantra)
 * backend/src/routes/gateway.routes.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getToken, createOrder, getOrderStatus, BASE_URL } = require('../services/payyantra.service');

// Create payment order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, customerName, customerPhone, customerEmail, purpose = 'RENT' } = req.body;
    if (!amount || !customerPhone)
      return res.status(400).json({ success: false, message: 'Amount and phone required' });

    const orderId = `MG${Date.now()}`;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

    const orderData = await createOrder({ amount, customerName, customerPhone, customerEmail, orderId, orderNumber });

    const intentURL   = orderData?.intentURL   || orderData?.data?.intentURL;
    const checkoutUrl = orderData?.checkoutUrl || orderData?.data?.checkoutUrl;
    const upiQrLink   = orderData?.data?.upiQrLink;
    const pgTxnId     = orderData?.data?.transactionId || orderData?.transactionId;

    if (!intentURL && !checkoutUrl && !upiQrLink)
      return res.status(500).json({ success: false, message: 'PayYantra se koi URL nahi aaya', raw: orderData });

    // Save to DB
    await pool.query(
      `INSERT INTO ms_orders (order_id, order_number, order_amount, currency, payer_name,
        payer_mobile, transaction_status, pg_transaction_id, order_initiation_date, purpose, payment_mode)
       VALUES ($1, $2, $3, 'INR', $4, $5, 'PENDING', $6, NOW(), $7, 'ONLINE')
       ON CONFLICT (order_id) DO NOTHING`,
      [orderId, orderNumber, parseFloat(amount), customerName || 'Driver', customerPhone, pgTxnId || null, purpose]
    );

    res.json({
      success: true,
      checkoutUrl: orderData?.data?.checkoutUrl || orderData?.checkoutUrl,
      intentURL: orderData?.data?.intentURL || orderData?.intentURL,
      upiQrLink: orderData?.data?.upiQrLink,
      orderId,
      transactionId: pgTxnId,
      data: orderData.data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Payment webhook
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const payload = body.data || body;
    const orderId = payload.referenceId || payload.merchantOrderId || payload.orderId;
    let status = String(payload.transactionStatus || payload.status || 'PENDING').toUpperCase();
    if (status === 'INITIATED') status = 'PENDING';
    if (status === 'SUCCESSFUL') status = 'SUCCESS';

    if (!orderId) return res.status(400).json({ message: 'orderId missing' });

    const localOrder = await pool.query(
      'SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1 LIMIT 1', [orderId]
    );
    if (!localOrder.rows[0]) return res.status(404).json({ message: 'Order not found' });

    if (status === 'SUCCESS' && localOrder.rows[0].transaction_status !== 'SUCCESS') {
      const amount = parseFloat(localOrder.rows[0].order_amount || 0);
      const driverPhone = localOrder.rows[0].payer_mobile;

      const driverUser = await pool.query(
        'SELECT id FROM public.drivers WHERE mobile_number = $1', [driverPhone]
      );
      if (driverUser.rows[0]) {
        const driverUserId = driverUser.rows[0].id;
        await pool.query(
          `UPDATE public.drivers SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE mobile_number = $2`,
          [amount, driverPhone]
        ).catch(() => {});

        await pool.query(
          `INSERT INTO public.notifications (driver_id, user_type, title, message, metadata, created_at)
           VALUES ($1, 'DRIVER', '✅ Payment Successful', $2, $3, NOW())`,
          [driverUserId, `Payment of ₹${amount} received.`, JSON.stringify({ amount, status: 'SUCCESS' })]
        ).catch(() => {});
      }
    }

    const paymentMode = payload.paymentMode || payload.paymentMethod || payload.payment_mode || null;
    await pool.query(
      `UPDATE ms_orders SET transaction_status = $1, transaction_status_code = $2,
        pg_transaction_id = COALESCE($3, pg_transaction_id),
        bank_reference_no = COALESCE($4, bank_reference_no),
        bank_utr_no = COALESCE($5, bank_utr_no),
        payment_mode = COALESCE($6, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $7`,
      [status, payload.statusCode || null,
       payload.transactionId || payload.transactionPublicId || null,
       payload.bankReferenceNo || payload.rrn || null,
       payload.bankUTRNo || null,
       paymentMode, orderId]
    );

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// Get single order status
router.get('/order/:orderId', async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT * FROM ms_orders WHERE order_number = $1`, [req.params.orderId]
    );
    if (!order.rows[0]) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Check pending orders
router.post('/check-pending', async (req, res) => {
  try {
    const pending = await pool.query("SELECT * FROM ms_orders WHERE transaction_status = 'PENDING'");
    if (pending.rows.length === 0) return res.json({ message: 'No pending orders' });

    const token = await getToken();
    const updated = [];
    for (const order of pending.rows) {
      try {
        const data = await getOrderStatus(order.order_id);
        let newStatus = String(data.transactionStatus || data.status || '').toUpperCase();
        if (newStatus === 'INITIATED') newStatus = 'PENDING';
        if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';
        if (newStatus && newStatus !== 'PENDING') {
          await pool.query(
            `UPDATE ms_orders SET transaction_status = $1, pg_transaction_id = COALESCE($2, pg_transaction_id),
              bank_reference_no = COALESCE($3, bank_reference_no), payment_mode = COALESCE($4, payment_mode),
              order_completion_date = NOW() WHERE order_id = $5`,
            [newStatus, data.transactionId || null, data.bankReferenceNo || data.rrn || null,
             data.paymentMode || null, order.order_id]
          );
          updated.push(order.order_number);
        }
      } catch (err) { console.error(`Inquiry failed for ${order.order_id}:`, err.message); }
    }
    res.json({ message: 'Inquiry complete', updated: updated.length });
  } catch (err) { res.status(500).json({ message: 'Inquiry failed' }); }
});

module.exports = router;