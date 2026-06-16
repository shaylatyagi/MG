-- Migration 023: Consolidate all startup inline DDL
-- Previously scattered across index.js pool.query() calls.
-- Safe to run multiple times (IF NOT EXISTS / DO $$ guards throughout).

-- ── Session tokens ────────────────────────────────────────────────────────────
ALTER TABLE public.owners  ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);

-- ── Merchant profile fields on companies ─────────────────────────────────────
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

-- ── Driver location columns ───────────────────────────────────────────────────
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_lat          DOUBLE PRECISION;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_lng          DOUBLE PRECISION;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS last_location_at  TIMESTAMPTZ;

-- ── payment_mode_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_mode_requests (
  id             SERIAL PRIMARY KEY,
  owner_id       INTEGER NOT NULL,
  company_id     INTEGER NOT NULL,
  owner_name     VARCHAR(255),
  company_name   VARCHAR(255),
  current_mode   VARCHAR(20),
  requested_mode VARCHAR(20) NOT NULL CHECK (requested_mode IN ('CASH_ONLY','ONLINE_ONLY','BOTH')),
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pmr_owner' AND table_name = 'payment_mode_requests'
  ) THEN
    ALTER TABLE public.payment_mode_requests
      ADD CONSTRAINT fk_pmr_owner   FOREIGN KEY (owner_id)   REFERENCES public.owners(id)   ON DELETE CASCADE,
      ADD CONSTRAINT fk_pmr_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── branches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.branches (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  city        VARCHAR(100),
  state       VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.drivers  ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES public.branches(id) ON DELETE SET NULL;

-- ── vehicle_inspections ───────────────────────────────────────────────────────
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
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

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

-- ── vehicle_type_master ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_type_master (
  code        VARCHAR(20) PRIMARY KEY,
  label       VARCHAR(100) NOT NULL,
  category    VARCHAR(20) NOT NULL CHECK (category IN ('EV','CNG','FUEL','OTHER')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
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

-- ── driver_daily_log ──────────────────────────────────────────────────────────
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

-- ── onboarding_status CHECK constraint ───────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_onboarding_status' AND table_name = 'companies'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT chk_onboarding_status
      CHECK (onboarding_status IN ('PENDING','SUBMITTED','APPROVED','REJECTED'));
  END IF;
END $$;

-- ── UNIQUE constraints on gst_number and pan_number ──────────────────────────
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

-- ── Performance indexes on hot columns ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drivers_owner_code    ON public.drivers   (owner_code);
CREATE INDEX IF NOT EXISTS idx_drivers_mobile        ON public.drivers   (mobile_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id    ON public.vehicles  (driver_id);
CREATE INDEX IF NOT EXISTS idx_ms_orders_payer_mob   ON public.ms_orders (payer_mobile);
CREATE INDEX IF NOT EXISTS idx_ms_orders_owner_code  ON public.ms_orders (owner_code);

-- ── OTP rate-limit table (replaces in-memory Map) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  phone_number  VARCHAR(15) PRIMARY KEY,
  attempts      INTEGER     NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
