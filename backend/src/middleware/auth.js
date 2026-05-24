require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // 1. Yahan import zaroori hai
const pool = require('../config/db');
const { generateToken, verifyToken } = require('../middleware/auth'); // 2. verifyToken yahan se aayega

// OTP Send
router.post('/send-otp', async (req, res) => {
  const { mobile_number } = req.body;
  if (!mobile_number || !/^\d{10}$/.test(mobile_number)) {
    return res.status(400).json({ message: 'Valid 10 digit mobile number required' });
  }
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query('INSERT INTO otps (phone_number, otp, expires_at) VALUES ($1, $2, $3)', [mobile_number, otp, expires_at]);
    res.json({ message: 'OTP sent successfully', otp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// OTP Verify
router.post('/verify-otp', async (req, res) => {
  const { mobile_number, otp } = req.body;
  try {
    if (String(otp).length === 6) {
      const user = await pool.query('SELECT * FROM auth.users WHERE mobile_number = $1', [mobile_number]);
      if (user.rows.length === 0) return res.json({ message: 'OTP verified', is_new_user: true, mobile_number });
      
      const token = generateToken(user.rows[0]);
      return res.json({ message: 'OTP verified', is_new_user: false, token, user: user.rows[0] });
    }
    return res.status(400).json({ message: 'Invalid OTP' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Update Profile (Middleware use karke)
// Line 7 wala issue yahan solve hoga
router.put('/update-profile', verifyToken, async (req, res) => {
  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ message: 'Name required' });

  try {
    // verifyToken middleware se req.user mil jayega
    await pool.query(
      `UPDATE auth.vehicle_drivers SET full_name = $1, updated_at = NOW() WHERE user_id = $2`,
      [full_name, req.user.id] 
    );
    res.json({ message: 'Profile updated', name: full_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;