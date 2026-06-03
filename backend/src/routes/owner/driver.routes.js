/**
 * Owner — Driver Management Routes
 * backend/src/routes/owner/driver.routes.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { parseDate } = require('../../utils/helpers');

// GET all drivers for owner
router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number as phone_number,
              d.driver_code, d.wallet_balance, d.status, d.created_at,
              COALESCE(v.vehicle_number, 'Not Assigned') as assigned_vehicle,
              v.id as vehicle_id
       FROM public.drivers d
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.status = 'ACTIVE'
       ORDER BY d.full_name`
    );
    res.json({ drivers: result.rows });
  } catch (err) {
    console.error('Get drivers error:', err);
    res.json({ drivers: [] });
  }
});

// ADD driver
router.post('/add', async (req, res) => {
  try {
    const { full_name, mobile_number, owner_id, owner_code,
            date_of_birth, emergency_contact_name,
            emergency_contact_number, driving_license_number,
            driving_license_expiry, security_deposit } = req.body;

    if (!full_name || !mobile_number)
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    if (/[0-9]/.test(full_name))
      return res.status(400).json({ success: false, message: 'Name cannot contain numbers' });
    if (!/^\d{10}$/.test(mobile_number))
      return res.status(400).json({ success: false, message: 'Phone must be 10 digits' });

    const existing = await pool.query(
      'SELECT id FROM public.drivers WHERE mobile_number = $1', [mobile_number]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Driver with this phone already exists' });

    // Get owner_code if not provided
    let finalOwnerCode = owner_code;
    if (!finalOwnerCode && owner_id) {
      const ownerRes = await pool.query(
        'SELECT owner_code FROM public.owners WHERE id = $1', [owner_id]
      );
      finalOwnerCode = ownerRes.rows[0]?.owner_code;
    }

    const driverCode = 'DRV' + Date.now().toString().slice(-6);
    const result = await pool.query(
      `INSERT INTO public.drivers 
        (full_name, mobile_number, owner_code, driver_code, wallet_balance, status,
         date_of_birth, emergency_contact_name, emergency_contact_number,
         driving_license_number, driving_license_expiry, security_deposit)
       VALUES ($1,$2,$3,$4,0,'ACTIVE',$5,$6,$7,$8,$9,$10) 
       RETURNING id, driver_code`,
      [full_name, mobile_number, finalOwnerCode, driverCode,
       parseDate(date_of_birth), emergency_contact_name || null,
       emergency_contact_number || null, driving_license_number || null,
       parseDate(driving_license_expiry), parseFloat(security_deposit) || 0]
    );

    res.json({ success: true, message: 'Driver added!', driver_code: result.rows[0].driver_code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// BULK upload drivers
router.post('/bulk-upload', async (req, res) => {
  try {
    const { drivers, ownerId, ownerCode } = req.body;
    if (!drivers?.length) return res.status(400).json({ success: false, message: 'No data' });

    let finalOwnerCode = ownerCode;
    if (!finalOwnerCode && ownerId) {
      const ownerRes = await pool.query(
        `SELECT owner_code FROM public.owners WHERE id = $1`, [parseInt(ownerId)]
      );
      finalOwnerCode = ownerRes.rows[0]?.owner_code;
    }
    if (!finalOwnerCode) return res.status(400).json({ success: false, message: 'Owner not found' });

    const results = { success: [], failed: [] };
    for (const driver of drivers) {
      try {
        const phone = String(driver.mobile_number || '').replace(/\s/g, '').trim();
        const name = (driver.full_name || '').trim();
        if (!name) { results.failed.push({ name, reason: 'Name missing' }); continue; }
        if (/[0-9]/.test(name)) { results.failed.push({ name, reason: 'Name has numbers' }); continue; }
        if (!/^\d{10}$/.test(phone)) { results.failed.push({ name, reason: `${phone} invalid` }); continue; }

        const existing = await pool.query(
          'SELECT id FROM public.drivers WHERE mobile_number = $1', [phone]
        );
        if (existing.rows.length > 0) {
          results.failed.push({ name, reason: `${phone} already exists` }); continue;
        }

        const driverCode = 'DRV' + Date.now().toString().slice(-5) + Math.random().toString(36).substr(2,3).toUpperCase();
        await pool.query(
          `INSERT INTO public.drivers 
            (full_name, mobile_number, owner_code, driver_code, wallet_balance, status,
             date_of_birth, emergency_contact_name, emergency_contact_number,
             driving_license_number, driving_license_expiry, security_deposit)
           VALUES ($1,$2,$3,$4,0,'ACTIVE',$5,$6,$7,$8,$9,$10)`,
          [name, phone, finalOwnerCode, driverCode,
           parseDate(driver.date_of_birth), driver.emergency_contact_name || null,
           driver.emergency_contact_number || null, driver.driving_license_number || null,
           parseDate(driver.driving_license_expiry), parseFloat(driver.security_deposit) || 0]
        );
        results.success.push(name);
      } catch(err) {
        results.failed.push({ name: driver.full_name, reason: err.message });
      }
    }

    res.json({ success: true, imported: results.success.length, failed: results.failed.length, failures: results.failed });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Driver history
router.get('/history/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const [vehicleHistory, dailyLog] = await Promise.all([
      pool.query(`
        SELECT dvh.*, v.vehicle_number, v.vehicle_model,
          EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER as total_days,
          EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER * COALESCE(dvh.daily_rent, 0) as total_earned
        FROM public.driver_vehicle_history dvh
        JOIN public.vehicles v ON v.id = dvh.vehicle_id
        WHERE dvh.driver_id = $1 ORDER BY dvh.assigned_at DESC`, [driverId]),
      pool.query(`
        SELECT * FROM public.driver_daily_log
        WHERE driver_id = $1 ORDER BY log_date DESC LIMIT 30`, [driverId])
    ]);
    res.json({ vehicle_history: vehicleHistory.rows, daily_log: dailyLog.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Driver activity (today)
router.get('/activity', async (req, res) => {
  try {
    const { ownerId, date } = req.query;
    const actDate = date || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number,
              COALESCE(dl.active_minutes, 0) as active_minutes,
              dl.login_time, dl.logout_time,
              dl.incentive_applied, dl.incentive_amount,
              v.vehicle_number, v.daily_rent
       FROM public.drivers d
       LEFT JOIN public.driver_daily_log dl ON dl.driver_id = d.id AND dl.log_date = $2
       LEFT JOIN public.vehicles v ON v.driver_id = d.id
       WHERE d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
       ORDER BY COALESCE(dl.active_minutes, 0) DESC`,
      [ownerId, actDate]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Driver statement
router.get('/statement', async (req, res) => {
  try {
    const { driverId } = req.query;
    const driver = await pool.query(
      `SELECT full_name, mobile_number FROM public.drivers WHERE id = $1`, [driverId]
    );
    if (!driver.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    const phone = driver.rows[0].mobile_number;

    const [txns, ledger] = await Promise.all([
      pool.query(`
        SELECT order_initiation_date as date, 'Rent Payment' as type,
               order_amount as amount, COALESCE(payment_mode, 'UPI') as mode,
               transaction_status as status, order_number as reference
        FROM public.ms_orders WHERE payer_mobile = $1
        ORDER BY order_initiation_date DESC`, [phone]),
      pool.query(`
        SELECT created_at as date, entry_type as type, amount,
               COALESCE(description, '') as description
        FROM public.driver_ledger WHERE driver_id = $1
        ORDER BY created_at DESC`, [driverId])
    ]);

    res.json({
      driver_name: driver.rows[0].full_name,
      transactions: txns.rows,
      ledger_entries: ledger.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Notify unpaid drivers
router.post('/notify-unpaid', async (req, res) => {
  try {
    const paidResult = await pool.query(
      `SELECT DISTINCT payer_mobile FROM ms_orders 
       WHERE transaction_status='SUCCESS' AND DATE(order_completion_date)=CURRENT_DATE`
    );
    const paidPhones = paidResult.rows.map(r => r.payer_mobile);
    const unpaidDrivers = await pool.query(
      `SELECT id, full_name FROM public.drivers 
       WHERE status='ACTIVE' AND mobile_number != ALL($1::text[])`,
      [paidPhones]
    );
    let count = 0;
    for (const driver of unpaidDrivers.rows) {
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'DRIVER', '⏰ Payment Reminder', 'Aaj ka rent baaki hai. Please pay now.', NOW())`,
        [driver.id]
      ).catch(() => {});
      count++;
    }
    res.json({ success: true, count });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Set per-driver incentive rule
router.post('/incentive-rule', async (req, res) => {
  try {
    const { driverId, ruleIndex } = req.body;
    await pool.query(
      `UPDATE public.drivers SET incentive_rule_index = $1 WHERE id = $2`,
      [ruleIndex, driverId]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;