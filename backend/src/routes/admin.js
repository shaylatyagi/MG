const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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
    await pool.query(
      `INSERT INTO auth.client_companies (company_code, company_name, legal_name, gst_number) VALUES ($1,$2,$3,$4) RETURNING id`,
      [code, companyName, legalName, gstNumber]
    );
    res.status(201).json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/metrics', async (req, res) => {
  const { companyId, filter } = req.query;
  try {
    let timeCondition = "order_initiation_date >= CURRENT_DATE - INTERVAL '7 days'";
    if (filter === 'today')     timeCondition = "DATE(order_initiation_date) = CURRENT_DATE";
    if (filter === 'yesterday') timeCondition = "DATE(order_initiation_date) = CURRENT_DATE - INTERVAL '1 day'";
    const { rows } = await pool.query(
      `SELECT COUNT(id) AS total_orders, COALESCE(SUM(order_amount),0) AS gross_revenue
       FROM ms_orders WHERE client_company_id=$1 AND ${timeCondition}`,
      [companyId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── NEW ROUTES (hierarchy drill-down) ───────────────────────────────────────

// Platform overview stats
router.get('/platform-stats', async (req, res) => {
  try {
    const [companiesR, ownersR, driversR, vehiclesR, collectionR] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM public.companies WHERE status='Active'`),
      pool.query(`SELECT COUNT(*) FROM public.owners WHERE status='ACTIVE'`),
      pool.query(`SELECT COUNT(*) FROM public.drivers WHERE status='ACTIVE'`),
      pool.query(`SELECT COUNT(*) FROM public.vehicles`),
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN DATE(order_completion_date)=CURRENT_DATE THEN order_amount END),0) as today,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month',order_completion_date)=DATE_TRUNC('month',NOW()) THEN order_amount END),0) as this_month
        FROM public.ms_orders WHERE transaction_status='SUCCESS'
      `),
    ]);
    res.json({
      total_companies: parseInt(companiesR.rows[0].count),
      total_owners:    parseInt(ownersR.rows[0].count),
      total_drivers:   parseInt(driversR.rows[0].count),
      total_vehicles:  parseInt(vehiclesR.rows[0].count),
      collection_today: parseFloat(collectionR.rows[0].today),
      collection_month: parseFloat(collectionR.rows[0].this_month),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// All companies with stats
router.get('/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        COUNT(DISTINCT o.id)::int          as owners,
        COUNT(DISTINCT d.id)::int          as drivers,
        COUNT(DISTINCT v.id)::int          as vehicles,
        COALESCE(SUM(CASE WHEN DATE(mo.order_completion_date)=CURRENT_DATE
                     THEN mo.order_amount END),0) as collection_today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_completion_date)=DATE_TRUNC('month',NOW())
                     THEN mo.order_amount END),0) as collection_month
      FROM public.companies c
      LEFT JOIN public.owners  o  ON o.company_id = c.id AND o.status='ACTIVE'
      LEFT JOIN public.drivers d  ON d.owner_code = o.owner_code AND d.status='ACTIVE'
      LEFT JOIN public.vehicles v ON v.owner_id   = o.id
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add company
router.post('/companies', async (req, res) => {
  try {
    const { name, cin, city } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query(
      `INSERT INTO public.companies (name, cin, city) VALUES ($1,$2,$3) RETURNING *`,
      [name, cin || null, city || null]
    );
    res.json({ success: true, company: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Owners by company (with stats)
router.get('/companies/:companyId/owners', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id, o.full_name, o.mobile_number, o.owner_code,
        o.business_name, o.status,
        COUNT(DISTINCT d.id)::int  as total_drivers,
        COUNT(DISTINCT v.id)::int  as total_vehicles,
        COALESCE(SUM(CASE WHEN DATE(mo.order_completion_date)=CURRENT_DATE
                     THEN mo.order_amount END),0) as collection_today,
        COALESCE(SUM(mo.order_amount),0)           as collection_total
      FROM public.owners o
      LEFT JOIN public.drivers   d  ON d.owner_code = o.owner_code AND d.status='ACTIVE'
      LEFT JOIN public.vehicles  v  ON v.owner_id   = o.id
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
      WHERE o.company_id = $1 AND o.status='ACTIVE'
      GROUP BY o.id
      ORDER BY collection_today DESC
    `, [req.params.companyId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Drivers by owner (with stats)
router.get('/owners/:ownerId/drivers', async (req, res) => {
  try {
    const ownerRes = await pool.query(`SELECT owner_code FROM public.owners WHERE id=$1`, [req.params.ownerId]);
    if (!ownerRes.rows[0]) return res.status(404).json({ error: 'Owner not found' });

    const result = await pool.query(`
      SELECT
        d.id, d.full_name, d.mobile_number, d.driver_code,
        d.wallet_balance, d.status,
        v.vehicle_number, v.vehicle_model, v.daily_rent,
        COALESCE(SUM(mo.order_amount),0)  as total_paid,
        COALESCE(SUM(CASE WHEN DATE(mo.order_completion_date)=CURRENT_DATE
                     THEN mo.order_amount END),0) as paid_today
      FROM public.drivers d
      LEFT JOIN public.vehicles  v  ON v.driver_id   = d.id
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
      WHERE d.owner_code = $1
      GROUP BY d.id, v.vehicle_number, v.vehicle_model, v.daily_rent
      ORDER BY d.full_name
    `, [ownerRes.rows[0].owner_code]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Driver full detail
router.get('/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const [driverR, historyR, logsR, docsR] = await Promise.all([
      pool.query(`
        SELECT d.*,
          v.vehicle_number, v.vehicle_model, v.daily_rent,
          COALESCE(SUM(mo.order_amount),0) as total_paid
        FROM public.drivers d
        LEFT JOIN public.vehicles  v  ON v.driver_id   = d.id
        LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
        WHERE d.id=$1
        GROUP BY d.id, v.vehicle_number, v.vehicle_model, v.daily_rent
      `, [driverId]),
      pool.query(`
        SELECT dvh.*,
          v.vehicle_number, v.vehicle_model,
          EXTRACT(DAY FROM COALESCE(dvh.unassigned_at,NOW()) - dvh.assigned_at)::int as total_days
        FROM public.driver_vehicle_history dvh
        JOIN public.vehicles v ON v.id = dvh.vehicle_id
        WHERE dvh.driver_id=$1
        ORDER BY dvh.assigned_at DESC LIMIT 10
      `, [driverId]),
      pool.query(`
        SELECT * FROM public.driver_daily_log
        WHERE driver_id=$1
        ORDER BY log_date DESC LIMIT 30
      `, [driverId]),
      pool.query(`
        SELECT * FROM public.user_documents
        WHERE user_id=$1 AND user_type='DRIVER'
      `, [driverId]).catch(() => ({ rows: [] })),
    ]);
    if (!driverR.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    res.json({
      driver:          driverR.rows[0],
      vehicle_history: historyR.rows,
      daily_logs:      logsR.rows,
      documents:       docsR.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Owner full detail
router.get('/owners/:ownerId', async (req, res) => {
  try {
    const [ownerR, docsR] = await Promise.all([
      pool.query(`
        SELECT o.*,
          COUNT(DISTINCT d.id)::int  as total_drivers,
          COUNT(DISTINCT v.id)::int  as total_vehicles,
          COALESCE(SUM(mo.order_amount),0) as total_collection
        FROM public.owners o
        LEFT JOIN public.drivers   d  ON d.owner_code  = o.owner_code AND d.status='ACTIVE'
        LEFT JOIN public.vehicles  v  ON v.owner_id    = o.id
        LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
        WHERE o.id=$1
        GROUP BY o.id
      `, [req.params.ownerId]),
      pool.query(`SELECT * FROM public.user_documents WHERE user_id=$1 AND user_type='OWNER'`,
        [req.params.ownerId]).catch(() => ({ rows: [] })),
    ]);
    if (!ownerR.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json({ owner: ownerR.rows[0], documents: docsR.rows });
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