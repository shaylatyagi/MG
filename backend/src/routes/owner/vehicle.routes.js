/**
 * Owner — Vehicle Management Routes
 * backend/src/routes/owner/vehicle.routes.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { parseDate } = require('../../utils/helpers');

// GET owner vehicles
router.get('/', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });
    const result = await pool.query(
      `SELECT v.id, v.vehicle_number, v.vehicle_model, v.daily_rent, v.status,
              v.created_at, v.driver_id, v.driver_name, v.driver_phone
       FROM public.vehicles v
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [parseInt(ownerId)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD vehicle
router.post('/', async (req, res) => {
  try {
    const { owner_id, vehicle_number, vehicle_model, daily_rent, driver_id,
            vehicle_type, insurance_expiry, fitness_expiry, chassis_number } = req.body;

    if (!owner_id || !vehicle_number)
      return res.status(400).json({ success: false, message: 'Vehicle number and owner ID required' });

    const existing = await pool.query(
      'SELECT id FROM public.vehicles WHERE vehicle_number = $1', [vehicle_number]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Vehicle number already exists' });

    const result = await pool.query(
      `INSERT INTO public.vehicles 
        (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id, status,
         vehicle_type, insurance_expiry, fitness_expiry, chassis_number, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       RETURNING id, vehicle_number`,
      [vehicle_number, vehicle_model || 'Standard', daily_rent || 850,
       parseInt(owner_id), driver_id || null,
       driver_id ? 'ASSIGNED' : 'AVAILABLE',
       vehicle_type || null,
       parseDate(insurance_expiry), parseDate(fitness_expiry),
       chassis_number || null]
    );

    if (driver_id) {
      await pool.query(
        `UPDATE public.drivers SET assigned_vehicle_id = $1 WHERE id = $2`,
        [result.rows[0].id, driver_id]
      );
      const driverInfo = await pool.query(
        'SELECT full_name, mobile_number FROM public.drivers WHERE id = $1', [driver_id]
      );
      if (driverInfo.rows[0]) {
        await pool.query(
          `UPDATE public.vehicles SET driver_name = $1, driver_phone = $2 WHERE id = $3`,
          [driverInfo.rows[0].full_name, driverInfo.rows[0].mobile_number, result.rows[0].id]
        );
      }
    }

    res.json({ success: true, message: 'Vehicle added!', vehicle: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// BULK upload vehicles
router.post('/bulk-upload', async (req, res) => {
  try {
    const { vehicles, ownerId } = req.body;
    if (!vehicles?.length) return res.status(400).json({ success: false, message: 'No data' });

    const results = { success: [], failed: [] };
    for (const v of vehicles) {
      try {
        const num = (v.vehicle_number || '').trim().toUpperCase();
        if (!num) { results.failed.push({ num, reason: 'Vehicle number missing' }); continue; }
        if (!v.vehicle_model) { results.failed.push({ num, reason: 'Model missing' }); continue; }

        const existing = await pool.query(
          'SELECT id FROM public.vehicles WHERE vehicle_number = $1', [num]
        );
        if (existing.rows.length > 0) {
          results.failed.push({ num, reason: `${num} already exists` }); continue;
        }

        await pool.query(
          `INSERT INTO public.vehicles 
            (vehicle_number, vehicle_model, vehicle_type, daily_rent, owner_id, status,
             insurance_expiry, fitness_expiry, chassis_number, created_at)
           VALUES ($1,$2,$3,$4,$5,'AVAILABLE',$6,$7,$8,NOW())`,
          [num, v.vehicle_model.trim(), v.vehicle_type || 'TRUCK',
           parseFloat(v.daily_rent) || 850, parseInt(ownerId) || 1,
           parseDate(v.insurance_expiry), parseDate(v.fitness_expiry),
           v.chassis_number || null]
        );
        results.success.push(num);
      } catch(err) {
        results.failed.push({ num: v.vehicle_number, reason: err.message });
      }
    }
    res.json({ success: true, imported: results.success.length, failed: results.failed.length, failures: results.failed });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Vehicle history
router.get('/history/:vehicleId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dvh.*, d.full_name as driver_name, d.mobile_number as driver_phone,
        EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER as total_days,
        EXTRACT(DAY FROM COALESCE(dvh.unassigned_at, NOW()) - dvh.assigned_at)::INTEGER * COALESCE(dvh.daily_rent, 0) as total_earned
      FROM public.driver_vehicle_history dvh
      JOIN public.drivers d ON d.id = dvh.driver_id
      WHERE dvh.vehicle_id = $1 ORDER BY dvh.assigned_at DESC`,
      [req.params.vehicleId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Vehicle stats
router.get('/stats/:vehicleId', async (req, res) => {
  try {
    const vehicle = await pool.query(
      `SELECT v.*, d.mobile_number as driver_phone
       FROM public.vehicles v LEFT JOIN public.drivers d ON d.id = v.driver_id
       WHERE v.id = $1`, [req.params.vehicleId]
    );
    const v = vehicle.rows[0];
    if (!v) return res.status(404).json({ error: 'Not found' });

    const revenue = await pool.query(
      `SELECT COALESCE(SUM(order_amount), 0) as total, COUNT(*) as payment_count
       FROM public.ms_orders WHERE payer_mobile = $1 AND transaction_status = 'SUCCESS'`,
      [v.driver_phone]
    );
    const assignedDays = v.created_at
      ? Math.floor((new Date() - new Date(v.created_at)) / (1000*60*60*24)) : 0;
    const totalRevenue = parseFloat(revenue.rows[0].total);
    const expectedRevenue = assignedDays * parseFloat(v.daily_rent || 0);
    const roi = expectedRevenue > 0 ? Math.round((totalRevenue / expectedRevenue) * 100) : 0;

    res.json({
      total_revenue: totalRevenue,
      payment_count: parseInt(revenue.rows[0].payment_count),
      assigned_days: assignedDays,
      expected_revenue: expectedRevenue,
      roi_percent: roi,
      utilization: Math.min(roi, 100)
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// Damage records
router.post('/damage', async (req, res) => {
  try {
    const { vehicleId, driverId, ownerId, damageType, description, amount, recoveryMethod } = req.body;
    await pool.query(
      `INSERT INTO public.damage_records 
        (vehicle_id, driver_id, owner_id, damage_type, description, damage_amount, recovery_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [vehicleId, driverId||null, ownerId, damageType||'OTHER', description, amount||0, recoveryMethod||'LEDGER']
    );
    if (recoveryMethod === 'LEDGER' && driverId && amount > 0) {
      await pool.query(
        `INSERT INTO public.driver_ledger (driver_id, owner_id, entry_type, amount, description)
         VALUES ($1,$2,'DAMAGE_CHARGE',$3,$4)`,
        [driverId, ownerId, amount, description || 'Vehicle damage charge']
      );
    }
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.get('/damage/:vehicleId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dr.*, d.full_name as driver_name
       FROM public.damage_records dr LEFT JOIN public.drivers d ON d.id = dr.driver_id
       WHERE dr.vehicle_id = $1 ORDER BY dr.created_at DESC`,
      [req.params.vehicleId]
    );
    res.json(result.rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

router.put('/damage/:id/resolve', async (req, res) => {
  try {
    await pool.query(`UPDATE public.damage_records SET status='RESOLVED' WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;