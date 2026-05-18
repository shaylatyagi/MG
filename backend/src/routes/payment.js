require('dotenv').config();
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const CLIENT_ID = process.env.PAYYANTRA_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYYANTRA_CLIENT_SECRET;
const BASE_URL = process.env.PAYYANTRA_BASE_URL;

const getToken = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: {
      'x-client-id': CLIENT_ID,
      'x-client-secret': CLIENT_SECRET,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  return data.data.token;
};

router.post('/create-order', verifyToken, async (req, res) => {
  const { amount, customerName, customerPhone, customerEmail } = req.body;

  if (!amount || !customerPhone) {
    return res.status(400).json({ message: 'Amount and phone are required' });
  }

  const orderId = uuidv4();
  const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  try {
    await pool.query(
      `INSERT INTO ms_orders (order_id, order_number, order_amount, currency, payer_name, payer_mobile, payer_email, transaction_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
      [orderId, orderNumber, amount, 'INR', customerName, customerPhone, customerEmail]
    );

    const token = await getToken();

    const orderRes = await fetch(`${BASE_URL}/api/v2/merchant/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referenceId: orderId,
        amount: Number(amount),
        currency: 'INR',
        customerName: customerName || 'Driver',
        customerEmail: customerEmail || process.env.DEFAULT_EMAIL,
        customerPhone,
        notifyUrl: process.env.PAYYANTRA_NOTIFY_URL,
        returnUrl: process.env.PAYYANTRA_RETURN_URL,
        allowedPaymentMethods: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'INTERNET_BANKING'],
      }),
    });

    const orderData = await orderRes.json();

    if (orderData && orderData.data) {
      await pool.query(
        `UPDATE ms_orders SET pg_transaction_id = $1 WHERE order_id = $2`,
        [orderData.data.transactionId || null, orderId]
      );
    }

    res.json({ success: true, data: orderData, orderId, orderNumber });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
});

router.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('Webhook received:', body);

  try {
    const orderId = body.referenceId || body.orderId;
    const status = body.transactionStatus || body.status;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId missing in webhook' });
    }

    const localOrder = await pool.query(
      'SELECT * FROM ms_orders WHERE order_id = $1',
      [orderId]
    );

    if (localOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const localAmount = parseFloat(localOrder.rows[0].order_amount);
    const pgAmount = parseFloat(body.amount);

    if (pgAmount && localAmount !== pgAmount) {
      await pool.query(
        'UPDATE ms_orders SET transaction_status = $1 WHERE order_id = $2',
        ['TAMPERED', orderId]
      );
      return res.status(400).json({ message: 'Amount mismatch detected' });
    }

    await pool.query(
      `UPDATE ms_orders SET
        transaction_status = $1,
        transaction_status_code = $2,
        pg_transaction_id = $3,
        bank_reference_no = $4,
        bank_utr_no = $5,
        order_completion_date = NOW()
       WHERE order_id = $6`,
      [
        status,
        body.statusCode || null,
        body.transactionId || null,
        body.bankReferenceNo || null,
        body.bankUTRNo || null,
        orderId,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

router.post('/check-pending', verifyToken, async (req, res) => {
  try {
    const pending = await pool.query(
      "SELECT * FROM ms_orders WHERE transaction_status = 'PENDING'"
    );

    if (pending.rows.length === 0) {
      return res.json({ message: 'No pending orders' });
    }

    const token = await getToken();
    var updated = [];

    for (var i = 0; i < pending.rows.length; i++) {
      var order = pending.rows[i];
      try {
        const statusRes = await fetch(
          `${BASE_URL}/api/pay/status/by-reference/${order.order_id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await statusRes.json();
        const newStatus = data.transactionStatus || null;

        if (newStatus && newStatus !== 'PENDING') {
          await pool.query(
            `UPDATE ms_orders SET 
              transaction_status = $1,
              pg_transaction_id = $2,
              bank_reference_no = $3,
              bank_utr_no = $4,
              order_completion_date = NOW()
             WHERE order_id = $5`,
            [
              newStatus,
              data.transactionId || null,
              data.bankReferenceNo || null,
              data.bankUTRNo || null,
              order.order_id,
            ]
          );
          updated.push(order.order_number);
        }
      } catch (err) {
        console.error('Inquiry failed for order:', order.order_id);
      }
    }

    res.json({ message: 'Inquiry complete', updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Inquiry failed' });
  }
});

router.get('/status/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;
  try {
    const token = await getToken();
    const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await statusRes.json();

    if (data && data.transactionStatus) {
      await pool.query(
        `UPDATE ms_orders SET transaction_status = $1, order_completion_date = NOW() WHERE order_id = $2`,
        [data.transactionStatus, orderId]
      );
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Status check failed' });
  }
});

module.exports = router;