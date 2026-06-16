const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ── Startup env guard — fail fast, never silently use weak defaults ────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'ADMIN_SECRET_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  console.error('Set them in Render → Environment before deploying.');
  process.exit(1);
}
//To connect DB
require('./src/config/db');
require('./src/services/scheduler.service');
const pool = require('./src/config/db');

// ── Auto-migration: single-device session tokens ─────────────────────────────
pool.query(`
  ALTER TABLE public.owners  ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);
  ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);
  -- Merchant profile fields on companies
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS legal_entity_type VARCHAR(50);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_category  VARCHAR(100);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS gst_number         VARCHAR(20);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pan_number         VARCHAR(12);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cin_llpin          VARCHAR(30);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS annual_turnover    VARCHAR(50);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website            VARCHAR(255);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city               VARCHAR(100);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state              VARCHAR(100);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pincode            VARCHAR(10);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_person     VARCHAR(100);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_email      VARCHAR(150);
  ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS onboarding_status  VARCHAR(20) DEFAULT 'PENDING';
`).catch(err => console.warn('Session token migration warning:', err.message));

pool.query(`
  ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_lat  DOUBLE PRECISION;
  ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_lng  DOUBLE PRECISION;
  ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;
`).catch(err => console.warn('Driver location columns migration warning:', err.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS public.payment_mode_requests (
    id           SERIAL PRIMARY KEY,
    owner_id     INTEGER NOT NULL,
    company_id   INTEGER NOT NULL,
    owner_name   VARCHAR(255),
    company_name VARCHAR(255),
    current_mode VARCHAR(20),
    requested_mode VARCHAR(20) NOT NULL CHECK (requested_mode IN ('CASH_ONLY','ONLINE_ONLY','BOTH')),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ
  );
`).catch(err => console.warn('payment_mode_requests migration warning:', err.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS public.branches (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    city        VARCHAR(100),
    state       VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE public.drivers  ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES public.branches(id) ON DELETE SET NULL;
  ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES public.branches(id) ON DELETE SET NULL;
`).catch(err => console.warn('Branches migration warning:', err.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id               SERIAL PRIMARY KEY,
    assignment_id    INTEGER,
    vehicle_id       INTEGER,
    driver_id        INTEGER,
    inspection_type  VARCHAR(20) NOT NULL CHECK (inspection_type IN ('DELIVERY','RETURN')),
    photo_front      TEXT,
    photo_rear       TEXT,
    photo_left       TEXT,
    photo_right      TEXT,
    ai_damage_report JSONB,
    damage_detected  BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  );
`).catch(err => console.warn('vehicle_inspections migration warning:', err.message));

// ── vehicle_type_master — PK table, referenced by vehicles.vehicle_type ──
pool.query(`
  CREATE TABLE IF NOT EXISTS public.vehicle_type_master (
    code        VARCHAR(20) PRIMARY KEY,
    label       VARCHAR(100) NOT NULL,
    category    VARCHAR(20) NOT NULL CHECK (category IN ('EV','CNG','FUEL','OTHER')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
`).then(() => pool.query(`
  INSERT INTO public.vehicle_type_master (code, label, category) VALUES
    ('EV_2W',      'Electric 2-Wheeler',        'EV'),
    ('EV_3W',      'Electric Auto (E-Rickshaw)', 'EV'),
    ('EV_4W',      'Electric Car',               'EV'),
    ('EV_LCV',     'Electric Light CV / Van',    'EV'),
    ('EV_HCV',     'Electric Heavy CV / Truck',  'EV'),
    ('CNG_AUTO',   'CNG Auto',                   'CNG'),
    ('CNG_CAR',    'CNG Car',                    'CNG'),
    ('CNG_BUS',    'CNG Bus / Mini-bus',          'CNG'),
    ('PETROL_2W',  'Petrol 2-Wheeler',            'FUEL'),
    ('PETROL_CAR', 'Petrol Car',                  'FUEL'),
    ('DIESEL_LCV', 'Diesel Truck / LCV',          'FUEL'),
    ('DIESEL_BUS', 'Diesel Bus',                  'FUEL'),
    ('OTHER',      'Other',                       'OTHER')
  ON CONFLICT (code) DO NOTHING;
`)).catch(err => console.warn('vehicle_type_master migration warning:', err.message));

// ── driver_daily_log — attendance tracking (H-5: was missing from codebase) ─
pool.query(`
  CREATE TABLE IF NOT EXISTS public.driver_daily_log (
    id          SERIAL PRIMARY KEY,
    driver_id   INTEGER NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    login_at    TIMESTAMPTZ DEFAULT NOW(),
    logout_at   TIMESTAMPTZ,
    is_present  BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (driver_id, log_date)
  );
  CREATE INDEX IF NOT EXISTS idx_daily_log_driver_date ON public.driver_daily_log (driver_id, log_date);
`).catch(err => console.warn('driver_daily_log migration warning:', err.message));

// ── FK constraints on payment_mode_requests (H-1) ────────────────────────────
pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_pmr_owner' AND table_name = 'payment_mode_requests'
    ) THEN
      ALTER TABLE public.payment_mode_requests
        ADD CONSTRAINT fk_pmr_owner   FOREIGN KEY (owner_id)   REFERENCES public.owners(id)   ON DELETE CASCADE,
        ADD CONSTRAINT fk_pmr_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
  END $$;
`).catch(err => console.warn('payment_mode_requests FK warning:', err.message));

// ── onboarding_status CHECK constraint (H-3) ─────────────────────────────────
pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'chk_onboarding_status' AND table_name = 'companies'
    ) THEN
      ALTER TABLE public.companies
        ADD CONSTRAINT chk_onboarding_status
        CHECK (onboarding_status IN ('PENDING','SUBMITTED','APPROVED','REJECTED'));
    END IF;
  END $$;
`).catch(err => console.warn('onboarding_status CHECK warning:', err.message));

// ── Performance indexes on hot columns (M-3) ─────────────────────────────────
pool.query(`
  CREATE INDEX IF NOT EXISTS idx_drivers_owner_code    ON public.drivers  (owner_code);
  CREATE INDEX IF NOT EXISTS idx_drivers_mobile        ON public.drivers  (mobile_number);
  CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id    ON public.vehicles (driver_id);
  CREATE INDEX IF NOT EXISTS idx_ms_orders_payer_mob   ON public.ms_orders (payer_mobile);
  CREATE INDEX IF NOT EXISTS idx_ms_orders_owner_code  ON public.ms_orders (owner_code);
`).catch(err => console.warn('Performance index migration warning:', err.message));

// ── H-2: FK constraints on vehicle_inspections ───────────────────────────────
pool.query(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_vi_assignment' AND table_name = 'vehicle_inspections'
    ) THEN
      ALTER TABLE public.vehicle_inspections
        ADD CONSTRAINT fk_vi_assignment FOREIGN KEY (assignment_id) REFERENCES public.vehicles(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_vi_vehicle    FOREIGN KEY (vehicle_id)    REFERENCES public.vehicles(id) ON DELETE CASCADE,
        ADD CONSTRAINT fk_vi_driver     FOREIGN KEY (driver_id)     REFERENCES public.drivers(id)  ON DELETE CASCADE;
    END IF;
  END $$;
`).catch(err => console.warn('vehicle_inspections FK warning:', err.message));

// ── H-4: UNIQUE constraints on gst_number and pan_number ─────────────────────
pool.query(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'uq_companies_gst' AND table_name = 'companies'
    ) THEN
      ALTER TABLE public.companies
        ADD CONSTRAINT uq_companies_gst UNIQUE (gst_number),
        ADD CONSTRAINT uq_companies_pan UNIQUE (pan_number);
    END IF;
  END $$;
`).catch(err => console.warn('companies UNIQUE constraints warning:', err.message));

// ── H-9: Add updated_at to tables missing it ─────────────────────────────────
pool.query(`
  ALTER TABLE public.payment_mode_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.vehicle_inspections   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.branches              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
`).catch(err => console.warn('updated_at migration warning:', err.message));

const app = express();
const rateLimit = require('express-rate-limit');

// ── CORS — explicit allowlist only ────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://mobilitygrid.in',
  'https://www.mobilitygrid.in',
  'https://partners.mobilitygrid.in',
  'https://mg-xi.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  credentials: true,
}));

const { errorMiddleware, notFoundMiddleware } = require('./src/middleware/error.middleware');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limits — must be registered BEFORE routes ───────────────────────────
app.use('/api/auth/send-otp', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests, try after 10 minutes' },
}));
app.use('/api/auth/verify-otp', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP attempts, try after 10 minutes' },
}));

// ── Auth middleware ───────────────────────────────────────────────────────────
const { verifyToken, verifyAdmin } = require('./src/middleware/auth.middleware');

// ── ROUTES ────────────────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/auth');
const driverRoutes = require('./src/routes/driver');
const paymentRoutes = require('./src/routes/payment');
const ownerRoutes = require('./src/routes/owner');
const uploadRoutes = require('./src/routes/uploads');

app.use('/api/uploads', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);

// Authenticated drivers list (was public — fixed C-1)
app.get('/api/drivers/list', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code
       FROM public.drivers WHERE status = 'ACTIVE' ORDER BY full_name`
    );
    res.json({ drivers: result.rows, success: true });
  } catch (err) {
    res.status(500).json({ drivers: [], success: false, error: err.message });
  }
});

app.use('/api/payment',    verifyToken, require('./src/routes/payment'));
app.use('/api/assignment', verifyToken, require('./src/routes/assignment'));
// Payment Links — public webhook + GET; POST/list auth handled inside route
app.use('/api/payment-links', require('./src/routes/paymentLinks'));

// Admin — single registration with verifyAdmin guard
app.use('/api/admin', verifyAdmin, require('./src/routes/admin'));

app.use('/api/owner',      ownerRoutes);
app.use('/api/chat',       require('./src/routes/chat'));
app.use('/api/kyc',        require('./src/routes/kyc'));
app.use('/api/inspection', verifyToken, require('./src/routes/inspection'));
app.use('/api/device',     verifyToken, require('./src/routes/device'));

// Check Health
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mobility Grid API is running ✅',
    env: process.env.NODE_ENV || 'development'
  });
});
// SCHEDULER
const BASE_URL = 'https://mg-qw5s.onrender.com';
const checkPendingOrders = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/payment/check-pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('✅ Pending orders checked:', data);
  } catch (err) {
    console.error('❌ Scheduler error:', err.message);
  }
};
setInterval(checkPendingOrders, 5 * 60 * 1000);
// Reset Daily
const scheduleDailyReset = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;
  setTimeout(async () => {
    try {
      await pool.query('UPDATE driver_details SET amount_paid_today = 0, updated_at = NOW()');
      console.log('✅ Daily reset done');
    } catch (err) {
      console.error('❌ Daily reset error:', err);
    }
  }, msUntilMidnight);
};
scheduleDailyReset();
// Handle Erorr 404
app.use((req, res) => {
  res.status(404).json({ message: ' ' });
});
// SERVER START
const PORT = process.env.PORT || 5000;
app.use(notFoundMiddleware);
app.use(errorMiddleware);
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Base URL: http://localhost:${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
