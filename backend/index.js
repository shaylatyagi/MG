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

app.get('/', (req, res) => {
  res.json({ message: 'Mobility Grid API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});