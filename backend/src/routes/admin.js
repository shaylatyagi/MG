const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// ─── EXISTING ROUTES (unchanged) ─────────────────────────────────────────────
router.get('/tenants', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, company_name, company_code, company_status FROM auth.client_companies');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/register-company', async (req, res) => {
  const { companyName, legalName, gstNumber } = req.body;
  try {
    const code = companyName.slice(0,4).toUpperCase() + Math.floor(Math.random()*100);
    await pool.query(`INSERT INTO auth.client_companies (company_code,company_name,legal_name,gst_number) VALUES ($1,$2,$3,$4)`, [code, companyName, legalName, gstNumber]);
    res.status(201).json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/metrics', async (req, res) => {
  const { companyId, filter } = req.query;
  try {
    let tc = "order_initiation_date >= CURRENT_DATE - INTERVAL '7 days'";
    if (filter==='today')     tc = "DATE(order_initiation_date) = CURRENT_DATE";
    if (filter==='yesterday') tc = "DATE(order_initiation_date) = CURRENT_DATE - INTERVAL '1 day'";
    const { rows } = await pool.query(`SELECT COUNT(id) AS total_orders, COALESCE(SUM(order_amount),0) AS gross_revenue FROM ms_orders WHERE client_company_id=$1 AND ${tc}`, [companyId]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PLATFORM STATS ───────────────────────────────────────────────────────────
router.get('/platform-stats', async (req, res) => {
  try {
    const [c,o,d,v,col] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM public.companies WHERE status='Active'`),
      pool.query(`SELECT COUNT(*) FROM public.owners WHERE status='ACTIVE'`),
      pool.query(`SELECT COUNT(*) FROM public.drivers WHERE status='ACTIVE'`),
      pool.query(`SELECT COUNT(*) FROM public.vehicles`),
      pool.query(`SELECT
        COALESCE(SUM(CASE WHEN DATE(order_initiation_date)=CURRENT_DATE THEN order_amount END),0) as today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',order_initiation_date)=DATE_TRUNC('month',NOW()) THEN order_amount END),0) as this_month,
        COALESCE(SUM(order_amount),0) as all_time
        FROM public.ms_orders WHERE transaction_status='SUCCESS'`),
    ]);
    res.json({
      total_companies:  parseInt(c.rows[0].count),
      total_owners:     parseInt(o.rows[0].count),
      total_drivers:    parseInt(d.rows[0].count),
      total_vehicles:   parseInt(v.rows[0].count),
      collection_today: parseFloat(col.rows[0].today),
      collection_month: parseFloat(col.rows[0].this_month),
      collection_total: parseFloat(col.rows[0].all_time),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── COMPANIES LIST ───────────────────────────────────────────────────────────
router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        COUNT(DISTINCT o.id)::int  as owners,
        COUNT(DISTINCT d.id)::int  as drivers,
        COUNT(DISTINCT v.id)::int  as vehicles,
        COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0)          as collection_today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW()) THEN mo.order_amount END),0) as collection_month,
        COALESCE(SUM(mo.order_amount),0) as collection_total
      FROM public.companies c
      LEFT JOIN public.owners  o  ON o.company_id=c.id AND o.status='ACTIVE'
      LEFT JOIN public.drivers d  ON d.owner_code=o.owner_code
      LEFT JOIN public.vehicles v ON EXISTS(SELECT 1 FROM public.drivers dd WHERE dd.id=v.driver_id AND dd.owner_code=o.owner_code)
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile=d.mobile_number AND mo.transaction_status='SUCCESS'
      GROUP BY c.id ORDER BY c.created_at DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/companies', async (req, res) => {
  try {
    const { name, cin, city } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    // Insert first, then update code with the id
    const r = await pool.query(
      `INSERT INTO public.companies(name,cin,city) VALUES($1,$2,$3) RETURNING *`,
      [name, cin||null, city||null]
    );
    const co = r.rows[0];
    const code = name.replace(/[^a-zA-Z]/g,'').slice(0,4).toUpperCase() + co.id;
    await pool.query(`UPDATE public.companies SET company_code=$1 WHERE id=$2`, [code, co.id]);
    res.json({ success: true, company: { ...co, company_code: code } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── OWNERS BY COMPANY (full data) ────────────────────────────────────────────
router.get('/companies/:companyId/owners', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Step 1: Fetch owners — SELECT * to avoid missing column errors
    const ownersRes = await pool.query(`
      SELECT * FROM public.owners
      WHERE company_id = $1 OR company_id IS NULL
      ORDER BY full_name
    `, [companyId]);

    if (ownersRes.rows.length === 0) return res.json([]);

    // Step 2: Enrich each owner safely
    const enriched = await Promise.all(ownersRes.rows.map(async (o) => {
      const stats = { total_drivers: 0, total_vehicles: 0, assigned_vehicles: 0, collection_today: 0, collection_month: 0, collection_total: 0 };
      try {
        const dRes = await pool.query(
          `SELECT 
             COUNT(*)::int as total_drivers,
             COUNT(CASE WHEN d.id IN (SELECT driver_id FROM public.vehicles WHERE driver_id IS NOT NULL) THEN 1 END)::int as active_drivers
           FROM public.drivers d WHERE owner_code=$1`, [o.owner_code]
        );
        stats.total_drivers  = dRes.rows[0]?.total_drivers  || 0;
        stats.active_drivers = dRes.rows[0]?.active_drivers || 0;
      } catch(e) { console.error('driver count err:', e.message); }

      try {
        // Try owner_id first, fallback to joining through drivers
        const vRes = await pool.query(`
          SELECT COUNT(*)::int as total,
                 COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END)::int as assigned
          FROM public.vehicles
          WHERE owner_id = $1`, [o.id]
        ).catch(() => pool.query(`
          SELECT COUNT(DISTINCT v.id)::int as total,
                 COUNT(DISTINCT CASE WHEN v.driver_id IS NOT NULL THEN v.id END)::int as assigned
          FROM public.vehicles v
          JOIN public.drivers d ON d.id = v.driver_id
          WHERE d.owner_code = $1`, [o.owner_code]
        ));
        stats.total_vehicles   = vRes.rows[0]?.total    || 0;
        stats.assigned_vehicles = vRes.rows[0]?.assigned || 0;
      } catch(e) { console.error('vehicle count err:', e.message); }

      try {
        const cRes = await pool.query(`
          SELECT
            COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0)          as today,
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW()) THEN mo.order_amount END),0) as month,
            COALESCE(SUM(mo.order_amount),0) as total
          FROM public.ms_orders mo
          JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
          WHERE d.owner_code = $1 AND mo.transaction_status = 'SUCCESS'
        `, [o.owner_code]);
        stats.collection_today = parseFloat(cRes.rows[0]?.today || 0);
        stats.collection_month = parseFloat(cRes.rows[0]?.month || 0);
        stats.collection_total = parseFloat(cRes.rows[0]?.total || 0);
      } catch(e) { console.error('collection err:', e.message); }

      return { ...o, ...stats };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('OWNERS BY COMPANY ERROR:', err.message, err.stack);
    res.status(500).json({ error: err.message, hint: 'Check Render logs for SQL details' });
  }
});

// ─── OWNER FULL DETAIL ────────────────────────────────────────────────────────
router.get('/owners/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    const [ownerR, incentiveR, vehiclesR, recentR] = await Promise.all([
      pool.query(`
        SELECT o.*,
          COUNT(DISTINCT d.id)::int as total_drivers,
          COUNT(DISTINCT v.id)::int as total_vehicles,
          COUNT(DISTINCT CASE WHEN v.driver_id IS NOT NULL THEN v.id END)::int as assigned_vehicles,
          COALESCE(SUM(mo.order_amount),0) as collection_total,
          COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0) as collection_today,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW()) THEN mo.order_amount END),0) as collection_month
        FROM public.owners o
        LEFT JOIN public.drivers d ON d.owner_code=o.owner_code
        LEFT JOIN public.vehicles v ON v.driver_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.drivers dd WHERE dd.id=v.driver_id AND dd.owner_code=o.owner_code)
        LEFT JOIN public.ms_orders mo ON mo.payer_mobile=d.mobile_number AND mo.transaction_status='SUCCESS'
        WHERE o.id=$1 GROUP BY o.id`, [ownerId]),
      pool.query(`SELECT * FROM public.owner_incentive_rules WHERE owner_id=$1`, [ownerId]).catch(()=>({rows:[]})),
      pool.query(`
        SELECT
          v.*,
          d.driver_code, d.mobile_number as driver_mobile, d.created_at as driver_joined,
          dvh.assigned_at as assigned_since,
          CASE WHEN dvh.assigned_at IS NOT NULL
            THEN EXTRACT(DAY FROM NOW() - dvh.assigned_at)::int
            ELSE NULL END as days_assigned,
          CASE WHEN dvh.assigned_at IS NOT NULL
            THEN EXTRACT(DAY FROM NOW() - dvh.assigned_at)::int * COALESCE(v.daily_rent,0)
            ELSE NULL END as earned_from_driver,
          (SELECT COUNT(*)::int FROM public.driver_vehicle_history h WHERE h.vehicle_id=v.id) as total_assignments
        FROM public.vehicles v
        LEFT JOIN public.drivers d ON d.id=v.driver_id
        LEFT JOIN public.driver_vehicle_history dvh ON dvh.vehicle_id=v.id AND dvh.unassigned_at IS NULL
        WHERE (
          v.owner_id = $1
          OR EXISTS(
            SELECT 1 FROM public.drivers dx
            WHERE dx.id = v.driver_id
            AND dx.owner_code = (SELECT owner_code FROM public.owners WHERE id=$1)
          )
        )
        ORDER BY v.status DESC, v.vehicle_number
      `, [ownerId]),
      pool.query(`
        SELECT mo.order_amount, mo.order_completion_date, mo.transaction_status, d.full_name as driver_name
        FROM public.ms_orders mo
        JOIN public.drivers d ON d.mobile_number=mo.payer_mobile
        JOIN public.owners o ON o.owner_code=d.owner_code
        WHERE o.id=$1 AND mo.transaction_status='SUCCESS'
        ORDER BY mo.order_completion_date DESC LIMIT 10
      `, [ownerId]).catch(()=>({rows:[]})),
    ]);
    if (!ownerR.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json({
      owner:           ownerR.rows[0],
      incentive_rules: incentiveR.rows[0] || null,
      vehicles:        vehiclesR.rows,
      recent_payments: recentR.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DRIVERS BY OWNER (full data) ────────────────────────────────────────────
router.get('/owners/:ownerId/drivers', async (req, res) => {
  try {
    const ownerRes = await pool.query(`SELECT owner_code FROM public.owners WHERE id=$1`, [req.params.ownerId]);
    if (!ownerRes.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    const result = await pool.query(`
      SELECT
        d.id, d.full_name, d.mobile_number, d.driver_code, d.status,
        d.date_of_birth, d.driving_license_number, d.driving_license_expiry,
        d.wallet_balance, d.security_deposit, d.advance_balance,
        d.rent_type, d.rent_amount, d.created_at,
        v.vehicle_number, v.vehicle_model, v.daily_rent,
        dvh.assigned_at as vehicle_since,
        COALESCE(SUM(mo.order_amount),0)  as total_paid,
        COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0) as paid_today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW()) THEN mo.order_amount END),0) as paid_month,
        COUNT(DISTINCT mo.id)::int         as total_transactions,
        MAX(mo.order_completion_date)      as last_payment_date,
        COALESCE(SUM(dlog.active_minutes),0)::int  as total_active_minutes,
        COUNT(DISTINCT dlog.log_date)::int          as total_active_days
      FROM public.drivers d
      LEFT JOIN public.vehicles v ON v.driver_id=d.id
      LEFT JOIN public.driver_vehicle_history dvh ON dvh.driver_id=d.id AND dvh.unassigned_at IS NULL
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile=d.mobile_number AND mo.transaction_status='SUCCESS'
      LEFT JOIN public.driver_daily_log dlog ON dlog.driver_id=d.id
      WHERE d.owner_code=$1
      GROUP BY d.id,v.vehicle_number,v.vehicle_model,v.daily_rent,dvh.assigned_at
      ORDER BY d.full_name`, [ownerRes.rows[0].owner_code]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DRIVER FULL DETAIL ───────────────────────────────────────────────────────
router.get('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const [driverR, historyR, logsR, txR, notifR] = await Promise.all([
      pool.query(`
        SELECT
          d.id, d.full_name, d.mobile_number, d.driver_code, d.status,
          d.date_of_birth, d.driving_license_number, d.driving_license_expiry,
          d.wallet_balance, d.security_deposit, d.advance_balance,
          d.rent_type, d.rent_amount, d.created_at, d.owner_code,
          d.incentive_rule_index,
          o.id           as owner_id,
          o.full_name    as owner_name,
          o.mobile_number as owner_phone,
          NULL::text as owner_business,
          v.vehicle_number, v.vehicle_model, v.daily_rent,
          v.rent_type    as v_rent_type, v.insurance_expiry, v.fitness_expiry,
          dvh.assigned_at as vehicle_since,
          COALESCE(SUM(mo.order_amount),0)   as total_paid,
          COUNT(DISTINCT mo.id)::int          as total_transactions,
          MAX(mo.order_completion_date)       as last_payment_date,
          COALESCE(SUM(CASE WHEN DATE(mo.order_completion_date)=CURRENT_DATE
                       THEN mo.order_amount END),0) as paid_today,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_completion_date)=DATE_TRUNC('month',NOW())
                       THEN mo.order_amount END),0) as paid_month
        FROM public.drivers d
        LEFT JOIN public.owners  o   ON o.owner_code  = d.owner_code
        LEFT JOIN public.vehicles v  ON v.driver_id   = d.id
        LEFT JOIN public.driver_vehicle_history dvh
               ON dvh.driver_id = d.id AND dvh.unassigned_at IS NULL
        LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number
               AND mo.transaction_status = 'SUCCESS'
        WHERE d.id = $1
        GROUP BY d.id, o.id, o.full_name, o.mobile_number,
                 v.vehicle_number, v.vehicle_model, v.daily_rent,
                 v.rent_type, v.insurance_expiry, v.fitness_expiry, dvh.assigned_at
      `, [driverId]),
      pool.query(`
        SELECT
          dvh.id, dvh.assigned_at, dvh.unassigned_at, dvh.daily_rent,
          dvh.rent_type, dvh.reason,
          v.vehicle_number, v.vehicle_model,
          ROUND(EXTRACT(EPOCH FROM COALESCE(dvh.unassigned_at,NOW()) - dvh.assigned_at)/3600)::int as hours_held,
          EXTRACT(DAY FROM COALESCE(dvh.unassigned_at,NOW()) - dvh.assigned_at)::int as total_days,
          EXTRACT(DAY FROM COALESCE(dvh.unassigned_at,NOW()) - dvh.assigned_at)::int
            * COALESCE(dvh.daily_rent,0) as total_earned
        FROM public.driver_vehicle_history dvh
        JOIN public.vehicles v ON v.id = dvh.vehicle_id
        WHERE dvh.driver_id = $1
        ORDER BY dvh.assigned_at DESC
      `, [driverId]),
      pool.query(`
        SELECT * FROM public.driver_daily_log
        WHERE driver_id = $1 ORDER BY log_date DESC LIMIT 30
      `, [driverId]),
      pool.query(`
        SELECT order_id, order_amount, order_completion_date,
               order_initiation_date, transaction_status
        FROM public.ms_orders
        WHERE payer_mobile = (SELECT mobile_number FROM public.drivers WHERE id=$1)
        ORDER BY order_initiation_date DESC LIMIT 30
      `, [driverId]),
      pool.query(`
        SELECT title, message, is_read, created_at
        FROM public.notifications
        WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 10
      `, [driverId]).catch(()=>({ rows:[] })),
    ]);
    if (!driverR.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    res.json({
      driver:          driverR.rows[0],
      vehicle_history: historyR.rows,
      daily_logs:      logsR.rows,
      transactions:    txR.rows,
      notifications:   notifR.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign owner to company
router.post('/owners/:ownerId/assign-company', async (req, res) => {
  try {
    await pool.query(`UPDATE public.owners SET company_id=$1 WHERE id=$2`, [req.body.companyId, req.params.ownerId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;