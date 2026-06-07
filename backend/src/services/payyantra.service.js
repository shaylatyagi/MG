/**
 * PayYantra Payment Gateway Service
 * backend/src/services/payyantra.service.js
 */

const BASE_URL = process.env.PAYYANTRA_BASE_URL;
const CLIENT_ID = process.env.PAYYANTRA_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYYANTRA_CLIENT_SECRET;

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
  const token = data?.data?.token || data?.token;
  if (!token) throw new Error('Failed to get PayYantra token');
  return token;
};

const createOrder = async ({ amount, customerName, customerPhone, customerEmail, orderId, orderNumber }) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/merchant/orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: parseFloat(amount),
      customerName: customerName || 'Driver',
      customerPhone,
      customerEmail: customerEmail || 'driver@mobilitygrid.com',
      orderId,
      returnUrl: `https://mg-sandy.vercel.app/driver?status=success&orderId=${orderId}`,
      notifyUrl: 'https://mg-qw5s.onrender.com/api/payment/webhook'
    })
  });
  return res.json();
};

const getOrderStatus = async (orderId) => {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/pay/status/by-reference/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
};

module.exports = { getToken, createOrder, getOrderStatus, BASE_URL };