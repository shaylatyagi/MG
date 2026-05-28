const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Get unassigned drivers (for owner dashboard top section)
router.get('/unassigned/drivers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code, wallet_balance 
       FROM drivers 
       WHERE assigned_vehicle_id IS NULL 
       AND status = 'ACTIVE'
       ORDER BY full_name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching unassigned drivers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unassigned vehicles (for owner dashboard top section)
router.get('/unassigned/vehicles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, vehicle_number, vehicle_model, daily_rent, status 
       FROM vehicles 
       WHERE driver_id IS NULL 
       AND status = 'ACTIVE'
       ORDER BY vehicle_number`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching unassigned vehicles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign vehicle to driver
router.post('/assign', async (req, res) => {
  const client = await pool.connect();
  try {
    const { driverId, vehicleId } = req.body;
    
    await client.query('BEGIN');
    
    // Check if vehicle is available
    const vehicleCheck = await client.query(
      `SELECT driver_id FROM vehicles WHERE id = $1 FOR UPDATE`,
      [vehicleId]
    );
    
    if (vehicleCheck.rows[0]?.driver_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Vehicle already assigned' });
    }
    
    // Check if driver is available
    const driverCheck = await client.query(
      `SELECT assigned_vehicle_id FROM drivers WHERE id = $1 FOR UPDATE`,
      [driverId]
    );
    
    if (driverCheck.rows[0]?.assigned_vehicle_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Driver already has a vehicle' });
    }
    
    // Assign vehicle to driver
    await client.query(
      `UPDATE vehicles SET driver_id = $1 WHERE id = $2`,
      [driverId, vehicleId]
    );
    
    // Update driver
    await client.query(
      `UPDATE drivers SET assigned_vehicle_id = $1 WHERE id = $2`,
      [vehicleId, driverId]
    );
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Vehicle assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, d.full_name as driver_name, v.vehicle_number
       FROM transactions t
       LEFT JOIN drivers d ON t.driver_id = d.id
       LEFT JOIN vehicles v ON d.assigned_vehicle_id = v.id
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new transaction (payment collection)
router.post('/transactions', async (req, res) => {
  try {
    const { driverId, amount, type, paymentMode, orderId } = req.body;
    
    const result = await pool.query(
      `INSERT INTO transactions (driver_id, amount, type, payment_mode, order_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'completed', NOW())
       RETURNING *`,
      [driverId, amount, type || 'collection', paymentMode || 'cash', orderId || null]
    );
    
    // Update driver wallet balance
    await pool.query(
      `UPDATE drivers SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
      [amount, driverId]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;