require('dotenv').config();
const { generateToken } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  
  if (!phone_number) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, $3)',
      [phone_number, otp, expires_at]
    );

    res.json({ message: 'OTP sent successfully', otp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;

  if (!phone_number || !otp) {
    return res.status(400).json({ message: 'Phone number and OTP are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM otps WHERE phone_number = $1 AND otp = $2 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone_number, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await pool.query('UPDATE otps SET is_used = true WHERE id = $1', [result.rows[0].id]);

    const user = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);

    if (user.rows.length === 0) {
      return res.status(200).json({ message: 'OTP verified', is_new_user: true });
    }

    const token = generateToken(user.rows[0]);
    res.json({ message: 'OTP verified', is_new_user: false, token, user: user.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
router.post('/register', async (req, res) => {
  const { phone_number, name, role } = req.body;

  if (!phone_number || !name || !role) {
    return res.status(400).json({ message: 'Phone number, name and role are required' });
  }

  if (!['driver', 'owner', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const result = await pool.query(
      'INSERT INTO users (phone_number, name, role) VALUES ($1, $2, $3) RETURNING *',
      [phone_number, name, role]
    );

    const token = generateToken(result.rows[0]);
res.status(201).json({ message: 'User registered successfully', token, user: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});
module.exports = router;