const express    = require('express');
const multer     = require('multer');
const router     = express.Router();
const pool       = require('../config/db');
const { logAudit } = require('../utils/audit');
const fcm          = require('../services/fcm');
const { verifyAdmin } = require('../middleware/auth.middleware');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET || 'mobilitygrid-docs';

async function adminPresignedUrl(key) {
  if (!key) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

// multer — memory storage for admin uploads
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
      `INSERT INTO public.companies(name,cin,city,status) VALUES($1,$2,$3,'ACTIVE') RETURNING *`,
      [name, cin||null, city||null]
    );
    const co = r.rows[0];
    const code = name.replace(/[^a-zA-Z]/g,'').slice(0,4).toUpperCase() + co.id;
    await pool.query(`UPDATE public.companies SET company_code=$1 WHERE id=$2`, [code, co.id]);
    res.json({ success: true, company: { ...co, company_code: code } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ALL OWNERS (lightweight list, no N+1) ───────────────────────────────────
router.get('/owners', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.full_name, o.mobile_number, o.email, o.owner_code,
             o.company_id, c.name AS company_name,
             COUNT(DISTINCT d.id)::int AS total_drivers,
             COUNT(DISTINCT v.id)::int AS total_vehicles
      FROM public.owners o
      LEFT JOIN public.companies c ON c.id = o.company_id
      LEFT JOIN public.drivers d ON d.owner_code = o.owner_code
      LEFT JOIN public.vehicles v ON v.owner_id = o.id
      GROUP BY o.id, o.full_name, o.mobile_number, o.email, o.owner_code, o.company_id, c.name
      ORDER BY o.full_name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /admin/owners error:', err);
    res.status(500).json({ error: err.message });
  }
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
router.get('/debug/transactions', verifyAdmin, async (req, res) => {
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
router.get('/transactions', verifyAdmin, async (req, res) => {
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

// PATCH /api/admin/owners/:id/plan — toggle FREE / PAID plan label
router.patch('/owners/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['FREE', 'PAID'].includes(plan))
      return res.status(400).json({ error: 'plan must be FREE or PAID' });
    const result = await pool.query(
      `UPDATE public.owners SET plan=$1, updated_at=NOW() WHERE id=$2 RETURNING id, full_name, plan`,
      [plan, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    logAudit('OWNER_PLAN_CHANGED', 'owner', req.params.id, 'admin', { plan });
    res.json({ success: true, owner: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/companies/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
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

// ─── COMPANY PAYMENT MODE ─────────────────────────────────────────────────────
router.patch('/companies/:id/payment-mode', async (req, res) => {
  try {
    const { payment_mode } = req.body;
    const VALID = ['CASH_ONLY', 'ONLINE_ONLY', 'BOTH'];
    if (!VALID.includes(payment_mode))
      return res.status(400).json({ error: `payment_mode must be one of: ${VALID.join(', ')}` });
    const r = await pool.query(
      `UPDATE public.companies SET payment_mode=$1 WHERE id=$2 RETURNING *`,
      [payment_mode, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Company not found' });
    logAudit('COMPANY_PAYMENT_MODE_CHANGED', 'company', req.params.id,
      req.headers['x-admin-phone'] || 'admin', { payment_mode });
    res.json({ success: true, company: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/companies/:id/onboarding-status — admin approves or rejects merchant profile
router.patch('/companies/:id/onboarding-status', async (req, res) => {
  try {
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const VALID = ['APPROVED', 'REJECTED', 'PENDING', 'SUBMITTED'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await pool.query(
      `UPDATE public.companies SET onboarding_status=$1 WHERE id=$2 RETURNING id, name, onboarding_status`,
      [status, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Company not found' });
    logAudit('COMPANY_ONBOARDING_STATUS_CHANGED', 'company', req.params.id,
      req.headers['x-admin-phone'] || 'admin', { status });
    res.json({ success: true, company: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN ADD DRIVER ─────────────────────────────────────────────────────────
router.post('/drivers', async (req, res) => {
  try {
    const { full_name, mobile_number, owner_id } = req.body;
    if (!full_name || !mobile_number || !owner_id)
      return res.status(400).json({ error: 'full_name, mobile_number, owner_id required' });

    const ownerRes = await pool.query(
      'SELECT owner_code FROM public.owners WHERE id=$1 LIMIT 1', [owner_id]
    );
    if (!ownerRes.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    const { owner_code } = ownerRes.rows[0];

    const driver_code = 'DRV' + Date.now().toString(36).toUpperCase();

    const { rows } = await pool.query(
      `INSERT INTO public.drivers (full_name, mobile_number, owner_code, driver_code, status)
       VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING *`,
      [full_name.trim(), mobile_number, owner_code, driver_code]
    );
    logAudit('DRIVER_CREATED', 'driver', rows[0].id,
      req.headers['x-admin-phone'] || 'admin', { full_name, mobile_number, owner_id });
    res.status(201).json({ success: true, driver: rows[0] });
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
              COALESCE(o.full_name, d.name) AS user_name
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
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING')
       ON CONFLICT (user_id, user_type, doc_type)
       DO UPDATE SET
         original_name = EXCLUDED.original_name,
         s3_key        = EXCLUDED.s3_key,
         file_size     = EXCLUDED.file_size,
         mime_type     = EXCLUDED.mime_type,
         status        = 'PENDING',
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

// GET presigned view URL for a document
router.get('/user-docs/:docId/view', async (req, res) => {
  try {
    const { docId } = req.params;
    const result = await pool.query(
      'SELECT s3_key, original_name, mime_type FROM public.user_documents WHERE id=$1',
      [docId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Document not found' });
    const { s3_key, original_name, mime_type } = result.rows[0];
    if (!s3_key) return res.status(404).json({ error: 'No file stored for this document' });
    const view_url = await adminPresignedUrl(s3_key);
    res.json({ success: true, view_url, original_name, mime_type });
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
      LEFT JOIN public.vehicles v ON v.driver_id = d.id 
  AND v.status IN ('ACTIVE', 'ASSIGNED')
      LEFT JOIN public.ms_orders mo ON mo.payer_mobile = d.mobile_number AND mo.transaction_status='SUCCESS'
      GROUP BY d.id, d.full_name, d.mobile_number, d.driver_code, d.kyc_status, d.status, d.created_at,
               o.full_name, o.mobile_number, o.owner_code, c.name,
               v.vehicle_number, v.vehicle_model, v.vehicle_type
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Payment Mode Requests ────────────────────────────────────────────────────
router.get('/payment-mode-requests', async (req, res) => {
  try {
    const { status = 'PENDING', company_id } = req.query;
    let q = `SELECT * FROM public.payment_mode_requests WHERE 1=1`;
    const params = [];
    if (status !== 'ALL') { params.push(status); q += ` AND status=$${params.length}`; }
    if (company_id)        { params.push(parseInt(company_id)); q += ` AND company_id=$${params.length}`; }
    q += ' ORDER BY created_at DESC';
    const r = await pool.query(q, params);
    res.json({ success: true, requests: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/payment-mode-requests/:id/approve', async (req, res) => {
  try {
    const reqRow = await pool.query(
      'SELECT * FROM public.payment_mode_requests WHERE id=$1', [req.params.id]
    );
    if (!reqRow.rows[0]) return res.status(404).json({ error: 'Request not found' });
    const pmReq = reqRow.rows[0];
    if (pmReq.status !== 'PENDING')
      return res.status(400).json({ error: 'Request is no longer pending' });
    // Update company payment mode
    await pool.query(
      'UPDATE public.companies SET payment_mode=$1 WHERE id=$2',
      [pmReq.requested_mode, pmReq.company_id]
    );
    // Mark request approved
    await pool.query(
      `UPDATE public.payment_mode_requests SET status='APPROVED', resolved_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    logAudit('PAYMENT_MODE_REQUEST_APPROVED', 'payment_mode_request', req.params.id,
      req.headers['x-admin-phone'] || 'admin', { new_mode: pmReq.requested_mode });
    res.json({ success: true, new_mode: pmReq.requested_mode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/payment-mode-requests/:id/reject', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE public.payment_mode_requests SET status='REJECTED', resolved_at=NOW()
       WHERE id=$1 AND status='PENDING' RETURNING *`, [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Request not found or already resolved' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ── Branch Management ──────────────────────────────────────────────────────────

// Drivers in a specific branch (for branch detail view)
router.get('/branches/:branchId/drivers', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number, d.driver_code, d.kyc_status, d.status,
              v.reg_number, v.vehicle_type
       FROM public.drivers d
       LEFT JOIN public.driver_vehicle_history dvh ON dvh.driver_id = d.id AND dvh.unassigned_at IS NULL
       LEFT JOIN public.vehicles v ON v.id = dvh.vehicle_id
       WHERE d.branch_id = $1
       ORDER BY d.full_name`,
      [req.params.branchId]
    );
    res.json({ success: true, drivers: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Vehicles in a specific branch
router.get('/branches/:branchId/vehicles', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT v.id, v.reg_number, v.vehicle_type, v.vehicle_model, v.status,
              d.full_name AS driver_name
       FROM public.vehicles v
       LEFT JOIN public.driver_vehicle_history dvh ON dvh.vehicle_id = v.id AND dvh.unassigned_at IS NULL
       LEFT JOIN public.drivers d ON d.id = dvh.driver_id
       WHERE v.branch_id = $1
       ORDER BY v.reg_number`,
      [req.params.branchId]
    );
    res.json({ success: true, vehicles: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});



// List all branches for a company
router.get('/companies/:companyId/branches', async (req, res) => {
  try {
    const { companyId } = req.params;
    const r = await pool.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM public.drivers d WHERE d.branch_id = b.id)::int AS driver_count,
        (SELECT COUNT(*) FROM public.vehicles v WHERE v.branch_id = b.id)::int AS vehicle_count,
        COALESCE((
          SELECT SUM(mo.order_amount)
          FROM public.ms_orders mo
          JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
          WHERE d.branch_id = b.id
            AND mo.transaction_status = 'SUCCESS'
            AND DATE(mo.order_initiation_date) = CURRENT_DATE
        ), 0)::numeric AS collection_today,
        COALESCE((
          SELECT SUM(mo.order_amount)
          FROM public.ms_orders mo
          JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
          WHERE d.branch_id = b.id
            AND mo.transaction_status = 'SUCCESS'
            AND DATE_TRUNC('month', mo.order_initiation_date) = DATE_TRUNC('month', NOW())
        ), 0)::numeric AS collection_month,
        COALESCE((
          SELECT SUM(mo.order_amount)
          FROM public.ms_orders mo
          JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
          WHERE d.branch_id = b.id
            AND mo.transaction_status = 'SUCCESS'
        ), 0)::numeric AS collection_total
       FROM public.branches b
       WHERE b.company_id = $1
       ORDER BY b.name`,
      [companyId]
    );
    res.json({ success: true, branches: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a branch for a company
router.post('/companies/:companyId/branches', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, city, state } = req.body;
    if (!name) return res.status(400).json({ error: 'Branch name required' });
    const r = await pool.query(
      `INSERT INTO public.branches (company_id, name, city, state)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [companyId, name, city || null, state || null]
    );
    logAudit('BRANCH_CREATED', 'branch', r.rows[0].id,
      req.headers['x-admin-phone'] || 'admin', { company_id: companyId, name });
    res.json({ success: true, branch: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete a branch
router.delete('/companies/:companyId/branches/:branchId', async (req, res) => {
  try {
    const { branchId, companyId } = req.params;
    // Unset branch_id on drivers/vehicles before delete
    await pool.query('UPDATE public.drivers  SET branch_id = NULL WHERE branch_id = $1', [branchId]);
    await pool.query('UPDATE public.vehicles SET branch_id = NULL WHERE branch_id = $1', [branchId]);
    await pool.query('DELETE FROM public.branches WHERE id = $1 AND company_id = $2', [branchId, companyId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign driver to branch
router.patch('/drivers/:driverId/branch', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { branch_id } = req.body;  // null to unassign
    await pool.query('UPDATE public.drivers SET branch_id = $1 WHERE id = $2', [branch_id || null, driverId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Assign vehicle to branch
router.patch('/vehicles/:vehicleId/branch', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { branch_id } = req.body;
    await pool.query('UPDATE public.vehicles SET branch_id = $1 WHERE id = $2', [branch_id || null, vehicleId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN NOTIFICATIONS ──────────────────────────────────────────────────────

// GET /api/admin/notifications — latest 50 admin notifications
router.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, message, is_read, created_at
       FROM public.notifications
       WHERE user_type = 'ADMIN'
       ORDER BY created_at DESC LIMIT 50`
    );
    const unread = result.rows.filter(n => !n.is_read).length;
    res.json({ success: true, notifications: result.rows, unread });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/notifications/read-all — mark all admin notifications read
router.put('/notifications/read-all', async (req, res) => {
  try {
    await pool.query(
      `UPDATE public.notifications SET is_read = true WHERE user_type = 'ADMIN'`
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DOCUMENT APPROVAL WORKFLOW ───────────────────────────────────────────────

// GET /api/admin/document-approvals — list all PENDING documents
router.get('/document-approvals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ud.*,
        COALESCE(d.full_name, o.full_name)             AS user_name,
        COALESCE(d.mobile_number, o.mobile_number)    AS user_phone,
        c.company_name
      FROM public.user_documents ud
      LEFT JOIN public.drivers d  ON d.id  = ud.user_id AND ud.user_type = 'DRIVER'
      LEFT JOIN public.owners  o  ON o.id  = ud.user_id AND ud.user_type = 'OWNER'
      LEFT JOIN public.companies c ON c.id = COALESCE(d.company_id, o.company_id)
      WHERE ud.status IN ('PENDING', 'UPLOADED', 'SUBMITTED')
      ORDER BY ud.uploaded_at DESC
    `);
    const docs = await Promise.all(result.rows.map(async doc => ({
      ...doc,
      view_url: await adminPresignedUrl(doc.s3_key).catch(() => null),
    })));
    res.json({ success: true, docs, count: docs.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/document-approvals/:id/approve
router.put('/document-approvals/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const docRes = await pool.query(
      'SELECT user_id, user_type, doc_type FROM public.user_documents WHERE id=$1', [id]
    );
    await pool.query(
      "UPDATE public.user_documents SET status='APPROVED', reviewed_at=NOW() WHERE id=$1", [id]
    );
    await logAudit('ADMIN', 'DOCUMENT_APPROVED', { doc_id: id });
    // FCM push
    if (docRes.rows[0]) {
      const { user_id, user_type, doc_type } = docRes.rows[0];
      fcm.sendToUser(pool, user_id, user_type.toLowerCase(),
        '✅ Document Approved',
        `Your ${doc_type.replace(/_/g,' ')} has been approved by admin.`,
        { type: 'DOC_APPROVED', doc_type }
      ).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/document-approvals/:id/reject
router.put('/document-approvals/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const docRes = await pool.query(
      'SELECT user_id, user_type, doc_type FROM public.user_documents WHERE id=$1', [id]
    );
    await pool.query(
      "UPDATE public.user_documents SET status='REJECTED', rejection_reason=$2, reviewed_at=NOW() WHERE id=$1",
      [id, reason || null]
    );
    await logAudit('ADMIN', 'DOCUMENT_REJECTED', { doc_id: id, reason });
    // FCM push
    if (docRes.rows[0]) {
      const { user_id, user_type, doc_type } = docRes.rows[0];
      const body = reason
        ? `Your ${doc_type.replace(/_/g,' ')} was rejected: ${reason}`
        : `Your ${doc_type.replace(/_/g,' ')} was rejected. Please re-upload.`;
      fcm.sendToUser(pool, user_id, user_type.toLowerCase(),
        '❌ Document Rejected',
        body,
        { type: 'DOC_REJECTED', doc_type, reason: reason || '' }
      ).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PIN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/admin/generate-pins
// Body (all optional): { company_id, owner_id }
// Scope: if owner_id given → only that owner's drivers (+ owner if no PIN)
//        if company_id given → all owners+drivers in that company without a PIN
//        if neither → all users platform-wide without a PIN
router.post('/generate-pins', async (req, res) => {
  var bcrypt    = require('bcrypt');
  var companyId = req.body.company_id ? parseInt(req.body.company_id) : null;
  var ownerId   = req.body.owner_id   ? parseInt(req.body.owner_id)   : null;
  try {
    var ownerWhere  = "pin_hash IS NULL AND status != 'INACTIVE'";
    var driverWhere = "pin_hash IS NULL AND status != 'INACTIVE'";
    var ownerParams  = [];
    var driverParams = [];

    if (ownerId) {
      // Only this owner + their drivers
      ownerWhere  += ' AND id=$1';
      ownerParams  = [ownerId];
      driverWhere += ' AND owner_code = (SELECT owner_code FROM public.owners WHERE id=$1)';
      driverParams = [ownerId];
    } else if (companyId) {
      // All owners in this company + all their drivers
      ownerWhere  += ' AND company_id=$1';
      ownerParams  = [companyId];
      driverWhere += ' AND owner_code IN (SELECT owner_code FROM public.owners WHERE company_id=$1)';
      driverParams = [companyId];
    }

    var ownersRes  = await pool.query(
      'SELECT id, full_name, mobile_number, owner_code FROM public.owners WHERE ' + ownerWhere + ' ORDER BY id',
      ownerParams
    );
    var driversRes = await pool.query(
      'SELECT id, full_name, mobile_number, driver_code FROM public.drivers WHERE ' + driverWhere + ' ORDER BY id',
      driverParams
    );

    var generated = [];
    for (var o of ownersRes.rows) {
      var pin = String(Math.floor(100000 + Math.random() * 900000));
      await pool.query(
        'UPDATE public.owners SET pin_hash=$1, pin_set_at=NOW(), pin_must_change=true WHERE id=$2',
        [await bcrypt.hash(pin, 10), o.id]
      );
      generated.push({ role: 'OWNER', name: o.full_name, phone: o.mobile_number, code: o.owner_code, pin: pin });
    }
    for (var d of driversRes.rows) {
      var pin = String(Math.floor(100000 + Math.random() * 900000));
      await pool.query(
        'UPDATE public.drivers SET pin_hash=$1, pin_set_at=NOW(), pin_must_change=true WHERE id=$2',
        [await bcrypt.hash(pin, 10), d.id]
      );
      generated.push({ role: 'DRIVER', name: d.full_name, phone: d.mobile_number, code: d.driver_code, pin: pin });
    }

    res.json({ success: true, count: generated.length, pins: generated });
  } catch (err) {
    console.error('generate-pins error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/reset-pin  — Body: { phone_number, role }
// Finds user by phone, resets PIN, returns new plain-text PIN.
router.post('/reset-pin', async (req, res) => {
  var bcrypt = require('bcrypt');
  var phone  = (req.body.phone_number || '').trim();
  var role   = (req.body.role || '').toUpperCase();
  if (!phone || !role) return res.status(400).json({ success: false, message: 'phone_number and role required' });
  try {
    var table = role === 'DRIVER' ? 'drivers' : 'owners';
    var pin   = String(Math.floor(100000 + Math.random() * 900000));
    var upd   = await pool.query(
      'UPDATE public.' + table + ' SET pin_hash=$1, pin_set_at=NOW(), pin_must_change=true, pin_otp_used=false WHERE mobile_number=$2 RETURNING full_name, mobile_number',
      [await bcrypt.hash(pin, 10), phone]
    );
    if (!upd.rows[0]) return res.status(404).json({ success: false, message: 'No ' + role.toLowerCase() + ' found with that number' });
    res.json({ success: true, pin: pin, name: upd.rows[0].full_name, phone: upd.rows[0].mobile_number });
  } catch (err) {
    console.error('admin reset-pin error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/leads — waitlist/interest form submissions
router.get('/leads', async (req, res) => {
  try {
    var r = await pool.query('SELECT * FROM public.waitlist_leads ORDER BY submitted_at DESC');
    res.json({ success: true, leads: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/companies-list — lightweight list for PIN scope dropdown
router.get('/companies-list', async (req, res) => {
  try {
    var r = await pool.query("SELECT id, name FROM public.companies WHERE status='ACTIVE' ORDER BY name");
    res.json({ success: true, companies: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/owners-list?company_id=X — owners for a company (for PIN scope)
router.get('/owners-list', async (req, res) => {
  try {
    var where = "status != 'INACTIVE'";
    var params = [];
    if (req.query.company_id) { where += ' AND company_id=$1'; params = [req.query.company_id]; }
    var r = await pool.query(
      'SELECT id, full_name, mobile_number, owner_code FROM public.owners WHERE ' + where + ' ORDER BY full_name',
      params
    );
    res.json({ success: true, owners: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/pin-status
// Returns counts of owners/drivers with and without PINs set.
router.get('/pin-status', async (req, res) => {
  try {
    var r = await pool.query(
      "SELECT " +
      "  (SELECT COUNT(*) FROM public.owners  WHERE pin_hash IS NOT NULL) AS owners_with_pin," +
      "  (SELECT COUNT(*) FROM public.owners  WHERE pin_hash IS NULL AND status != 'INACTIVE') AS owners_without_pin," +
      "  (SELECT COUNT(*) FROM public.drivers WHERE pin_hash IS NOT NULL) AS drivers_with_pin," +
      "  (SELECT COUNT(*) FROM public.drivers WHERE pin_hash IS NULL AND status != 'INACTIVE') AS drivers_without_pin"
    );
    res.json({ success: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SEED DEMO ONLINE DRIVER ───────────────────────────────────────────────────
// POST /api/admin/seed-demo-online
// Finds the demo owner's first unassigned driver, renames to demo-driver-online,
// creates (or reuses) vehicle DEMO-V001 with ₹1 daily rent, and assigns it.
// Idempotent — safe to call multiple times.
router.post('/seed-demo-online', async (req, res) => {
  try {
    // 1. Find demo owner — prefer name/mobile containing "demo" (case-insensitive)
    let ownerRes = await pool.query(
      `SELECT id, owner_code, full_name FROM public.owners
       WHERE LOWER(full_name) LIKE '%demo%'
          OR LOWER(full_name) LIKE '%test%'
          OR mobile_number = '9999999999'
       ORDER BY id ASC LIMIT 1`
    );
    // Fallback: first owner in DB
    if (!ownerRes.rows[0]) {
      ownerRes = await pool.query(
        `SELECT id, owner_code, full_name FROM public.owners ORDER BY id ASC LIMIT 1`
      );
    }
    if (!ownerRes.rows[0]) {
      return res.status(404).json({ success: false, error: 'No owner found in DB' });
    }
    const owner = ownerRes.rows[0];

    // 2. Find an unassigned driver under this owner
    const driverRes = await pool.query(
      `SELECT d.id, d.full_name, d.mobile_number
       FROM public.drivers d
       WHERE d.owner_code = $1
         AND NOT EXISTS (
           SELECT 1 FROM public.vehicles v WHERE v.driver_id = d.id
         )
         AND d.deleted_at IS NULL
       ORDER BY d.id ASC LIMIT 1`,
      [owner.owner_code]
    );
    if (!driverRes.rows[0]) {
      return res.status(404).json({
        success: false,
        error: `No unassigned driver found under owner ${owner.full_name} (${owner.owner_code})`,
      });
    }
    const driver = driverRes.rows[0];

    // 3. Rename driver to demo-driver-online
    await pool.query(
      `UPDATE public.drivers SET full_name = 'demo-driver-online' WHERE id = $1`,
      [driver.id]
    );

    // 4. Find or create vehicle DEMO-V001 under demo owner with ₹1 rent
    let vehRes = await pool.query(
      `SELECT id, driver_id FROM public.vehicles WHERE vehicle_number = 'DEMO-V001' LIMIT 1`
    );
    let vehicleId;
    if (vehRes.rows[0]) {
      vehicleId = vehRes.rows[0].id;
      // If already assigned to someone else, unassign first
      if (vehRes.rows[0].driver_id && vehRes.rows[0].driver_id !== driver.id) {
        await pool.query(
          `UPDATE public.driver_vehicle_history SET unassigned_at = NOW(), reason = 'DEMO_RESET'
           WHERE vehicle_id = $1 AND unassigned_at IS NULL`,
          [vehicleId]
        );
        await pool.query(
          `UPDATE public.vehicles SET driver_id = NULL WHERE id = $1`, [vehicleId]
        );
      }
      // Update rent to ₹1
      await pool.query(
        `UPDATE public.vehicles SET daily_rent = 1, rent_type = 'DAILY' WHERE id = $1`, [vehicleId]
      );
    } else {
      // Create the demo vehicle
      const ins = await pool.query(
        `INSERT INTO public.vehicles
           (vehicle_number, vehicle_model, vehicle_type, daily_rent, rent_type, owner_id, status)
         VALUES ('DEMO-V001', 'Demo Test Vehicle', 'EV_3W', 1, 'DAILY', $1, 'ACTIVE')
         RETURNING id`,
        [owner.id]
      );
      vehicleId = ins.rows[0].id;
    }

    // 5. Assign vehicle to driver (close any open history first)
    await pool.query(
      `UPDATE public.driver_vehicle_history SET unassigned_at = NOW(), reason = 'DEMO_RESET'
       WHERE driver_id = $1 AND unassigned_at IS NULL`,
      [driver.id]
    );
    await pool.query(
      `INSERT INTO public.driver_vehicle_history
         (driver_id, vehicle_id, owner_id, daily_rent, rent_type, reason)
       VALUES ($1, $2, $3, 1, 'DAILY', 'DEMO_SEED')`,
      [driver.id, vehicleId, owner.id]
    );
    await pool.query(
      `UPDATE public.vehicles SET driver_id = $1 WHERE id = $2`,
      [driver.id, vehicleId]
    );

    res.json({
      success: true,
      message: 'Demo driver seeded successfully',
      owner: { id: owner.id, name: owner.full_name, code: owner.owner_code },
      driver: { id: driver.id, name: 'demo-driver-online', mobile: driver.mobile_number },
      vehicle: { id: vehicleId, number: 'DEMO-V001', daily_rent: 1 },
    });
  } catch (err) {
    console.error('seed-demo-online error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/chat/threads — all chat threads with last message
router.get('/chat/threads', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        d.id AS driver_id,
        d.full_name AS driver_name,
        d.mobile_number,
        o.full_name AS owner_name,
        cm.message AS last_message,
        cm.created_at AS last_message_at,
        cm.sender_type AS last_sender,
        COUNT(CASE WHEN cm2.is_read = FALSE AND cm2.sender_type = 'DRIVER' THEN 1 END)::int AS unread_count
      FROM public.drivers d
      LEFT JOIN public.owners o ON o.id = d.owner_id
      LEFT JOIN LATERAL (
        SELECT message, created_at, sender_type
        FROM public.chat_messages
        WHERE driver_id = d.id
        ORDER BY created_at DESC LIMIT 1
      ) cm ON TRUE
      LEFT JOIN public.chat_messages cm2 ON cm2.driver_id = d.id
      WHERE d.deleted_at IS NULL
      GROUP BY d.id, d.full_name, d.mobile_number, o.full_name, cm.message, cm.created_at, cm.sender_type
      ORDER BY cm.created_at DESC NULLS LAST
      LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/chat/messages?driver_id= — messages for a thread
router.get('/chat/messages', async (req, res) => {
  try {
    const { driver_id, limit = 50 } = req.query;
    if (!driver_id) return res.status(400).json({ error: 'driver_id required' });
    const result = await pool.query(
      `SELECT id, sender_type, message, is_read, created_at
       FROM public.chat_messages
       WHERE driver_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [driver_id, parseInt(limit)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CASH PAYMENT MANAGEMENT ─────────────────────────────────────────────────

// GET /api/admin/drivers/cash-payments?ownerName=&driverName=
// Preview cash payments before deleting
router.get('/drivers/cash-payments', async (req, res) => {
  try {
    const { ownerName, driverName, driverPhone } = req.query;
    let where = `mo.payment_mode = 'CASH'`;
    const params = [];
    if (driverPhone) {
      params.push(driverPhone);
      where += ` AND mo.payer_mobile = $${params.length}`;
    } else if (driverName) {
      params.push(`%${driverName}%`);
      where += ` AND (mo.payer_name ILIKE $${params.length} OR d.full_name ILIKE $${params.length})`;
    }
    if (ownerName) {
      params.push(`%${ownerName}%`);
      where += ` AND o.full_name ILIKE $${params.length}`;
    }
    const result = await pool.query(
      `SELECT mo.order_id, mo.order_number, mo.order_amount, mo.order_completion_date,
              mo.payer_mobile, mo.payer_name, mo.driver_code, mo.owner_code,
              d.full_name as driver_name, o.full_name as owner_name
       FROM public.ms_orders mo
       LEFT JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
       LEFT JOIN public.owners o ON o.owner_code = mo.owner_code
       WHERE ${where}
       ORDER BY mo.order_completion_date DESC`,
      params
    );
    res.json({ success: true, count: result.rows.length, payments: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/drivers/cash-payments
// Body: { ownerName, driverName } OR { orderIds: [...] }
// Deletes cash payments and recalculates wallet_balance
router.delete('/drivers/cash-payments', async (req, res) => {
  try {
    const { ownerName, driverName, driverPhone, orderIds } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let toDelete;
      if (orderIds && orderIds.length) {
        // Delete specific order IDs
        const result = await client.query(
          `SELECT order_id, order_amount, payer_mobile FROM public.ms_orders
           WHERE order_id = ANY($1) AND payment_mode = 'CASH'`,
          [orderIds]
        );
        toDelete = result.rows;
      } else {
        // Find by owner + driver name/phone
        let where = `mo.payment_mode = 'CASH'`;
        const params = [];
        if (driverPhone) {
          params.push(driverPhone);
          where += ` AND mo.payer_mobile = $${params.length}`;
        } else if (driverName) {
          params.push(`%${driverName}%`);
          where += ` AND (mo.payer_name ILIKE $${params.length} OR d.full_name ILIKE $${params.length})`;
        }
        if (ownerName) {
          params.push(`%${ownerName}%`);
          where += ` AND o.full_name ILIKE $${params.length}`;
        }
        const result = await client.query(
          `SELECT mo.order_id, mo.order_amount, mo.payer_mobile
           FROM public.ms_orders mo
           LEFT JOIN public.drivers d ON d.mobile_number = mo.payer_mobile
           LEFT JOIN public.owners o ON o.owner_code = mo.owner_code
           WHERE ${where}`,
          params
        );
        toDelete = result.rows;
      }

      if (!toDelete.length) {
        await client.query('ROLLBACK');
        return res.json({ success: true, deleted: 0, message: 'No matching cash payments found' });
      }

      // Delete from ms_orders
      const ids = toDelete.map(r => r.order_id);
      await client.query(
        `DELETE FROM public.ms_orders WHERE order_id = ANY($1)`, [ids]
      );

      // Reverse wallet_balance for each affected driver
      const byPhone = {};
      for (const r of toDelete) {
        if (!r.payer_mobile) continue;
        byPhone[r.payer_mobile] = (byPhone[r.payer_mobile] || 0) + parseFloat(r.order_amount);
      }
      for (const [phone, total] of Object.entries(byPhone)) {
        await client.query(
          `UPDATE public.drivers SET wallet_balance = GREATEST(0, COALESCE(wallet_balance,0) - $1)
           WHERE mobile_number = $2`,
          [total, phone]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, deleted: toDelete.length, total_reversed: Object.values(byPhone).reduce((a,b)=>a+b,0) });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/trigger-midnight-cron — manual test trigger (admin only)
router.post('/trigger-midnight-cron', verifyAdmin, async (req, res) => {
  try {
    const { runMidnightRentDeduction } = require('../services/cronJobs');
    const result = await runMidnightRentDeduction();
    res.json({ success: true, message: 'Cron executed manually', result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
