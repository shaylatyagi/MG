-- Migration 024: Move chat_messages + sos_alerts DDL out of db.js startup code
-- Also adds Row-Level Security (RLS) policies for tenant isolation.
-- Run via: npm run migrate
-- Idempotent (uses IF NOT EXISTS / DO $$ everywhere)

-- ── chat_messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id             BIGSERIAL    PRIMARY KEY,
  sender_id      INTEGER      NOT NULL,
  sender_role    VARCHAR(20)  NOT NULL,
  recipient_id   INTEGER      NOT NULL,
  recipient_role VARCHAR(20)  NOT NULL,
  body           TEXT         NOT NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ              -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_chat_by_driver  ON public.chat_messages (sender_id, sender_role);
CREATE INDEX IF NOT EXISTS idx_chat_to_driver  ON public.chat_messages (recipient_id, recipient_role);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON public.chat_messages (created_at DESC);

-- ── sos_alerts: add columns if missing ───────────────────────────────────────
ALTER TABLE public.sos_alerts
  ADD COLUMN IF NOT EXISTS status  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;  -- soft delete

-- ── Soft-delete consistency: add deleted_at to core tables ──────────────────
ALTER TABLE public.drivers  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.owners   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes so soft-deleted rows are excluded automatically
CREATE INDEX IF NOT EXISTS idx_drivers_active  ON public.drivers  (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles (id) WHERE deleted_at IS NULL;

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- Enable RLS on tenant-scoped tables.
-- NOTE: The application role (e.g. 'app_user') must SET app.current_owner_id
-- before querying. Migrations run as superuser so they bypass RLS.

ALTER TABLE public.drivers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Owners can only see their own company's drivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'drivers' AND policyname = 'drivers_owner_isolation'
  ) THEN
    CREATE POLICY drivers_owner_isolation ON public.drivers
      USING (
        -- Bypass for superuser / migration runner
        current_setting('app.bypass_rls', true) = 'true'
        OR
        company_id = (current_setting('app.current_company_id', true))::integer
      );
  END IF;
END $$;

-- Owners can only see their own company's vehicles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vehicles' AND policyname = 'vehicles_owner_isolation'
  ) THEN
    CREATE POLICY vehicles_owner_isolation ON public.vehicles
      USING (
        current_setting('app.bypass_rls', true) = 'true'
        OR
        owner_id IN (
          SELECT id FROM public.owners
          WHERE company_id = (current_setting('app.current_company_id', true))::integer
        )
      );
  END IF;
END $$;

-- ── otp_rate_limits table (idempotent) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  phone_number  VARCHAR(15)  PRIMARY KEY,
  attempts      INTEGER      NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
