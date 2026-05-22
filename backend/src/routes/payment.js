require('dotenv').config(); //read backend .env fileyou 
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

// GET TOKEN
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
    if (!data?.data?.token) {
      throw new Error('Failed to get token from PayYantra');
    }
    return data.data.token;
  } catch (err) {
    console.error('Get Token Error:', err.message);
    throw err;
  }
};

// CREATE ORDER 
router.post('/create-order', async (req, res) => {
  const { amount, customerName, customerPhone, customerEmail } = req.body;
  console.log('Create Order Received:', { amount, customerName, customerPhone, customerEmail });
  if (!amount || Number(amount) <= 0 || !customerPhone) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid amount or phone number',
      received: { amount, phone: customerPhone }
    });
  }
  const parsedAmount = Number(amount);
  const orderId = uuidv4();
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  try {
    // Insert order in db
    await pool.query(
      `INSERT INTO ms_orders 
       (order_id, order_number, order_amount, currency, payer_name, payer_mobile, payer_email, transaction_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
      [orderId, orderNumber, parsedAmount, 'INR', customerName, customerPhone, customerEmail]
    );
    const token = await getToken();
    const orderPayload = {
      referenceId: orderId,
      amount: parsedAmount, 
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
    console.log('PayYantra Response:', { status: orderRes.status, data: orderData });
    if (!orderRes.ok) {
      throw new Error(orderData.message || `PayYantra Error: ${orderRes.status}`);
    }
    if (orderData?.data?.transactionId) {
      await pool.query(
        `UPDATE ms_orders SET pg_transaction_id = $1 WHERE order_id = $2`,
        [orderData.data.transactionId, orderId]
      );
    }
    const checkoutUrl = orderData?.data?.data?.checkoutUrl || orderData?.data?.checkoutUrl || orderData?.data?.url;
    if (!checkoutUrl) {
      throw new Error('No checkout URL received from PayYantra');
    }
    res.json({
      success: true,
      data: orderData,
      orderId,
      orderNumber,
      paymentUrl: checkoutUrl
    });
  } catch (err) {
    console.error('=== PAYMENT CREATION FAILED ===', err.message);
    res.status(500).json({
      success: false,
      message: 'Payment Initiation Failed',
      error: err.message,
      details: 'Check server logs for more info'
    });
  }
});

router.get('/driver-details', async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    const result = await pool.query(
      `SELECT * FROM driver_details 
       WHERE user_id = (SELECT id FROM users WHERE phone_number = $1 LIMIT 1)`,
      [phone]
    );
    if (result.rows.length === 0) {
      const newDriver = await pool.query(
        `INSERT INTO driver_details 
         (user_id, wallet_balance, daily_rent, amount_paid_today, battery_level, kms_driven, vehicle_number)
         VALUES (
           (SELECT id FROM users WHERE phone_number = $1 LIMIT 1), 
           0, 100, 0, 0, 0, 'Not Assigned'
         ) RETURNING *`,
        [phone]
      );
      return res.json(newDriver.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch driver details' });
  }
});

// WEBHOOK
router.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('Webhook received:', body);
  try {
    const payload = body.data || body;     
    const orderId = payload.referenceId || payload.orderId;
    let rawStatus = payload.transactionStatus || payload.status;    
    
    // STATUS MAPPER
    let status = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';
    if (status === 'INITIATED') status = 'PENDING';
    if (status === 'SUCCESSFUL') status = 'SUCCESS';
    if (!orderId) return res.status(400).json({ message: 'orderId missing' });
    
    const localOrder = await pool.query('SELECT * FROM ms_orders WHERE order_id = $1', [orderId]);
    if (localOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (status === 'SUCCESS' && localOrder.rows[0].transaction_status !== 'SUCCESS') {
      const amount = parseFloat(localOrder.rows[0].order_amount || 0);
      await pool.query(
        `UPDATE driver_details 
         SET 
           wallet_balance = COALESCE(wallet_balance, 0) + $1,
           amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
           updated_at = NOW()
         WHERE user_id = (
           SELECT id FROM users WHERE phone_number = $2 LIMIT 1
         )`,
        [amount, localOrder.rows[0].payer_mobile]
      );
      console.log(`💰 Wallet Updated: +₹${amount} for ${localOrder.rows[0].payer_mobile}`);
    }

    const paymentMode = payload.paymentMode || payload.paymentMethod || payload.payment_mode || payload.method || null;

    await pool.query(
      `UPDATE ms_orders SET
        transaction_status = $1,
        transaction_status_code = $2,
        pg_transaction_id = COALESCE($3, pg_transaction_id),
        bank_reference_no = COALESCE($4, bank_reference_no),
        bank_utr_no = COALESCE($5, bank_utr_no),
        payment_mode = COALESCE($6, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $7`,
      [
        status,
        payload.statusCode || null,
        payload.transactionId || payload.transactionPublicId || null,
        payload.bankReferenceNo || payload.rrn || null, 
        payload.bankUTRNo || null,
        paymentMode,
        orderId
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// MY TRANSACTIONS
router.get('/my-transactions', async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    const result = await pool.query(
      `SELECT * FROM ms_orders WHERE payer_mobile = $1 ORDER BY order_initiation_date DESC`,
      [phone]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// CHECK PENDING (Inquiry API) 
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
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await statusRes.json();        
        let rawStatus = data.transactionStatus || data.status;        
        // STATUS MAPPER
        let newStatus = rawStatus ? String(rawStatus).toUpperCase() : null;
        if (newStatus === 'INITIATED') newStatus = 'PENDING';
        if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';
        if (newStatus && newStatus !== 'PENDING') {
          const amount = parseFloat(order.order_amount);
          if (newStatus === 'SUCCESS') {
            await pool.query(
              `UPDATE driver_details 
               SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
                   amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
                   updated_at = NOW()
               WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,
              [amount, order.payer_mobile]
            );
          }
          
          const paymentMode = data.paymentMode || data.paymentMethod || data.payment_mode || data.method || null;

          await pool.query(
            `UPDATE ms_orders SET 
              transaction_status = $1,
              pg_transaction_id = COALESCE($2, pg_transaction_id),
              bank_reference_no = COALESCE($3, bank_reference_no),
              bank_utr_no = COALESCE($4, bank_utr_no),
              payment_mode = COALESCE($5, payment_mode),
              order_completion_date = NOW()
             WHERE order_id = $6`,
            [
              newStatus, 
              data.transactionId || data.transactionPublicId || null, 
              data.bankReferenceNo || data.rrn || null, 
              data.bankUTRNo || null, 
              paymentMode, 
              order.order_id
            ]
          );
          updated.push(order.order_number);
        }
      } catch (err) {
        console.error(`Inquiry failed for ${order.order_id}:`, err.message);
      }
    }
    res.json({ message: 'Inquiry complete', updated: updated.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Inquiry failed' });
  }
});

// SINGLE ORDER STATUS (Frontend ke liye)
router.get('/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  console.log('Status check requested for:', orderId);
  try {
    const localResult = await pool.query(
      'SELECT * FROM ms_orders WHERE order_id = $1 OR order_number = $1',
      [orderId]
    );
    if (localResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Order not found in local DB',
        orderId 
      });
    }
    const token = await getToken();
    const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rawData = await statusRes.json();
    const pyData = rawData.data || {};     
    // STATUS MAPPER
    let rawStatus = pyData.status || pyData.transactionStatus || localResult.rows[0].transaction_status;
    let newStatus = rawStatus ? String(rawStatus).toUpperCase() : 'PENDING';    
    if (newStatus === 'INITIATED') newStatus = 'PENDING';
    if (newStatus === 'SUCCESSFUL') newStatus = 'SUCCESS';
    const amount = parseFloat(localResult.rows[0].order_amount);
    
    // Update local DB if status changed
    if (newStatus && newStatus !== localResult.rows[0].transaction_status) {      
      if (newStatus === 'SUCCESS') {
        await pool.query(
          `UPDATE driver_details 
           SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
               amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
               updated_at = NOW()
           WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,
          [amount, localResult.rows[0].payer_mobile]
        );
      }

      const paymentMode = pyData.paymentMode || pyData.paymentMethod || pyData.payment_mode || pyData.method || null;

      await pool.query(
        `UPDATE ms_orders SET 
          transaction_status = $1,
          pg_transaction_id = COALESCE($2, pg_transaction_id),
          bank_reference_no = COALESCE($3, bank_reference_no),
          bank_utr_no = COALESCE($4, bank_utr_no),
          payment_mode = COALESCE($5, payment_mode),
          order_completion_date = NOW()
         WHERE order_id = $6`,
        [
          newStatus,
          pyData.transactionPublicId || pyData.transactionId || null,
          pyData.rrn || pyData.bankReferenceNo || null,
          pyData.bankUTRNo || null,
          paymentMode,
          orderId
        ]
      );
    }
    res.json({
      success: true,
      status: newStatus,
      amount: amount, 
      orderId: orderId,
      pyData: pyData
    });
  } catch (err) {
    console.error('Status check error:', err.message);
    res.status(500).json({ message: 'Status check failed', error: err.message });
  }
});

// INQUIRY BY PAYYANTRA ORDER ID 
router.get('/inquiry-by-order/:payyantraOrderId', async (req, res) => {
  const { payyantraOrderId } = req.params;
  console.log('🔍 Inquiry requested for PayYantra Order ID:', payyantraOrderId);
  try {
    const token = await getToken();
    const pyRes = await fetch(`${BASE_URL}/api/pay/status/${payyantraOrderId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rawData = await pyRes.json();
    const pyData = rawData.data || {}; 
    // STATUS MAPPER
    let rawStatus = pyData.status ? String(pyData.status).toUpperCase() : 'PENDING';
    let pyStatus = rawStatus;
    if (rawStatus === 'INITIATED') pyStatus = 'PENDING';
    if (rawStatus === 'SUCCESSFUL') pyStatus = 'SUCCESS';
    const localOrderId = pyData.referenceId;
    const amount = parseFloat(pyData.amount || 0);
    if (!localOrderId) {
      return res.status(404).json({ 
        success: false, 
        message: 'PayYantra order found, but referenceId is missing in their response.' 
      });
    }
    const localOrderResult = await pool.query(
      'SELECT * FROM ms_orders WHERE order_id = $1', 
      [localOrderId]
    );
    if (localOrderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found in local DB' });
    }
    const currentLocalStatus = localOrderResult.rows[0].transaction_status;
    if (pyStatus === 'SUCCESS' && currentLocalStatus !== 'SUCCESS') {
      await pool.query(
        `UPDATE driver_details 
         SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
             amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
             updated_at = NOW()
         WHERE user_id = (SELECT id FROM users WHERE phone_number = $2 LIMIT 1)`,
        [amount, localOrderResult.rows[0].payer_mobile]
      );
      console.log(`💰 Wallet Automatically Updated via Inquiry API for ${localOrderResult.rows[0].payer_mobile}`);
    }

    const paymentMode = pyData.paymentMode || pyData.paymentMethod || pyData.payment_mode || pyData.method || null;

    await pool.query(
      `UPDATE ms_orders SET 
        transaction_status = $1,
        pg_transaction_id = COALESCE($2, pg_transaction_id),
        bank_reference_no = COALESCE($3, bank_reference_no),
        bank_utr_no = COALESCE($4, bank_utr_no),
        payment_mode = COALESCE($5, payment_mode),
        order_completion_date = NOW()
       WHERE order_id = $6`,
      [
        pyStatus,
        pyData.transactionPublicId || pyData.transactionId || null,
        pyData.rrn || pyData.bankReferenceNo || null,
        pyData.bankUTRNo || null,
        paymentMode,
        localOrderId
      ]
    );
    res.json({
      success: true,
      status: pyStatus,
      amount: amount,
      orderId: localOrderId,
      payyantraOrderId: payyantraOrderId,
      pyData: pyData
    });
  } catch (err) {
    console.error('❌ Inquiry API Error:', err.message);
    res.status(500).json({ success: false, message: 'Inquiry processing failed', error: err.message });
  }
});

module.exports = router;