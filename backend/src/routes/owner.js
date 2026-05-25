// backend/src/routes/owner.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ==================== FETCH VEHICLES ====================
router.get('/vehicles', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vehicles WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

// ==================== ADD VEHICLE ====================
router.post('/vehicles', verifyToken, async (req, res) => {
  const { vehicle_number, vehicle_age, condition, area, daily_rent, fine_per_day, rental_from, rental_to, payment_deadline, charging_station, driver_name, driver_phone } = req.body;
  
  if (!vehicle_number) {
    return res.status(400).json({ message: 'Vehicle number required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vehicles (vehicle_number, vehicle_age, condition, area, daily_rent, fine_per_day, rental_from, rental_to, payment_deadline, charging_station, driver_name, driver_phone, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [vehicle_number, vehicle_age, condition, area, daily_rent, fine_per_day, rental_from, rental_to, payment_deadline, charging_station, driver_name || 'Unassigned', driver_phone, req.user.id]
    );

    if (driver_phone) {
      const driver = await pool.query('SELECT * FROM users WHERE phone_number = $1', [driver_phone]);
      if (driver.rows.length > 0) {
        const driverId = driver.rows[0].id;
        const existing = await pool.query('SELECT * FROM driver_details WHERE user_id = $1', [driverId]);

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE driver_details SET vehicle_number = $1, daily_rent = $2, updated_at = NOW() WHERE user_id = $3`,
            [vehicle_number, daily_rent || 0, driverId]
          );
        } else {
          await pool.query(
            `INSERT INTO driver_details (user_id, vehicle_number, daily_rent, wallet_balance, battery_level, kms_driven)
             VALUES ($1, $2, $3, 0, 0, 0)`,
            [driverId, vehicle_number, daily_rent || 0]
          );
        }
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add vehicle' });
  }
});

// ==================== DRIVER PAYOUTS ====================
router.get('/driver-payouts', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        v.vehicle_number, v.driver_name, v.driver_phone, v.daily_rent,
        COALESCE(dd.amount_paid_today, 0) as amount_paid_today,
        CASE WHEN COALESCE(dd.amount_paid_today, 0) >= v.daily_rent THEN 'Paid' ELSE 'Pending' END as payout_status
       FROM vehicles v
       LEFT JOIN users u ON u.phone_number = v.driver_phone
       LEFT JOIN driver_details dd ON dd.user_id = u.id
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch driver payouts' });
  }
});

// ==================== UPDATE VEHICLE DRIVER ====================
router.put('/vehicles/:vehicle_number', verifyToken, async (req, res) => {
  const { vehicle_number } = req.params;
  const { driver_name, driver_phone } = req.body;

  try {
    const result = await pool.query(
      `UPDATE vehicles SET driver_name = $1, driver_phone = $2 
       WHERE vehicle_number = $3 AND owner_id = $4 RETURNING *`,
      [driver_name, driver_phone, vehicle_number, req.user.id]
    );

    if (driver_phone) {
      const driver = await pool.query('SELECT * FROM users WHERE phone_number = $1', [driver_phone]);
      if (driver.rows.length > 0) {
        const driverId = driver.rows[0].id;
        const vehicle = await pool.query('SELECT daily_rent FROM vehicles WHERE vehicle_number = $1', [vehicle_number]);
        const dailyRent = vehicle.rows[0]?.daily_rent || 0;

        const existing = await pool.query('SELECT * FROM driver_details WHERE user_id = $1', [driverId]);

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE driver_details SET vehicle_number = $1, daily_rent = $2, updated_at = NOW() WHERE user_id = $3`,
            [vehicle_number, dailyRent, driverId]
          );
        } else {
          await pool.query(
            `INSERT INTO driver_details (user_id, vehicle_number, daily_rent, wallet_balance, battery_level, kms_driven)
             VALUES ($1, $2, $3, 0, 0, 0)`,
            [driverId, vehicle_number, dailyRent]
          );
        }
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update driver' });
  }
});

// ==================== OWNER STATS ====================
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const vehicleCount = await pool.query('SELECT COUNT(*) FROM vehicles WHERE owner_id = $1', [req.user.id]);
    const totalEarnings = await pool.query(
      `SELECT COALESCE(SUM(o.order_amount), 0) as total
       FROM ms_orders o
       JOIN vehicles v ON o.payer_mobile = v.driver_phone
       WHERE v.owner_id = $1 AND o.transaction_status = 'SUCCESS'`,
      [req.user.id]
    );

    const totalDrivers = await pool.query(
      'SELECT COUNT(*) FROM vehicles WHERE owner_id = $1 AND driver_phone IS NOT NULL',
      [req.user.id]
    );
    const paidDrivers = await pool.query(
      `SELECT COUNT(*) FROM vehicles v
       LEFT JOIN users u ON u.phone_number = v.driver_phone
       LEFT JOIN driver_details dd ON dd.user_id = u.id
       WHERE v.owner_id = $1 AND dd.amount_paid_today >= v.daily_rent`,
      [req.user.id]
    );

    const total = parseInt(totalDrivers.rows[0].count);
    const paid = parseInt(paidDrivers.rows[0].count);
    const efficiency = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;

    res.json({
      total_vehicles: vehicleCount.rows[0].count,
      total_earnings: totalEarnings.rows[0].total,
      collection_efficiency: efficiency,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

module.exports = router;