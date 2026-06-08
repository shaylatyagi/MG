// backend/src/routes/paymentLinks.js — PaymentLink feature
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth.middleware');

const FRONTEND = process.env.FRONTEND_URL || 'https://mg-xi.vercel.app';
const BASE_PY   = process.env.PAYYANTRA_BASE_URL || 'https://payin-api-uat.payyantra.com';

// ── Auto-create table on first use ───────────────────────────────────
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.payment_links (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token        VARCHAR(32) UNIQUE NOT NULL,
      owner_id     UUID NOT NULL,
      driver_id    UUID,
      driver_phone VARCHAR(20),
      driver_name  VARCHAR(100) DEFAULT 'Driver',
      amount       NUMERIC(10,2) NOT NULL,
      description  TEXT DEFAULT 'Payment Request',
      status       VARCHAR(20) DEFAULT 'PENDING',
      order_id     VARCHAR(100),
      paid_at      TIMESTAMPTZ,
      expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

// ── Helpers ──────────────────────────────────────────────────────────
const randomToken = () =>
  require('crypto').randomBytes(12).toString('hex');           // 24-char hex

const getPYToken = async () => {
  const r = await fetch(`${BASE_PY}/api/auth/token`, {
    method: 'POST',
    headers: {
      'x-client-id':     process.env.PAYYANTRA_CLIENT_ID,
      'x-client-secret': process.env.PAYYANTRA_CLIENT_SECRET,
      'Content-Type':    'application/json',
    },
  });
  const d = await r.json();
  return d.token || d.data?.token || d.access_token || d.data?.access_token || null;
};

// ────────────────────────────────────────────────────────────────────
// POST /api/payment-links — owner creates a link
// ────────────────────────────────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    await ensureTable();
    const { driver_id, driver_phone, driver_name, amount, description } = req.body;
    if (!amount || parseFloat(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Amount required' });

    const token = randomToken();
    const { rows } = await pool.query(
      `INSERT INTO public.payment_links
         (token, owner_id, driver_id, driver_phone, driver_name, amount, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [token, req.user.id, driver_id||null, driver_phone||null,
       driver_name||'Driver', parseFloat(amount), description||'Payment Request']
    );
    res.json({ success: true, link: { ...rows[0], url: `${FRONTEND}/pay/${token}` } });
  } catch (err) {
    console.error('payment-links create:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/payment-links — owner lists their links
// ────────────────────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT *, $2 || token AS url
       FROM public.payment_links WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id, `${FRONTEND}/pay/`]
    );
    res.json({ success: true, links: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// GET /api/payment-links/:token — PUBLIC — driver fetches link details
// ────────────────────────────────────────────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id,token,driver_name,amount,description,status,created_at,expires_at
       FROM public.payment_links WHERE token=$1`,
      [req.params.token]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Link not found' });
    const link = rows[0];
    const expired = link.expires_at && new Date() > new Date(link.expires_at);
    res.json({ success: true, link, alreadyPaid: link.status==='PAID', expired });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/payment-links/:token/initiate — PUBLIC — start PayYantra
// ────────────────────────────────────────────────────────────────────
router.post('/:token/initiate', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM public.payment_links WHERE token=$1', [req.params.token]
    );
    const link = rows[0];
    if (!link) return res.status(404).json({ success: false, message: 'Link not found' });
    if (link.status === 'PAID') return res.status(400).json({ success: false, message: 'Already paid' });

    const { customerPhone, customerName } = req.body;

    // ── Demo bypass ─────────────────────────────────────────────────
    if (process.env.DEV_BYPASS_PAYMENT === 'true') {
      await pool.query(
        `UPDATE public.payment_links SET status='PAID', paid_at=NOW() WHERE token=$1`,
        [link.token]
      );
      return res.json({ success: true, demo: true });
    }

    // ── PayYantra live flow ─────────────────────────────────────────
    const pyToken = await getPYToken();
    if (!pyToken) return res.status(500).json({ success: false, message: 'PayYantra auth failed' });

    const orderId = `PL-${link.id.split('-')[0]}-${Date.now()}`;
    const orderRes = await fetch(`${BASE_PY}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pyToken}` },
      body: JSON.stringify({
        orderId,
        amount:         parseFloat(link.amount),
        customerName:   customerName || link.driver_name,
        customerPhone:  customerPhone || link.driver_phone || '9999999999',
        customerEmail:  'driver@mobilitygrid.in',
        currency:       'INR',
        description:    link.description,
        notifyUrl:      'https://mg-qw5s.onrender.com/api/payment-links/webhook',
        redirectUrl:    `${FRONTEND}/pay/${link.token}?status=success`,
      }),
    });
    const orderData = await orderRes.json();
    const paymentUrl =
      orderData.data?.paymentUrl || orderData.paymentUrl ||
      orderData.data?.redirectUrl || orderData.redirectUrl;

    if (!paymentUrl)
      return res.status(500).json({ success: false, message: 'PG order failed', raw: orderData });

    await pool.query(
      `UPDATE public.payment_links SET order_id=$1, status='PROCESSING' WHERE token=$2`,
      [orderId, link.token]
    );
    res.json({ success: true, paymentUrl, orderId });
  } catch (err) {
    console.error('initiate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────
// POST /api/payment-links/webhook — PayYantra callback (PUBLIC)
// ────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId) return res.status(400).json({ success: false });
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      await pool.query(
        `UPDATE public.payment_links SET status='PAID', paid_at=NOW() WHERE order_id=$1`,
        [orderId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
