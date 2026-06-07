const express = require('express');
const cors = require('cors');
require('dotenv').config();
//To connect DB
require('./src/config/db');
require('./src/services/scheduler.service'); 
const pool = require('./src/config/db');
const app = express();
// CORS fixed
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],  // ← sirf ye add karo
  credentials: true,
}));
const { errorMiddleware, notFoundMiddleware } = require('./src/middleware/error.middleware');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// DEDICATED DRIVERS LIST ROUTE - ADD THIS AT THE TOP, BEFORE OTHER ROUTES
app.get('/api/drivers/list', async (req, res) => {
  try {
    console.log('🎯 Direct /api/drivers/list called');
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code 
       FROM public.drivers 
       WHERE status = 'ACTIVE'
       ORDER BY full_name`
    );
    console.log(`✅ Found ${result.rows.length} drivers`);
    res.json({ drivers: result.rows, success: true });
  } catch (err) {
    console.error('Error:', err);
    res.json({ drivers: [], success: false, error: err.message });
  }
});
// ROUTES
const authRoutes = require('./src/routes/auth');
const driverRoutes = require('./src/routes/driver');
const paymentRoutes = require('./src/routes/payment');
const ownerRoutes = require('./src/routes/owner');
const uploadRoutes = require('./src/routes/uploads');
app.use('/api/uploads', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
const { verifyToken, verifyAdmin } = require('./src/middleware/auth.middleware');

app.use('/api/payment',    verifyToken, require('./src/routes/payment'));
app.use('/api/assignment', verifyToken, require('./src/routes/assignment'));
// Payment Links — public webhook + GET; POST/list auth handled inside route
app.use('/api/payment-links', require('./src/routes/paymentLinks'));

// Auth routes pe JWT nahi lagega — wahan login hota hai
app.use('/api/auth', require('./src/routes/auth'));

// Admin pe admin key already hai — theek hai
app.use('/api/admin', verifyAdmin, require('./src/routes/admin'));
app.use('/api/admin', (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  const expected = process.env.ADMIN_SECRET_KEY || 'mg_admin_2026_secret';
  if (!key || key !== expected) 
    return res.status(403).json({ error: 'Forbidden' });
  next();
}, require('./src/routes/admin'));

// In index.js
app.use('/api/owner', ownerRoutes);
const rateLimit = require('express-rate-limit');

app.use('/api/auth/send-otp', rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 5,
  message: { error: 'Too many OTP requests, try after 10 minutes' }
}));
const adminRoutes = require('./src/routes/admin');
app.use('/api/admin', adminRoutes);
const assignmentRoutes = require('./src/routes/assignment');

// Check Health
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mobility Grid API is running ✅',
    env: process.env.NODE_ENV || 'development'
  });
});
// SCHEDULER
const BASE_URL = 'https://mg-qw5s.onrender.com';
const checkPendingOrders = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/payment/check-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('✅ Pending orders checked:', data);
  } catch (err) {
    console.error('❌ Scheduler error:', err.message);
  }
};
setInterval(checkPendingOrders, 5 * 60 * 1000);
// Reset Daily
const scheduleDailyReset = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;
  setTimeout(async () => {
    try {
      await pool.query('UPDATE driver_details SET amount_paid_today = 0, updated_at = NOW()');
      console.log('✅ Daily reset done');
    } catch (err) {
      console.error('❌ Daily reset error:', err);
    }
  }, msUntilMidnight);
};
scheduleDailyReset();
// Handle Erorr 404
app.use((req, res) => {
  res.status(404).json({ message: ' ' });
});
// SERVER START
const PORT = process.env.PORT || 5000;
app.use(notFoundMiddleware);
app.use(errorMiddleware);
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Base URL: http://localhost:${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});