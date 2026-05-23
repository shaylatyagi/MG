require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { generateToken } = require('../middleware/auth');

// OTP Send
router.post('/send-otp', async (req, res) => {
  const { mobile_number } = req.body;

  if (!mobile_number || !/^\d{10}$/.test(mobile_number)) {
    return res.status(400).json({ message: 'Valid 10 digit mobile number required' });
  }

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, $3)',
      [mobile_number, otp, expires_at]
    );

    res.json({ message: 'OTP sent successfully', otp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// OTP Verify
router.post('/verify-otp', async (req, res) => {
  const { mobile_number, otp } = req.body;

  if (!mobile_number || !otp) {
    return res.status(400).json({ message: 'Mobile number and OTP required' });
  }

  try {
    // Bypass — any 6 digit OTP works
    if (String(otp).length === 6) {
      const user = await pool.query(
        'SELECT * FROM auth.users WHERE mobile_number = $1',
        [mobile_number]
      );

      if (user.rows.length === 0) {
        return res.json({ message: 'OTP verified', is_new_user: true, mobile_number });
      }

      const token = generateToken(user.rows[0]);
      return res.json({
        message: 'OTP verified',
        is_new_user: false,
        token,
        user: user.rows[0]
      });
    }

    return res.status(400).json({ message: 'Invalid OTP' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Register
router.post('/register', async (req, res) => {
  const { mobile_number, full_name, user_type } = req.body;

  if (!mobile_number || !full_name || !user_type) {
    return res.status(400).json({ message: 'Mobile, name and user type required' });
  }

  if (!['PLATFORM_ADMIN', 'VEHICLE_OWNER_USER', 'VEHICLE_DRIVER'].includes(user_type)) {
    return res.status(400).json({ message: 'Invalid user type' });
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM auth.users WHERE mobile_number = $1',
      [mobile_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user_code = user_type.substring(0, 2) + Date.now().toString().slice(-8);

    const result = await pool.query(
      `INSERT INTO auth.users (mobile_number, user_code, user_type, is_mobile_verified)
       VALUES ($1, $2, $3, true) RETURNING *`,
      [mobile_number, user_code, user_type]
    );

    // Driver ke liye vehicle_drivers mein bhi entry
    if (user_type === 'VEHICLE_DRIVER') {
      const driver_code = 'DRV' + Date.now().toString().slice(-8);
      await pool.query(
        `INSERT INTO auth.vehicle_drivers (user_id, driver_code, full_name, profile_photo_url)
         VALUES ($1, $2, $3, '')`,
        [result.rows[0].id, driver_code, full_name]
      );
    }

    const token = generateToken(result.rows[0]);
    res.status(201).json({
      message: 'Registered successfully',
      token,
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Update Profile
router.put('/update-profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });

  const jwt = require('jsonwebtoken');
  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'voltops_super_secret_key_2025');

  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ message: 'Name required' });

  try {
    await pool.query(
      `UPDATE auth.vehicle_drivers SET full_name = $1, updated_at = NOW() WHERE user_id = $2`,
      [full_name, decoded.id]
    );
    res.json({ message: 'Profile updated', name: full_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;