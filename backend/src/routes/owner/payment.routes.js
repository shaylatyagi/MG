/**
 * Owner — Payment & Financial Routes
 * backend/src/routes/owner/payment.routes.js
 */

const express = require('express');
const router  = express.Router();
const pool    = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// Record cash payment
router.post('/cash', async (req, res) => {
  try {
    const { driverPhone, driverName, amount, ownerId, purpose = 'RENT' } = req.body;
    if (!driverPhone || !amount)
      return res.status(400).json({ success: false, message: 'Missing fields' });

    const info = await pool.query(`
      SELECT d.full_name, d.driver_code, d.owner_code, v.vehicle_number
      FROM public.drivers d
      LEFT JOIN public.vehicles v ON v.driver_id = d.id
      LEFT JOIN public.owners o ON o.owner_code = d.owner_code
      WHERE d.mobile_number = $1 LIMIT 1`, [driverPhone]);
    const di = info.rows[0] || {};

    const orderId = uuidv4();
    const orderNumber = `CASH-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;

    await pool.query(`
      INSERT INTO ms_orders (
        order_id, order_number, pg_transaction_id, order_amount, currency,
        payer_name, payer_mobile, transaction_status, payment_mode,
        order_completion_date, order_initiation_date,
        driver_code, owner_code, vehicle_number, driver_full_name, purpose
      ) VALUES ($1,$2,$3,$4,'INR',$5,$6,'SUCCESS','CASH',NOW(),NOW(),$7,$8,$9,$10,$11)`,
      [orderId, orderNumber, orderNumber, parseFloat(amount),
       di.full_name || driverName, driverPhone,
       di.driver_code || null, di.owner_code || null,
       di.vehicle_number || null, di.full_name || driverName, purpose]
    );

    await pool.query(
      `UPDATE public.drivers SET wallet_balance = COALESCE(wallet_balance,0) + $1 WHERE mobile_number = $2`,
      [parseFloat(amount), driverPhone]
    );

    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       SELECT id, 'DRIVER', '💵 Cash Payment Recorded', $2, NOW()
       FROM public.drivers WHERE mobile_number = $1`,
      [driverPhone, `Owner recorded your cash payment of ₹${amount}`]
    ).catch(()=>{});

    res.json({ success: true, message: 'Cash payment recorded!', order_number: orderNumber });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ledger summary
router.get('/ledger', async (req, res) => {
  try {
    const { period } = req.query;
    let where = '';
    switch(period) {
      case 'yesterday':  where = `DATE(order_completion_date) = CURRENT_DATE - INTERVAL '1 day'`; break;
      case 'week':       where = `order_completion_date >= NOW() - INTERVAL '7 days'`; break;
      case 'this_month': where = `DATE_TRUNC('month', order_completion_date) = DATE_TRUNC('month', NOW())`; break;
      case 'last_month': where = `DATE_TRUNC('month', order_completion_date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')`; break;
      default:           where = `DATE(order_completion_date) = CURRENT_DATE`;
    }
    const received = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders WHERE transaction_status='SUCCESS' AND ${where}`
    );
    const pending = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders WHERE transaction_status='PENDING' AND DATE(order_initiation_date)=CURRENT_DATE`
    );
    res.json({
      received: parseFloat(received.rows[0].total),
      outstanding: parseFloat(pending.rows[0].total),
    });
  } catch(err) { res.json({ received: 0, outstanding: 0 }); }
});

// Recent transactions
router.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mo.order_id, mo.order_number, mo.order_amount,
             mo.order_initiation_date, mo.order_completion_date,
             mo.transaction_status, mo.payment_mode, mo.payer_mobile,
             COALESCE(d.full_name, mo.payer_name) as driver_name,
             v.vehicle_number
      FROM public.ms_orders mo
      LEFT JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
      LEFT JOIN public.vehicles v ON v.driver_id = d.id
      WHERE mo.transaction_status = 'SUCCESS'
      ORDER BY mo.order_initiation_date DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

// Driver ledger overview
router.get('/driver-ledger', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const ownerRes = await pool.query(
      `SELECT owner_code FROM public.owners WHERE id = $1`, [ownerId]
    );
    const ownerCode = ownerRes.rows[0]?.owner_code;
    if (!ownerCode) return res.status(404).json({ error: 'Owner not found' });

    const result = await pool.query(`
      SELECT d.id, d.full_name, d.mobile_number, d.advance_balance, d.security_deposit,
             v.vehicle_number, v.daily_rent,
             COALESCE(SUM(CASE WHEN dl.entry_type IN ('PAYMENT','CASH_PAYMENT','UPI_PAYMENT','ADVANCE_CREDIT','REPAIR_CREDIT','REFUND') THEN dl.amount ELSE 0 END), 0) AS total_paid,
             COALESCE(SUM(CASE WHEN dl.entry_type IN ('RENT_CHARGE','DAMAGE_CHARGE','DEPOSIT_CHARGE','PENALTY','SECURITY_DEPOSIT') THEN dl.amount ELSE 0 END), 0) AS total_charged
      FROM public.drivers d
      LEFT JOIN public.vehicles v ON v.driver_id = d.id
      LEFT JOIN public.driver_ledger dl ON dl.driver_id = d.id
      WHERE d.owner_code = $1 AND d.status = 'ACTIVE'
      GROUP BY d.id, d.full_name, d.mobile_number, d.advance_balance, d.security_deposit, v.vehicle_number, v.daily_rent
      ORDER BY d.full_name`, [ownerCode]
    );

    res.json(result.rows.map(d => ({
      ...d,
      daily_rent: parseFloat(d.daily_rent || 0),
      total_paid: parseFloat(d.total_paid || 0),
      total_charged: parseFloat(d.total_charged || 0),
      pending: Math.max(0, parseFloat(d.total_charged) - parseFloat(d.total_paid)),
      advance: parseFloat(d.advance_balance || 0),
      security_deposit: parseFloat(d.security_deposit || 0)
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Manual ledger entry
router.post('/ledger-entry', async (req, res) => {
  try {
    const { driverId, ownerId, entryType, amount, description } = req.body;
    const ownerRes = await pool.query(`SELECT owner_code FROM public.owners WHERE id = $1`, [ownerId]);
    const ownerCode = ownerRes.rows[0]?.owner_code;
    const driverCheck = await pool.query(
      `SELECT id FROM public.drivers WHERE id = $1 AND owner_code = $2`, [driverId, ownerCode]
    );
    if (!driverCheck.rows[0])
      return res.status(403).json({ error: 'Driver does not belong to this owner' });

    await pool.query(
      `INSERT INTO public.driver_ledger (driver_id, owner_id, entry_type, amount, description, created_by)
       VALUES ($1, $2, $3, $4, $5, 'OWNER')`,
      [driverId, ownerId, entryType, amount, description || '']
    );

    if (['ADVANCE_CREDIT', 'REPAIR_CREDIT', 'REFUND'].includes(entryType)) {
      await pool.query(
        `UPDATE public.drivers SET advance_balance = COALESCE(advance_balance, 0) + $1 WHERE id = $2`,
        [amount, driverId]
      );
    }
    if (['DAMAGE_CHARGE', 'PENALTY'].includes(entryType)) {
      await pool.query(
        `UPDATE public.drivers SET advance_balance = GREATEST(0, COALESCE(advance_balance, 0) - $1) WHERE id = $2`,
        [amount, driverId]
      );
    }

    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'DRIVER', '📋 Ledger Update', $2, NOW())`,
      [driverId, `Ledger entry: ₹${amount} (${entryType})`]
    ).catch(() => {});

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Owner stats
router.get('/stats', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.status(400).json({ message: 'Owner ID required' });

    const [vehicles, drivers, earnings] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM public.vehicles WHERE owner_id = $1', [parseInt(ownerId)]),
      pool.query('SELECT COUNT(*) FROM public.drivers WHERE owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)', [parseInt(ownerId)]),
      pool.query(`SELECT COALESCE(SUM(order_amount), 0) as total FROM public.ms_orders mo
        JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
        WHERE d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
        AND mo.transaction_status = 'SUCCESS'`, [parseInt(ownerId)])
    ]);

    res.json({
      total_vehicles: parseInt(vehicles.rows[0].count || 0),
      total_drivers: parseInt(drivers.rows[0].count || 0),
      total_earnings: parseFloat(earnings.rows[0].total || 0)
    });
  } catch (err) { res.json({ total_vehicles: 0, total_drivers: 0, total_earnings: 0 }); }
});

// Owner by phone
router.get('/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, owner_code, wallet_balance, status, created_at
       FROM public.owners WHERE mobile_number = $1`, [phone]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Owner notifications
router.get('/notifications', async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) return res.json([]);
    const ownerResult = await pool.query('SELECT owner_code FROM public.owners WHERE id = $1', [ownerId]);
    if (!ownerResult.rows[0]) return res.json([]);
    const ownerCode = ownerResult.rows[0].owner_code;
    const result = await pool.query(
      `SELECT n.id, n.driver_id, n.title, n.message, n.is_read, n.created_at, n.metadata, d.full_name as driver_name
       FROM public.notifications n
       LEFT JOIN public.drivers d ON d.id = n.driver_id
       WHERE (d.owner_code = $1 OR n.user_type = 'OWNER') AND n.user_type != 'DRIVER'
       ORDER BY n.created_at DESC LIMIT 50`, [ownerCode]
    );
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

// SOS
router.get('/sos', async (req, res) => {
  try {
    const { ownerId } = req.query;
    const result = await pool.query(
      `SELECT s.*, d.full_name, d.mobile_number FROM public.sos_alerts s
       JOIN public.drivers d ON d.id = s.driver_id
       WHERE s.status = 'ACTIVE' AND d.owner_code = (SELECT owner_code FROM public.owners WHERE id = $1)
       ORDER BY s.created_at DESC LIMIT 5`, [ownerId]
    );
    res.json(result.rows);
  } catch(err) { res.json([]); }
});

router.put('/sos/:id/dismiss', async (req, res) => {
  try {
    await pool.query(`UPDATE public.sos_alerts SET status='DISMISSED' WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;