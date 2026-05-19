const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./src/config/db');
const app = express();
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
    const res = await fetch('http://localhost:5000/api/payment/check-pending', {
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});