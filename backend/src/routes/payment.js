require('dotenv').config();
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const CLIENT_ID = process.env.PAYYANTRA_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYYANTRA_CLIENT_SECRET;
const BASE_URL = 'https://payin-api-uat.payyantra.com';

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

router.post('/create-order', async (req, res) => {
  const { amount, customerName, customerPhone, customerEmail } = req.body;

  if (!amount || !customerPhone) {
    return res.status(400).json({ message: 'Amount and phone are required' });
  }

  try {
    const token = await getToken();
    const referenceId = uuidv4();

    const orderRes = await fetch(`${BASE_URL}/api/v2/merchant/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referenceId,
        amount: Number(amount),
        currency: 'INR',
        customerName: customerName || 'Driver',
        customerEmail: customerEmail || 'driver@mobilitygrid.in',
        customerPhone,
        notifyUrl: 'https://mobilitygrid-uat.payyantra.com/api/payment/webhook',
        returnUrl: 'https://mobilitygrid-uat.payyantra.com/payment-result',
        allowedPaymentMethods: ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'INTERNET_BANKING'],
      }),
    });

    const orderData = await orderRes.json();
    res.json({ success: true, data: orderData, referenceId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
});

router.get('/status/:referenceId', async (req, res) => {
  const { referenceId } = req.params;
  try {
    const token = await getToken();
    const statusRes = await fetch(`${BASE_URL}/api/pay/status/by-reference/${referenceId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await statusRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Status check failed' });
  }
});

module.exports = router;