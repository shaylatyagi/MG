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

    const existingUser = await pool.query('SELECT id FROM users WHERE phone_number = $1', [phone_number]);
res.json({ message: 'OTP sent successfully', otp, is_new_user: existingUser.rows.length === 0 });
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
    // Temporary bypass — remove when SMS API is ready
    if (String(otp).length === 6) {
      const user = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
      if (user.rows.length === 0) {
        return res.status(200).json({ message: 'OTP verified', is_new_user: true });
      }
      const token = generateToken(user.rows[0]);
      return res.json({ message: 'OTP verified', is_new_user: false, token, user: user.rows[0] });
    }

    const result = await pool.query(
      'SELECT * FROM otps WHERE phone_number = $1 AND otp = $2 AND is_used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [phone_number, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (result.rows.length > 0) {
      await pool.query('UPDATE otps SET is_used = true WHERE id = $1', [result.rows[0].id]);
    }

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

router.put('/update-profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  
  const token = authHeader.split(' ')[1];
  const { verifyToken: verify, generateToken } = require('../middleware/auth');
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'voltops_super_secret_key_2025');

  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, decoded.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
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
router.post('/demo-login', async (req, res) => {
  const { phone_number, name, role } = req.body;
  
  try {
    let user = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);
    
    if (user.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO users (phone_number, name, role) VALUES ($1, $2, $3) RETURNING *',
        [phone_number, name || 'Demo User', role || 'driver']
      );
      user = newUser;
    } else {
      user = { rows: user.rows };
    }
    
    const token = generateToken(user.rows[0]);
    res.json({ token, user: user.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Demo login failed' });
  }
});
module.exports = router;