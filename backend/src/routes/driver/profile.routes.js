/**
 * Driver — Profile & Activity Routes
 * backend/src/routes/driver/profile.routes.js
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// Driver profile with dues calculation
router.get('/profile', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone required' });

    const result = await pool.query(`
      SELECT d.id, d.full_name as name, d.mobile_number as phone,
             d.driver_code, d.wallet_balance, d.status, d.advance_balance, d.security_deposit,
             v.id as vehicle_id, v.vehicle_number, v.vehicle_model,
             v.daily_rent as vehicle_daily_rent, v.status as vehicle_status,
             v.created_at as assigned_since
      FROM public.drivers d LEFT JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.mobile_number = $1`, [phone]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Driver not found' });
    const p = result.rows[0];

    let amount_paid_today = 0, total_outstanding = 0;
    let dailyDepositRecovery = 0, effectiveDailyCharge = 0;

    if (p.vehicle_number && p.vehicle_daily_rent) {
      const dailyRent = parseFloat(p.vehicle_daily_rent);
      const securityDeposit = parseFloat(p.security_deposit || 0);
      dailyDepositRecovery = securityDeposit > 0 ? Math.round(securityDeposit / 100) : 0;
      effectiveDailyCharge = dailyRent + dailyDepositRecovery;

      // Use driver_ledger as single source of truth (same as owner stats)
      const [ledgerRes, todayPaidRes] = await Promise.all([
        pool.query(`
          SELECT
            COALESCE(SUM(CASE WHEN entry_type IN ('RENT_CHARGE','PENALTY','SECURITY_DEPOSIT','DAMAGE_CHARGE') THEN amount ELSE 0 END), 0) AS total_charged,
            COALESCE(SUM(CASE WHEN entry_type IN ('PAYMENT','CASH_PAYMENT','UPI_PAYMENT','ADVANCE_CREDIT','REFUND') THEN amount ELSE 0 END), 0) AS total_paid
          FROM public.driver_ledger
          WHERE driver_id = $1`, [p.id]),
        pool.query(`
          SELECT COALESCE(SUM(order_amount), 0) AS total
          FROM public.ms_orders
          WHERE payer_mobile = $1 AND transaction_status = 'SUCCESS'
            AND DATE(order_completion_date AT TIME ZONE 'Asia/Kolkata') = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
          [phone])
      ]);

      const totalCharged = parseFloat(ledgerRes.rows[0].total_charged);
      const totalPaid    = parseFloat(ledgerRes.rows[0].total_paid);
      const advance      = parseFloat(p.advance_balance || 0);
      total_outstanding  = Math.max(0, totalCharged - totalPaid - advance);
      amount_paid_today  = parseFloat(todayPaidRes.rows[0].total);
    }

    res.json({ ...p, amount_paid_today, total_outstanding, current_dues: total_outstanding,
               daily_deposit_recovery: dailyDepositRecovery, effective_daily_charge: effectiveDailyCharge });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Driver dues
router.get('/dues', async (req, res) => {
  try {
    const { phone } = req.query;
    const result = await pool.query(
      `SELECT d.*, v.daily_rent as vehicle_daily_rent, v.vehicle_number
       FROM public.drivers d LEFT JOIN public.vehicles v ON v.id = d.assigned_vehicle_id
       WHERE d.mobile_number = $1`, [phone]
    );
    const driver = result.rows[0];
    if (!driver || !driver.assigned_vehicle_id)
      return res.json({ dues: 0, daily_rent: 0, paid_today: 0, vehicle_number: null });

    const dailyRent = parseFloat(driver.vehicle_daily_rent || 0);
    const paid = await pool.query(
      `SELECT COALESCE(SUM(order_amount),0) as total FROM ms_orders
       WHERE payer_mobile=$1 AND transaction_status='SUCCESS' AND DATE(order_completion_date)=CURRENT_DATE`,
      [phone]
    );
    const paidToday = parseFloat(paid.rows[0].total);
    res.json({ dues: Math.max(0, dailyRent - paidToday), daily_rent: dailyRent, paid_today: paidToday, vehicle_number: driver.vehicle_number });
  } catch(err) { res.json({ dues: 0, daily_rent: 0, paid_today: 0 }); }
});

// Driver notifications
router.get('/notifications', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json([]);
    const result = await pool.query(
      `SELECT n.id, n.title, n.message, n.is_read, n.created_at, n.metadata
       FROM public.notifications n JOIN public.drivers d ON d.id = n.driver_id
       WHERE d.mobile_number = $1 AND n.user_type = 'DRIVER'
       ORDER BY n.created_at DESC LIMIT 50`, [phone]
    );
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

// Driver transactions
router.get('/transactions', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone required' });
    const result = await pool.query(
      `SELECT order_id, order_number, order_amount, order_initiation_date,
              order_completion_date, transaction_status, payment_mode, payer_name
       FROM ms_orders WHERE payer_mobile = $1 ORDER BY order_initiation_date DESC`,
      [phone]
    );
    res.json(result.rows.map(row => ({
      ...row, order_amount: parseFloat(row.order_amount)
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// SOS alert
router.post('/sos', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const driver = await pool.query(
      `SELECT d.id, d.full_name FROM public.drivers d WHERE d.mobile_number = $1`, [phone]
    );
    if (!driver.rows[0]) return res.status(404).json({ success: false });
    const d = driver.rows[0];

    await pool.query(
      `INSERT INTO public.sos_alerts (driver_id, driver_phone, message) VALUES ($1, $2, $3)`,
      [d.id, phone, message || 'SOS Alert!']
    );
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'OWNER', '🚨 SOS ALERT', $2, NOW())`,
      [d.id, `${d.full_name} ne SOS bheja: "${message || 'Emergency!'}" — Phone: ${phone}`]
    ).catch(() => {});
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'DRIVER', '🚨 SOS Sent', 'Aapka SOS owner ko bhej diya gaya hai.', NOW())`,
      [d.id]
    ).catch(() => {});

    res.json({ success: true });
  } catch(err) { res.status(500).json({ success: false }); }
});

// Activity ping (every 5 min)
router.post('/activity/ping', async (req, res) => {
  try {
    const { driverPhone } = req.body;
    const driverRes = await pool.query(
      `SELECT id FROM public.drivers WHERE mobile_number = $1`, [driverPhone]
    );
    if (!driverRes.rows[0]) return res.json({ success: false });
    const driverId = driverRes.rows[0].id;

    await pool.query(
      `INSERT INTO public.driver_activity (driver_id, activity_date, first_login, last_seen, total_active_minutes)
       VALUES ($1, CURRENT_DATE, NOW(), NOW(), 5)
       ON CONFLICT (driver_id, activity_date)
       DO UPDATE SET last_seen = NOW(), total_active_minutes = public.driver_activity.total_active_minutes + 5, updated_at = NOW()
       WHERE public.driver_activity.last_seen < NOW() - INTERVAL '6 minutes'`,
      [driverId]
    );
    res.json({ success: true });
  } catch (err) { res.json({ success: false }); }
});

// Login event
router.post('/activity/login', async (req, res) => {
  try {
    const { driverPhone } = req.body;
    const dr = await pool.query(
      `SELECT d.*, o.id as owner_db_id FROM public.drivers d
       LEFT JOIN public.owners o ON o.owner_code = d.owner_code
       WHERE d.mobile_number = $1`, [driverPhone]
    );
    if (!dr.rows[0]) return res.json({ success: false });
    const driver = dr.rows[0];

    const veh = await pool.query(`SELECT id FROM public.vehicles WHERE driver_id = $1`, [driver.id]);
    await pool.query(
      `INSERT INTO public.driver_daily_log (driver_id, log_date, login_time, vehicle_id)
       VALUES ($1, CURRENT_DATE, NOW(), $2) ON CONFLICT (driver_id, log_date) DO NOTHING`,
      [driver.id, veh.rows[0]?.id || null]
    );

    if (driver.owner_db_id) {
      const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      await pool.query(
        `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
         VALUES ($1, 'OWNER', $2, $3, NOW())`,
        [driver.owner_db_id, `🟢 ${driver.full_name} logged in`, `App open kiya at ${t}`]
      );
    }
    res.json({ success: true });
  } catch (err) { res.json({ success: false }); }
});

// Mark notifications read
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const { driverId } = req.query;
    if (driverId) {
      await pool.query('UPDATE public.notifications SET is_read = TRUE WHERE driver_id = $1', [driverId]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

module.exports = router;