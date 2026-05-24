const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { generateToken, verifyToken } = require('../middleware/auth');

// 1. OTP Send
router.post('/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number) return res.status(400).json({ message: 'Phone number required' });
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query('INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')', [phone_number, otp]);
    res.json({ message: 'OTP sent', otp });
  } catch (err) {
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

// 2. OTP Verify
router.post('/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
    if (user.rows.length === 0) return res.json({ message: 'OTP verified', is_new_user: true });
    
    const token = generateToken(user.rows[0]);
    res.json({ message: 'OTP verified', is_new_user: false, token, user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed' });
  }
});

// 3. Update Profile (Protected Route)
router.put('/update-profile', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, req.user.id] // req.user.id middleware se aa raha hai
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update' });
  }
});

// 4. Register
router.post('/register', async (req, res) => {
  const { phone_number, name, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (phone_number, name, role) VALUES ($1, $2, $3) RETURNING *',
      [phone_number, name, role]
    );
    const token = generateToken(result.rows[0]);
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

module.exports = router;