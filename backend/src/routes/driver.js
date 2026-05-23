require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'voltops_super_secret_key_2025');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/profile', verifyToken, async (req, res) => {
  const user_id = req.user.id;
  try {
    const existing = await pool.query('SELECT * FROM drivers WHERE user_id = $1', [user_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Driver profile already exists' });
    }
    const result = await pool.query(
      'INSERT INTO drivers (user_id) VALUES ($1) RETURNING *',
      [user_id]
    );
    res.status(201).json({ message: 'Driver profile created', driver: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

module.exports = router;