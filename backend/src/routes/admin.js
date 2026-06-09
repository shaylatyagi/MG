const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const pool    = require('../config/db');
const { logAudit } = require('../utils/audit');
const notify  = require('../services/notify');

// multer — memory storage for admin uploads (S3 not wired yet)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
    // Each query isolated — one missing table won't crash the whole endpoint
    const safe = async (q, params = []) => {
      try { return await pool.query(q, params); }
      catch (_) { return { rows: [{ count: '0', today: '0', this_month: '0', all_time: '0' }] }; }
    };

    const [c, o, d, v, col] = await Promise.all([
      safe(`SELECT COUNT(*) FROM public.companies WHERE status='ACTIVE'`),
      safe(`SELECT COUNT(*) FROM public.owners WHERE status='ACTIVE'`),
      safe(`SELECT COUNT(*) FROM public.drivers WHERE status='ACTIVE'`),
      safe(`SELECT COUNT(*) FROM public.vehicles`),
      safe(`SELECT
        COALESCE(SUM(CASE WHEN DATE(order_initiation_date)=CURRENT_DATE THEN order_amount END),0) as today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',order_initiation_date)=DATE_TRUNC('month',NOW()) THEN order_amount END),0) as this_month,
        COALESCE(SUM(order_amount),0) as all_time
        FROM public.ms_orders WHERE transaction_status='SUCCESS'`),
    ]);
    res.json({
      total_companies:  parseInt(c.rows[0].count  || 0),
      total_owners:     parseInt(o.rows[0].count  || 0),
      total_drivers:    parseInt(d.rows[0].count  || 0),
      total_vehicles:   parseInt(v.rows[0].count  || 0),
      collection_today: parseFloat(col.rows[0].today       || 0),
      collection_month: parseFloat(col.rows[0].this_month  || 0),
      collection_total: parseFloat(col.rows[0].all_time    || 0),
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
        (SELECT COALESCE(SUM(mo2.order_amount),0)
         FROM public.ms_orders mo2
         WHERE mo2.payer_mobile IN (
           SELECT d2.mobile_number FROM public.drivers d2
           JOIN public.owners o2 ON o2.owner_code=d2.owner_code
           WHERE o2.company_id=c.id OR o2.company_id IS NULL
         ) AND mo2.transaction_status='SUCCESS'
           AND DATE(mo2.order_initiation_date)=CURRENT_DATE
        ) as collection_today,
        (SELECT COALESCE(SUM(mo2.order_amount),0)
         FROM public.ms_orders mo2
         WHERE mo2.payer_mobile IN (
           SELECT d2.mobile_number FROM public.drivers d2
           JOIN public.owners o2 ON o2.owner_code=d2.owner_code
           WHERE o2.company_id=c.id OR o2.company_id IS NULL
         ) AND mo2.transaction_status='SUCCESS'
           AND DATE_TRUNC('month',mo2.order_initiation_date)=DATE_TRUNC('month',NOW())
        ) as collection_month,
        (SELECT COALESCE(SUM(mo2.order_amount),0)
         FROM public.ms_orders mo2
         WHERE mo2.payer_mobile IN (
           SELECT d2.mobile_number FROM public.drivers d2
           JOIN public.owners o2 ON o2.owner_code=d2.owner_code
           WHERE o2.company_id=c.id OR o2.company_id IS NULL
         ) AND mo2.transaction_status='SUCCESS'
        ) as collection_total
      FROM public.companies c
      LEFT JOIN public.owners  o  ON o.company_id=c.id AND o.status='ACTIVE'
      LEFT JOIN public.drivers d  ON d.owner_code=o.owner_code
      LEFT JOIN public.vehicles v ON (
        v.owner_id = o.id
        OR EXISTS(SELECT 1 FROM public.drivers dd WHERE dd.id=v.driver_id AND dd.owner_code=o.owner_code)
      )
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
          WHERE owner_id = $1 OR EXISTS(
            SELECT 1 FROM public.drivers dx
            WHERE dx.id = vehicles.driver_id AND dx.owner_code = $2
          )`, [o.id, o.owner_code]
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
            COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0) as today,
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW()) THEN mo.order_amount END),0) as month,
            COALESCE(SUM(mo.order_amount),0) as total
          FROM public.ms_orders mo
          WHERE mo.payer_mobile IN (
            SELECT mobile_number FROM public.drivers WHERE owner_code = $1
          ) AND mo.transaction_status = 'SUCCESS'
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
          (SELECT COUNT(*)::int FROM public.drivers d WHERE d.owner_code=o.owner_code) as total_drivers,
          (SELECT COUNT(*)::int FROM public.drivers d WHERE d.owner_code=o.owner_code
           AND EXISTS(SELECT 1 FROM public.vehicles v WHERE v.driver_id=d.id)) as active_drivers,
          (SELECT COUNT(*)::int FROM public.vehicles v
           WHERE v.owner_id=o.id
             OR EXISTS(SELECT 1 FROM public.drivers dx WHERE dx.id=v.driver_id AND dx.owner_code=o.owner_code)
          ) as total_vehicles,
          (SELECT COUNT(*)::int FROM public.vehicles v
           WHERE v.driver_id IS NOT NULL
             AND (v.owner_id=o.id OR EXISTS(SELECT 1 FROM public.drivers dx WHERE dx.id=v.driver_id AND dx.owner_code=o.owner_code))
          ) as assigned_vehicles,
          (SELECT COALESCE(SUM(mo.order_amount),0) FROM public.ms_orders mo
           WHERE mo.payer_mobile IN (SELECT mobile_number FROM public.drivers WHERE owner_code=o.owner_code)
           AND mo.transaction_status='SUCCESS'
          ) as collection_total,
          (SELECT COALESCE(SUM(mo.order_amount),0) FROM public.ms_orders mo
           WHERE mo.payer_mobile IN (SELECT mobile_number FROM public.drivers WHERE owner_code=o.owner_code)
           AND mo.transaction_status='SUCCESS'
           AND DATE(mo.order_initiation_date)=CURRENT_DATE
          ) as collection_today,
          (SELECT COALESCE(SUM(mo.order_amount),0) FROM public.ms_orders mo
           WHERE mo.payer_mobile IN (SELECT mobile_number FROM public.drivers WHERE owner_code=o.owner_code)
           AND mo.transaction_status='SUCCESS'
           AND DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW())
          ) as collection_month
        FROM public.owners o
        WHERE o.id=$1`, [ownerId]),
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
          COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE
                       THEN mo.order_amount END),0) as paid_today,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW())
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

// ─── DEBUG: Check ms_orders columns ──────────────────────────────────────────
router.get('/debug/transactions', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM public.ms_orders ORDER BY id DESC LIMIT 3`);
    res.json({ 
      count: r.rows.length, 
      columns: r.rows[0] ? Object.keys(r.rows[0]) : [],
      sample: r.rows[0] || null 
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TRANSACTIONS (PayYantra style filtered view) ─────────────────────────────
router.get('/transactions', async (req, res) => {
  try {
    const { search, status, mode, dateFrom, dateTo } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (dateFrom) {
      conditions.push(`DATE(mo.order_initiation_date) >= $${i}`); 
      params.push(dateFrom); i++;
    }
    if (dateTo) {
      conditions.push(`DATE(mo.order_initiation_date) <= $${i}`); 
      params.push(dateTo); i++;
    }
    if (status && status !== 'ALL') {
      conditions.push(`mo.transaction_status = $${i}`); params.push(status); i++;
    }
    if (mode && mode !== 'ALL') {
      conditions.push(`mo.payment_mode = $${i}`); params.push(mode); i++;
    }
    if (search) {
      conditions.push(`(
        COALESCE(mo.pg_transaction_id,'') ILIKE $${i} OR
        COALESCE(mo.order_id::text,'') ILIKE $${i} OR
        COALESCE(mo.payer_mobile,'') ILIKE $${i}
      )`);
      params.push(`%${search}%`); i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        mo.*,
        d.full_name  as driver_name,
        d.driver_code,
        o.full_name  as owner_name,
        o.owner_code
      FROM public.ms_orders mo
      LEFT JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
      LEFT JOIN public.owners  o ON o.owner_code    = d.owner_code
      ${where}
      ORDER BY mo.order_initiation_date DESC
      LIMIT 500
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Transactions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Assign owner to company
router.post('/owners/:ownerId/assign-company', async (req, res) => {
  try {
    await pool.query(`UPDATE public.owners SET company_id=$1 WHERE id=$2`, [req.body.companyId, req.params.ownerId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── COMPANY STATUS TOGGLE ────────────────────────────────────────────────────
router.patch('/companies/:id/name', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const result = await pool.query(
      `UPDATE public.companies SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [name.trim(), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Company not found' });
    logAudit('COMPANY_RENAMED', 'company', req.params.id, 'admin', { new_name: name.trim() });
    res.json({ success: true, company: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/owners/:id/phone', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone?.trim() || !/^\d{10}$/.test(phone.trim()))
      return res.status(400).json({ error: 'Valid 10-digit phone required' });
    const result = await pool.query(
      `UPDATE public.owners SET mobile_number=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [phone.trim(), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    logAudit('OWNER_PHONE_CHANGED', 'owner', req.params.id, 'admin', { new_phone: phone.trim() });
    res.json({ success: true, owner: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Phone already in use by another owner' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/companies/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'status must be Active or Inactive' });
    }
    const r = await pool.query(
      `UPDATE public.companies SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Company not found' });
    // ADM-06: Audit log
    logAudit('COMPANY_STATUS_CHANGED', 'company', req.params.id, req.headers['x-admin-phone'] || 'admin', { new_status: status });
    res.json({ success: true, company: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── KYC MANAGEMENT ───────────────────────────────────────────────────────────

// GET /api/admin/kyc/summary — counts by status
router.get('/kyc/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(kyc_status, 'NOT_STARTED') as status, COUNT(*)::int as count
      FROM public.drivers GROUP BY kyc_status ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/kyc/pending — drivers awaiting review
router.get('/kyc/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id, d.full_name, d.mobile_number, d.driver_code, d.created_at,
        d.kyc_status, d.aadhaar_number, d.pan_number,
        d.driving_license_number, d.driving_license_expiry,
        d.kyc_rejection_reason,
        o.full_name  AS owner_name,
        o.owner_code,
        c.name       AS company_name
      FROM public.drivers d
      LEFT JOIN public.owners   o ON o.owner_code = d.owner_code
      LEFT JOIN public.companies c ON c.id = o.company_id
      WHERE d.kyc_status IS NULL
         OR d.kyc_status IN ('PENDING', 'SUBMITTED', 'UNDER_REVIEW')
      ORDER BY d.created_at ASC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/kyc/:driverId/approve
router.patch('/kyc/:driverId/approve', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE public.drivers
       SET kyc_status='VERIFIED', kyc_approved_at=NOW(), kyc_rejection_reason=NULL, updated_at=NOW()
       WHERE id=$1 RETURNING id, full_name, kyc_status`,
      [req.params.driverId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    await pool.query(
      `UPDATE public.driver_documents SET status='APPROVED', reviewed_at=NOW()
       WHERE driver_id=$1 AND status IN ('PENDING','SUBMITTED','UNDER_REVIEW')`,
      [req.params.driverId]
    ).catch(() => {});
    // KYC-07: Notify driver (in-app + WhatsApp)
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'DRIVER', '✅ KYC Approved', 'Your documents have been verified. You can now be assigned a vehicle.', NOW())`,
      [req.params.driverId]
    ).catch(() => {});
    // WhatsApp notification
    pool.query('SELECT COALESCE(phone_number, mobile_number) AS phone FROM drivers WHERE id = $1', [req.params.driverId])
      .then(pr => { if (pr.rows[0]?.phone) notify.send(pr.rows[0].phone, `✅ MobilityGrid: Your KYC documents have been verified, ${r.rows[0]?.full_name || ''}. You can now be assigned a vehicle.`); })
      .catch(() => {});
    // ADM-06: Audit log
    logAudit('KYC_APPROVED', 'driver', req.params.driverId, req.headers['x-admin-phone'] || 'admin', { driver_name: r.rows[0]?.full_name });
    res.json({ success: true, driver: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/kyc/:driverId/reject
// Body: { reason }
router.patch('/kyc/:driverId/reject', async (req, res) => {
  try {
    const reason = req.body.reason || 'Documents not acceptable';
    const r = await pool.query(
      `UPDATE public.drivers
       SET kyc_status='REJECTED', kyc_rejection_reason=$2, kyc_approved_at=NULL, updated_at=NOW()
       WHERE id=$1 RETURNING id, full_name, kyc_status`,
      [req.params.driverId, reason]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Driver not found' });
    await pool.query(
      `UPDATE public.driver_documents SET status='REJECTED', review_notes=$2, reviewed_at=NOW()
       WHERE driver_id=$1 AND status IN ('PENDING','SUBMITTED','UNDER_REVIEW')`,
      [req.params.driverId, reason]
    ).catch(() => {});
    // KYC-07: Notify driver (in-app + WhatsApp)
    await pool.query(
      `INSERT INTO public.notifications (driver_id, user_type, title, message, created_at)
       VALUES ($1, 'DRIVER', '❌ KYC Rejected', $2, NOW())`,
      [req.params.driverId, `Your KYC was rejected: ${reason}. Please re-upload correct documents.`]
    ).catch(() => {});
    // WhatsApp notification
    pool.query('SELECT COALESCE(phone_number, mobile_number) AS phone FROM drivers WHERE id = $1', [req.params.driverId])
      .then(pr => { if (pr.rows[0]?.phone) notify.send(pr.rows[0].phone, `❌ MobilityGrid: Your KYC was rejected. Reason: ${reason}. Please re-upload correct documents on the app.`); })
      .catch(() => {});
    // ADM-06: Audit log
    logAudit('KYC_REJECTED', 'driver', req.params.driverId, req.headers['x-admin-phone'] || 'admin', { driver_name: r.rows[0]?.full_name, reason });
    res.json({ success: true, driver: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/kyc/all — all drivers with any KYC info (for full KYC view)
router.get('/kyc/all', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status && status !== 'ALL'
      ? `WHERE d.kyc_status = $1`
      : `WHERE 1=1`;
    const params = status && status !== 'ALL' ? [status] : [];
    const result = await pool.query(`
      SELECT
        d.id, d.full_name, d.mobile_number, d.driver_code, d.created_at,
        d.kyc_status, d.driving_license_number, d.driving_license_expiry,
        d.kyc_rejection_reason, d.kyc_approved_at,
        o.full_name  AS owner_name,
        c.name       AS company_name
      FROM public.drivers d
      LEFT JOIN public.owners   o ON o.owner_code = d.owner_code
      LEFT JOIN public.companies c ON c.id = o.company_id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT 500
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADM-06: GET audit log — most recent 200 entries (filterable by action/entity_type)
router.get('/audit-log', async (req, res) => {
  try {
    const { action, entity_type, limit = 100 } = req.query;
    const conditions = [];
    const params = [];
    if (action)      { params.push(action);      conditions.push(`action = $${params.length}`); }
    if (entity_type) { params.push(entity_type); conditions.push(`entity_type = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Math.min(200, parseInt(limit, 10) || 100));

    const result = await pool.query(
      `SELECT id, action, entity_type, entity_id, performed_by, details, created_at
       FROM public.admin_audit_log
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── VEHICLE DETAIL ──────────────────────────────────────────────────────────
router.get('/vehicles/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const [vRes, histRes] = await Promise.all([
      pool.query(`
        SELECT v.id, v.vehicle_number, v.vehicle_model, v.daily_rent, v.owner_id, v.driver_id,
               v.status, v.vehicle_type, v.insurance_expiry, v.fitness_expiry, v.chassis_number, v.created_at,
               d.id AS driver_id, d.full_name AS driver_name,
               d.mobile_number AS driver_phone, d.driver_code, d.kyc_status AS driver_kyc,
               o.id AS owner_id, o.full_name AS owner_name, o.mobile_number AS owner_phone, o.owner_code,
               c.name AS company_name,
               (SELECT assigned_at FROM public.driver_vehicle_history
                WHERE vehicle_id=v.id AND unassigned_at IS NULL
                ORDER BY assigned_at DESC LIMIT 1) AS current_since,
               COALESCE(SUM(mo.order_amount),0)::float AS total_collected,
               COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0)::float AS collected_today,
               COALESCE(SUM(CASE WHEN DATE_TRUNC('month',mo.order_initiation_date)=DATE_TRUNC('month',NOW()) THEN mo.order_amount END),0)::float AS collected_month
        FROM public.vehicles v
        LEFT JOIN public.drivers d ON d.id = v.driver_id
        LEFT JOIN public.owners o ON o.owner_code = d.owner_code
        LEFT JOIN public.companies c ON c.id = o.company_id
        LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
        WHERE v.id = $1
        GROUP BY v.id, v.vehicle_number, v.vehicle_model, v.daily_rent, v.owner_id, v.driver_id,
                 v.status, v.vehicle_type, v.insurance_expiry, v.fitness_expiry, v.chassis_number, v.created_at,
                 d.id, d.full_name, d.mobile_number, d.driver_code, d.kyc_status,
                 o.id, o.full_name, o.mobile_number, o.owner_code, c.name
      `, [vehicleId]),
      pool.query(`
        SELECT dvh.id, dvh.assigned_at, dvh.unassigned_at, dvh.daily_rent, dvh.rent_type, dvh.reason,
               d.full_name AS driver_name, d.mobile_number AS driver_phone,
               EXTRACT(DAY FROM COALESCE(dvh.unassigned_at,NOW()) - dvh.assigned_at)::int AS total_days,
               EXTRACT(DAY FROM COALESCE(dvh.unassigned_at,NOW()) - dvh.assigned_at)::int
                 * COALESCE(dvh.daily_rent,0) AS total_earned
        FROM public.driver_vehicle_history dvh
        JOIN public.drivers d ON d.id = dvh.driver_id
        WHERE dvh.vehicle_id = $1
        ORDER BY dvh.assigned_at DESC
      `, [vehicleId]),
    ]);
    if (!vRes.rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ vehicle: vRes.rows[0], history: histRes.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USER DOCUMENTS ───────────────────────────────────────────────────────────

// GET all docs for a user (admin view)
router.get('/user-docs/:userType/:userId', async (req, res) => {
  try {
    const { userType, userId } = req.params;
    const result = await pool.query(
      `SELECT id, doc_type, original_name, s3_key, file_size, mime_type, status, review_notes, uploaded_at
       FROM public.user_documents WHERE user_id=$1 AND user_type=$2 ORDER BY uploaded_at DESC`,
      [userId, userType.toUpperCase()]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all docs for a company — returns docs for all owners+drivers in that company
router.get('/companies/:companyId/docs', async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await pool.query(
      `SELECT ud.id, ud.user_id, ud.user_type, ud.doc_type,
              ud.original_name, ud.file_size, ud.mime_type,
              ud.status, ud.review_notes, ud.uploaded_at,
              COALESCE(o.full_name, d.full_name) AS user_name
       FROM public.user_documents ud
       LEFT JOIN public.owners  o ON o.id  = ud.user_id AND ud.user_type = 'OWNER'
       LEFT JOIN public.drivers d ON d.id  = ud.user_id AND ud.user_type = 'DRIVER'
       WHERE o.company_id = $1 OR d.owner_code IN (
         SELECT owner_code FROM public.owners WHERE company_id = $1
       )
       ORDER BY ud.uploaded_at DESC`,
      [parseInt(companyId)]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST upload doc on behalf of user (admin upload)
// Must be registered BEFORE /:docId/status to avoid route collision
router.post('/user-docs/upload', upload.single('file'), async (req, res) => {
  try {
    const { user_type, user_id, doc_type } = req.body;
    const file = req.file;
    if (!file)     return res.status(400).json({ error: 'No file uploaded' });
    if (!user_type || !user_id || !doc_type) return res.status(400).json({ error: 'user_type, user_id, doc_type required' });

    const uType  = user_type.toUpperCase();
    const uId    = parseInt(user_id, 10);
    const s3Key  = `admin-upload/${uType.toLowerCase()}s/${uId}/${doc_type}_${Date.now()}_${file.originalname}`;

    await pool.query(
      `INSERT INTO public.user_documents
         (user_id, user_type, doc_type, original_name, s3_key, file_size, mime_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'UPLOADED')
       ON CONFLICT (user_id, user_type, doc_type)
       DO UPDATE SET
         original_name = EXCLUDED.original_name,
         s3_key        = EXCLUDED.s3_key,
         file_size     = EXCLUDED.file_size,
         mime_type     = EXCLUDED.mime_type,
         status        = 'UPLOADED',
         uploaded_at   = NOW()`,
      [uId, uType, doc_type, file.originalname, s3Key, file.size, file.mimetype]
    );

    logAudit('ADMIN_DOC_UPLOADED', uType.toLowerCase(), uId, 'admin', { doc_type, original_name: file.originalname });
    res.json({ success: true, message: 'Document uploaded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH approve / reject a document
router.patch('/user-docs/:docId/status', async (req, res) => {
  try {
    const { docId } = req.params;
    const { status, reason } = req.body;
    const allowed = ['APPROVED', 'REJECTED', 'UNDER_REVIEW'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'status must be APPROVED, REJECTED, or UNDER_REVIEW' });

    const result = await pool.query(
      `UPDATE public.user_documents
       SET status=$1, review_notes=$2
       WHERE id=$3 RETURNING *`,
      [status, reason || null, docId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Document not found' });

    logAudit(`DOC_${status}`, 'document', docId, 'admin', { reason });
    res.json({ success: true, doc: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ALL DRIVERS (cross-owner) ---

router.get('/all-drivers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.full_name, d.mobile_number, d.driver_code, d.kyc_status, d.status, d.created_at,
             o.full_name AS owner_name, o.mobile_number AS owner_phone, o.owner_code,
             c.name AS company_name,
             v.vehicle_number, v.vehicle_model, v.vehicle_type,
             COALESCE(SUM(mo.order_amount),0)::float AS total_collected,
             COALESCE(SUM(CASE WHEN DATE(mo.order_initiation_date)=CURRENT_DATE THEN mo.order_amount END),0)::float AS collected_today
      FROM public.drivers d
      LEFT JOIN public.owners o ON o.owner_code = d.owner_code
      LEFT JOIN public.companies c ON c.id = o.company_id
      LEFT JOIN public.vehicles v ON v.driver_id = d.id AND v.status = 'ACTIVE'
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
      GROUP BY d.id, d.full_name, d.mobile_number, d.driver_code, d.kyc_status, d.status, d.created_at,
               o.full_name, o.mobile_number, o.owner_code, c.name,
               v.vehicle_number, v.vehicle_model, v.vehicle_type
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CHAT VIEWER ---

router.get('/chat/threads', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (cm.driver_id, cm.owner_id)
             cm.driver_id, cm.owner_id,
             d.full_name AS driver_name, d.mobile_number AS driver_phone, d.driver_code,
             o.full_name AS owner_name, o.mobile_number AS owner_phone,
             c.name AS company_name,
             cm.message AS last_message, cm.sender_type AS last_sender,
             cm.created_at AS last_at,
             (SELECT COUNT(*) FROM public.chat_messages
              WHERE driver_id=cm.driver_id AND owner_id=cm.owner_id)::int AS total_messages
      FROM public.chat_messages cm
      JOIN public.drivers d ON d.id = cm.driver_id
      LEFT JOIN public.owners o ON o.id = cm.owner_id
      LEFT JOIN public.companies c ON c.id = o.company_id
      ORDER BY cm.driver_id, cm.owner_id, cm.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/chat/messages', async (req, res) => {
  try {
    const { driver_id } = req.query;
    if (!driver_id) return res.status(400).json({ error: 'driver_id required' });
    const result = await pool.query(
      `SELECT cm.*, d.full_name AS driver_name, o.full_name AS owner_name
       FROM public.chat_messages cm
       JOIN public.drivers d ON d.id = cm.driver_id
       LEFT JOIN public.owners o ON o.id = cm.owner_id
       WHERE cm.driver_id = $1
       ORDER BY cm.created_at ASC`,
      [driver_id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

router.get('/chat/messages', async (req, res) => {
  try {
    const { driver_id } = req.query;
    if (!driver_id) return res.status(400).json({ error: 'driver_id required' });
    const result = await pool.query(`
      SELECT cm.*, d.full_name AS driver_name, o.full_name AS owner_name
      FROM public.chat_messages cm
      JOIN public.drivers d ON d.id = cm.driver_id
      LEFT JOIN public.owners o ON o.id = cm.owner_id
      WHERE cm.driver_id = $1
      ORDER BY cm.created_at ASC
    `, [driver_id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
