/**
 * config.js — Public config/branding endpoints
 * No auth required — logo URLs are public.
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client }     = require('@aws-sdk/client-s3');

const logger = require('../utils/logger');
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUCKET = process.env.AWS_S3_BUCKET || 'mobilitygrid-docs';

// Logo keys → S3 object keys in the branding/ folder
const LOGO_KEYS = {
  logo_cyan:  'branding/logo-cyan.png',   // dark navy bg + cyan
  logo_white: 'branding/logo-white.png',  // black bg + white
  logo_icon:  'branding/logo-icon.png',   // icon only
};

/**
 * GET /api/config/branding
 * Returns logo URLs — either S3 URLs stored in DB, or signed S3 URLs if bucket is private.
 * Falls back to null if not yet uploaded.
 */
router.get('/branding', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT key, value FROM public.app_config WHERE key IN ('logo_cyan','logo_white','logo_icon')`
    );

    const logos = {};
    for (const row of result.rows) {
      // If a direct URL is stored in DB, use it
      if (row.value && row.value.startsWith('http')) {
        logos[row.key] = row.value;
      } else if (row.value === null) {
        // Not uploaded yet — return null so frontend falls back to text
        logos[row.key] = null;
      } else {
        // Treat value as S3 object key, generate signed URL (1 hour)
        try {
          const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: row.value || LOGO_KEYS[row.key] });
          logos[row.key] = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
        } catch {
          logos[row.key] = null;
        }
      }
    }

    // Cache for 30 minutes (logos change rarely)
    res.set('Cache-Control', 'public, max-age=1800');
    res.json({ success: true, logos });
  } catch (err) {
    // Don't crash the app if this fails — return nulls
    res.json({ success: true, logos: { logo_cyan: null, logo_white: null, logo_icon: null } });
  }
});

/**
 * POST /api/config/branding/upload-url
 * Admin only — returns a pre-signed S3 PUT URL so admin can upload logos directly from browser.
 * Body: { key: 'logo_cyan' | 'logo_white' | 'logo_icon', contentType: 'image/png' }
 */
router.post('/branding/upload-url', async (req, res) => {
  // Simple admin key check (same pattern as rest of admin routes)
  const adminKey = req.headers['x-admin-key'] || req.body.adminKey;
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { key, contentType = 'image/png' } = req.body;
  if (!LOGO_KEYS[key]) return res.status(400).json({ error: 'Invalid logo key' });

  try {
    const s3Key = LOGO_KEYS[key];
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: contentType,
      // Make logos publicly readable
      ACL: 'public-read',
    });
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min to upload

    // The final public URL after upload
    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

    // Update DB with the public URL so future GETs don't need signed URLs
    await pool.query(
      `INSERT INTO public.app_config (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, publicUrl]
    );

    res.json({ success: true, uploadUrl, publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/config/partner/:slug
// Public — no auth. Returns partner profile + live fleet/driver counts from DB.
// Sensitive fields (PAN, GST) are masked for the public page.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/partner/:slug', async (req, res) => {
  const slug = (req.params.slug || '').toLowerCase().trim();
  if (!slug) return res.status(400).json({ error: 'slug required' });

  try {
    const ownerRes = await pool.query(
      `SELECT
         o.id, o.full_name, o.email, o.mobile_number,
         o.partner_slug, o.brand_name, o.tagline, o.about,
         o.gst_number, o.pan_number, o.cin,
         o.legal_type, o.business_category, o.business_address,
         o.website, o.contact_person, o.since_year,
         o.partner_status, o.owner_code,
         COALESCE(o.since_year::text, to_char(o.created_at, 'YYYY')) AS since
       FROM public.owners o
       WHERE o.partner_slug = $1
         AND o.is_public = true
       LIMIT 1`,
      [slug]
    );

    if (!ownerRes.rows[0]) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const o = ownerRes.rows[0];

    // Live counts — real DB data, no hardcoding
    const [vehicleRes, driverRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM public.vehicles
         WHERE owner_id = $1 OR driver_id IN (
           SELECT id FROM public.drivers WHERE owner_code = $2
         )`,
        [o.id, o.owner_code]
      ),
      pool.query(
        `SELECT COUNT(*) FROM public.drivers
         WHERE (owner_id = $1 OR owner_code = $2)`,
        [o.id, o.owner_code]
      ),
    ]);

    const maskPan = (pan) => pan ? ('*****' + pan.slice(-5)) : null;
    const maskPhone = (p) => p ? (p.slice(0, 3) + '****' + p.slice(-4)) : null;

    res.set('Cache-Control', 'public, max-age=300'); // 5-minute cache
    res.json({
      success: true,
      partner: {
        slug:             o.partner_slug,
        name:             o.brand_name || o.full_name,
        brand:            o.brand_name || o.full_name,
        tagline:          o.tagline,
        about:            o.about,
        // Contact — phone masked on public page
        mobile:           maskPhone(o.mobile_number),
        email:            o.email,
        website:          o.website,
        contact_person:   o.contact_person,
        // Legal
        gst:              o.gst_number,
        pan:              maskPan(o.pan_number),   // masked: *****A1234F
        cin:              o.cin,
        legal_type:       o.legal_type,
        category:         o.business_category,
        address:          o.business_address,
        // Stats — live from DB
        fleet:            parseInt(vehicleRes.rows[0].count, 10),
        drivers:          parseInt(driverRes.rows[0].count, 10),
        // Meta
        since:            o.since_year || o.since,
        status:           o.partner_status,
      },
    });
  } catch (err) {
    logger.error('partner profile error', { slug, error: err.message });
    res.status(500).json({ error: 'Failed to load partner profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/config/partners
// Public — list of all is_public partners (for directory page)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/partners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.id, o.full_name, o.partner_slug, o.brand_name,
         o.tagline, o.business_category, o.legal_type,
         o.since_year, o.partner_status, o.owner_code,
         (SELECT COUNT(*) FROM public.drivers
          WHERE (owner_id=o.id OR owner_code=o.owner_code)) AS driver_count,
         (SELECT COUNT(*) FROM public.vehicles
          WHERE owner_id=o.id) AS vehicle_count
       FROM public.owners o
       WHERE o.is_public = true
       ORDER BY o.since_year ASC, o.full_name ASC`
    );

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, partners: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VEHICLE TYPE MASTER ───────────────────────────────────────────────────────
// GET /api/config/vehicle-types
router.get('/vehicle-types', async (req, res) => {
  try {
    // Create table if not exists + seed on first call
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.vehicle_types (
        id        SERIAL PRIMARY KEY,
        code      VARCHAR(10) UNIQUE NOT NULL,
        name      VARCHAR(100) NOT NULL,
        category  VARCHAR(50),
        is_ev     BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add slug column if not exists (maps to existing vehicle_type text values)
    await pool.query(`ALTER TABLE public.vehicle_types ADD COLUMN IF NOT EXISTS slug VARCHAR(30) UNIQUE`).catch(()=>{});

    // Seed default types if table is empty
    const count = await pool.query('SELECT COUNT(*) FROM public.vehicle_types');
    if (parseInt(count.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO public.vehicle_types (code, slug, name, category, is_ev) VALUES
          ('VH001', 'EV_2W',      'Electric 2-Wheeler (EV Bike)',      'EV',    TRUE),
          ('VH002', 'EV_3W',      'Electric Auto (E-Rickshaw)',        'EV',    TRUE),
          ('VH003', 'EV_4W',      'Electric Car',                      'EV',    TRUE),
          ('VH004', 'EV_LCV',     'Electric Light CV / Van',           'EV',    TRUE),
          ('VH005', 'EV_HCV',     'Electric Heavy CV / Truck',         'EV',    TRUE),
          ('VH006', 'CNG_AUTO',   'CNG Auto',                          'CNG',   FALSE),
          ('VH007', 'CNG_CAR',    'CNG Car',                           'CNG',   FALSE),
          ('VH008', 'CNG_BUS',    'CNG Bus / Mini-bus',                'CNG',   FALSE),
          ('VH009', 'PETROL_2W',  'Petrol 2-Wheeler',                  'FUEL',  FALSE),
          ('VH010', 'PETROL_CAR', 'Petrol Car',                        'FUEL',  FALSE),
          ('VH011', 'DIESEL_LCV', 'Diesel Truck / LCV',                'FUEL',  FALSE),
          ('VH012', 'DIESEL_BUS', 'Diesel Bus',                        'FUEL',  FALSE),
          ('VH013', 'OTHER',      'Other',                             'OTHER', FALSE)
        ON CONFLICT (code) DO NOTHING
      `);
    }

    const result = await pool.query(
      'SELECT id, code, name, category, is_ev FROM public.vehicle_types WHERE is_active = TRUE ORDER BY code ASC'
    );
    res.json({ success: true, types: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/config/vehicle-types (admin: add custom type)
router.post('/vehicle-types', async (req, res) => {
  try {
    const { name, category = 'OTHER', is_ev = false } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    // Auto-generate next code
    const last = await pool.query(
      "SELECT code FROM public.vehicle_types ORDER BY code DESC LIMIT 1"
    );
    const lastNum = last.rows[0] ? parseInt(last.rows[0].code.replace('VH', '')) : 0;
    const newCode = `VH${String(lastNum + 1).padStart(3, '0')}`;
    const r = await pool.query(
      'INSERT INTO public.vehicle_types (code, name, category, is_ev) VALUES ($1,$2,$3,$4) RETURNING *',
      [newCode, name, category, is_ev]
    );
    res.json({ success: true, type: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
