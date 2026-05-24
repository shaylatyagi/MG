require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
// fetch vehicles
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
    // when driver phone number given, update details
    if (driver_phone) {
      const driver = await pool.query(
        'SELECT * FROM users WHERE phone_number = $1',
        [driver_phone]
      );
      if (driver.rows.length > 0) {
        const driverId = driver.rows[0].id;
        // to check if driver details exist or not
        const existing = await pool.query(
          'SELECT * FROM driver_details WHERE user_id = $1',
          [driverId]
        );
        if (existing.rows.length > 0) {
          // Update
          await pool.query(
            `UPDATE driver_details SET vehicle_number = $1, daily_rent = $2, updated_at = NOW() WHERE user_id = $3`,
            [vehicle_number, daily_rent || 0, driverId]
          );
        } else {
          // new record
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
router.get('/driver-payouts', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        v.vehicle_number,
        v.driver_name,
        v.driver_phone,
        v.daily_rent,
        COALESCE(dd.amount_paid_today, 0) as amount_paid_today,
        CASE 
          WHEN COALESCE(dd.amount_paid_today, 0) >= v.daily_rent THEN 'Paid'
          ELSE 'Pending'
        END as payout_status
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
router.put('/vehicles/:vehicle_number', verifyToken, async (req, res) => {
  const { vehicle_number } = req.params;
  const { driver_name, driver_phone } = req.body;
  try {
    const result = await pool.query(
      `UPDATE vehicles SET driver_name = $1, driver_phone = $2 WHERE vehicle_number = $3 AND owner_id = $4 RETURNING *`,
      [driver_name, driver_phone, vehicle_number, req.user.id]
    );
    //update driver details
    if (driver_phone) {
      const driver = await pool.query(
        'SELECT * FROM users WHERE phone_number = $1',
        [driver_phone]
      );
      if (driver.rows.length > 0) {
        const driverId = driver.rows[0].id;
        const vehicle = await pool.query(
          'SELECT * FROM vehicles WHERE vehicle_number = $1',
          [vehicle_number]
        );
        const dailyRent = vehicle.rows[0]?.daily_rent || 0;
        const existing = await pool.query(
          'SELECT * FROM driver_details WHERE user_id = $1',
          [driverId]
        );
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
require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
// fetch vehicles
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
    // when driver phone number given, update details
    if (driver_phone) {
      const driver = await pool.query(
        'SELECT * FROM users WHERE phone_number = $1',
        [driver_phone]
      );
      if (driver.rows.length > 0) {
        const driverId = driver.rows[0].id;
        // to check if driver details exist or not
        const existing = await pool.query(
          'SELECT * FROM driver_details WHERE user_id = $1',
          [driverId]
        );
        if (existing.rows.length > 0) {
          // Update
          await pool.query(
            `UPDATE driver_details SET vehicle_number = $1, daily_rent = $2, updated_at = NOW() WHERE user_id = $3`,
            [vehicle_number, daily_rent || 0, driverId]
          );
        } else {
          // new record
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
router.get('/driver-payouts', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        v.vehicle_number,
        v.driver_name,
        v.driver_phone,
        v.daily_rent,
        COALESCE(dd.amount_paid_today, 0) as amount_paid_today,
        CASE 
          WHEN COALESCE(dd.amount_paid_today, 0) >= v.daily_rent THEN 'Paid'
          ELSE 'Pending'
        END as payout_status
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
router.put('/vehicles/:vehicle_number', verifyToken, async (req, res) => {
  const { vehicle_number } = req.params;
  const { driver_name, driver_phone } = req.body;
  try {
    const result = await pool.query(
      `UPDATE vehicles SET driver_name = $1, driver_phone = $2 WHERE vehicle_number = $3 AND owner_id = $4 RETURNING *`,
      [driver_name, driver_phone, vehicle_number, req.user.id]
    );
    //update driver details
    if (driver_phone) {
      const driver = await pool.query(
        'SELECT * FROM users WHERE phone_number = $1',
        [driver_phone]
      );
      if (driver.rows.length > 0) {
        const driverId = driver.rows[0].id;
        const vehicle = await pool.query(
          'SELECT * FROM vehicles WHERE vehicle_number = $1',
          [vehicle_number]
        );
        const dailyRent = vehicle.rows[0]?.daily_rent || 0;
        const existing = await pool.query(
          'SELECT * FROM driver_details WHERE user_id = $1',
          [driverId]
        );
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
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const vehicleCount = await pool.query(
      'SELECT COUNT(*) FROM vehicles WHERE owner_id = $1',
      [req.user.id]
    );
    const totalEarnings = await pool.query(
      `SELECT COALESCE(SUM(o.order_amount), 0) as total
       FROM ms_orders o
       JOIN vehicles v ON o.payer_mobile = v.driver_phone
       WHERE v.owner_id = $1 AND o.transaction_status = 'SUCCESS'`,
      [req.user.id]
    );
    // Collection efficiency — kitne drivers ne aaj pay kiya
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
    var total = parseInt(totalDrivers.rows[0].count);
    var paid = parseInt(paidDrivers.rows[0].count);
    var efficiency = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;
    // Last 7 days revenue chart data
    const revenueChart = await pool.query(
      `SELECT 
        DATE(o.order_completion_date) as date,
        COALESCE(SUM(o.order_amount), 0) as value
       FROM ms_orders o
       JOIN vehicles v ON o.payer_mobile = v.driver_phone
       WHERE v.owner_id = $1 
         AND o.transaction_status = 'SUCCESS'
         AND o.order_completion_date >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(o.order_completion_date)
       ORDER BY date ASC`,
      [req.user.id]
    );
    res.json({
      total_vehicles: vehicleCount.rows[0].count,
      total_earnings: totalEarnings.rows[0].total,
      collection_efficiency: efficiency,
      revenue_chart: revenueChart.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});
module.exports = router;