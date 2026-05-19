/*const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./src/config/db');
const app = express();
const pool = require('./src/config/db');
app.use(cors());
app.use(express.json());
const authRoutes = require('./src/routes/auth');
app.use('/api/auth', authRoutes);
const driverRoutes = require('./src/routes/driver');
app.use('/api/driver', driverRoutes);
const paymentRoutes = require('./src/routes/payment');
app.use('/api/payment', paymentRoutes);
const ownerRoutes = require('./src/routes/owner');
app.use('/api/owner', ownerRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Mobility Grid API is running' });
});
const PORT = process.env.PORT || 5000;
const checkPendingOrders = async () => {
  try {
    const res = await fetch(`${process.env.RAILWAY_STATIC_URL || 'http://localhost:5000'}/api/payment/check-pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    console.log('Pending check:', data);
  } catch (err) {
    console.error('Scheduler error:', err);
  }
};
// Har 5 min mein run karo
setInterval(checkPendingOrders, 5 * 60 * 1000);
// Raat 12 baje amount_paid_today reset karo
const scheduleDailyReset = () => {
  var now = new Date();
  var midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  var msUntilMidnight = midnight - now;
  setTimeout(async () => {
    try {
      await pool.query('UPDATE driver_details SET amount_paid_today = 0, updated_at = NOW()');
      console.log('Daily reset done');
    } catch (err) {
      console.error('Daily reset error:', err);
    }
    setInterval(async () => {
      try {
        await pool.query('UPDATE driver_details SET amount_paid_today = 0, updated_at = NOW()');
        console.log('Daily reset done');
      } catch (err) {
        console.error('Daily reset error:', err);
      }
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
};
scheduleDailyReset();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// DB Connection
require('./src/config/db');        // sirf connection ke liye
const pool = require('./src/config/db');

const app = express();

// ====================== MIDDLEWARE ======================
app.use(cors({
  origin: ['https://fleet2026-66cdf.web.app', 'https://fleet2026-66cdf.firebaseapp.com'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== ROUTES ======================
const authRoutes = require('./src/routes/auth');
const driverRoutes = require('./src/routes/driver');
const paymentRoutes = require('./src/routes/payment');
const ownerRoutes = require('./src/routes/owner');

app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/owner', ownerRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mobility Grid API is running ✅',
    env: process.env.NODE_ENV || 'development'
  });
});

// ====================== SCHEDULER ======================
const BASE_URL = 'https://mg-backend-production.up.railway.app';
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'http://localhost:5000';

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

// Run every 5 minutes
setInterval(checkPendingOrders, 5 * 60 * 1000);

// Daily Reset at Midnight
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

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Base URL: ${BASE_URL}`);
});