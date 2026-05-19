require('dotenv').config();   // ← Sabse top pe

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

const CLIENT_ID = process.env.PAYYANTRA_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYYANTRA_CLIENT_SECRET;
const BASE_URL = process.env.PAYYANTRA_BASE_URL;

console.log('PayYantra Config Loaded:', {
  BASE_URL,
  CLIENT_ID: CLIENT_ID ? '✅ Present' : '❌ Missing',
  CLIENT_SECRET: CLIENT_SECRET ? '✅ Present' : '❌ Missing'
});

// ====================== GET TOKEN ======================
const getToken = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'x-client-id': CLIENT_ID,
        'x-client-secret': CLIENT_SECRET,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    console.log('Token Response:', JSON.stringify(data, null, 2));

    if (!data?.data?.token) {
      throw new Error('Failed to get token from PayYantra');
    }

    return data.data.token;
  } catch (err) {
    console.error('Get Token Error:', err.message);
    throw err;
  }
};

// ====================== CREATE ORDER (Main Endpoint) ======================
router.post('/create-order', async (req, res) => {
  const { amount, customerName, customerPhone, customerEmail, userId } = req.body;

  console.log('Create Order Request:', { amount, customerPhone, customerName });

  if (!amount || amount <= 0 || !customerPhone) {
    return res.status(400).json({ success: false, message: 'Amount and phone number are required' });
  }

  const orderId = uuidv4();
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  try {
    // Save order in DB first
    await pool.query(
      `INSERT INTO ms_orders 
       (order_id, order_number, order_amount, currency, payer_name, payer_mobile, payer_email, transaction_status, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)`,
      [orderId, orderNumber, amount, 'INR', customerName, customerPhone, customerEmail, userId]
    );

    const token = await getToken();

    const orderPayload = {
      referenceId: orderId,
      amount: Number(amount) * 100,           // ← Most Important: Paise mein convert
      currency: 'INR',
      customerName: customerName || 'Driver',
      customerEmail: customerEmail || process.env.DEFAULT_EMAIL,
      customerPhone: customerPhone,
      notifyUrl: process.env.PAYYANTRA_NOTIFY_URL,
      returnUrl: process.env.PAYYANTRA_RETURN_URL,
      allowedPaymentMethods: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'INTERNET_BANKING'],
    };

    console.log('Sending to PayYantra:', orderPayload);

    const orderRes = await fetch(`${BASE_URL}/api/v2/merchant/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderRes.json();
    console.log('PayYantra Order Response:', JSON.stringify(orderData, null, 2));

    if (!orderRes.ok) {
      throw new Error(orderData.message || 'Payment gateway error');
    }

    // Update transaction ID
    if (orderData?.data?.transactionId) {
      await pool.query(
        `UPDATE ms_orders SET pg_transaction_id = $1 WHERE order_id = $2`,
        [orderData.data.transactionId, orderId]
      );
    }

    res.json({
      success: true,
      data: orderData,
      orderId,
      orderNumber,
      paymentUrl: orderData?.data?.paymentUrl || orderData?.data?.url
    });

  } catch (err) {
    console.error('=== PAYMENT INITIATION FAILED ===');
    console.error(err.message);
    if (err.response) console.error(err.response.data);

    res.status(500).json({
      success: false,
      message: 'Payment Initiation Failed',
      error: err.message
    });
  }
});

router.get('/driver-details', async (req, res) => {
  try {
    // Safety check add kiya hai
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const result = await pool.query(
      `SELECT * FROM driver_details WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      const newDriver = await pool.query(
        `INSERT INTO driver_details (user_id, wallet_balance, daily_rent, amount_paid_today, battery_level, kms_driven, vehicle_number)
         VALUES ($1, 0, 100, 0, 0, 0, 'Not Assigned') RETURNING *`,
        [req.user.id]
      );
      return res.json(newDriver.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch driver details' });
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

    const localOrder = await pool.query('SELECT * FROM ms_orders WHERE order_id = $1', [orderId]);
    if (localOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const localAmount = parseFloat(localOrder.rows[0].order_amount);
    const pgAmount = parseFloat(body.amount);
    if (pgAmount && localAmount !== pgAmount) {
      await pool.query('UPDATE ms_orders SET transaction_status = $1 WHERE order_id = $2', ['TAMPERED', orderId]);
      return res.status(400).json({ message: 'Amount mismatch detected' });
    }

    if (status === 'SUCCESS') {
      await pool.query(
        `UPDATE driver_details SET 
          amount_paid_today = amount_paid_today + $1,
          updated_at = NOW()
         WHERE user_id = (
           SELECT id FROM users WHERE phone_number = $2
         )`,
        [localOrder.rows[0].order_amount, localOrder.rows[0].payer_mobile]
      );
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

router.get('/my-transactions', async (req, res) => {
  try {
    // Safely variable extract karna
    const phone = req.query.phone || req.body.phone || req.user?.phone_number;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const result = await pool.query(
      `SELECT * FROM ms_orders WHERE payer_mobile = $1 ORDER BY order_initiation_date DESC LIMIT 10`,
      [phone]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

router.post('/check-pending', async (req, res) => {
  try {
    const pending = await pool.query("SELECT * FROM ms_orders WHERE transaction_status = 'PENDING'");
    if (pending.rows.length === 0) {
      return res.json({ message: 'No pending orders' });
    }

    const token = await getToken();
    const updated = [];

    for (const order of pending.rows) {
      try {
        const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${order.order_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
        console.error('Inquiry failed for order:', order.order_id, err.message);
      }
    }

    res.json({ message: 'Inquiry complete', updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Inquiry failed' });
  }
});

router.get('/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const token = await getToken();
    const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
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

router.get('/order/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    let localResult = await pool.query('SELECT * FROM ms_orders WHERE order_id = $1', [orderId]);
    if (localResult.rows.length === 0) {
      localResult = await pool.query('SELECT * FROM ms_orders WHERE order_number = $1', [orderId]);
    }
    if (localResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const local = localResult.rows[0];
    let external = null;
    let raw = null;
    const referenceId = local.order_id;

    try {
      const token = await getToken();
      const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${referenceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      raw = await statusRes.json();
      external = raw?.data || raw;
    } catch (fetchErr) {
      console.error('External order fetch failed:', fetchErr.message);
    }

    res.json({ local, external, raw });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
});

module.exports = router;