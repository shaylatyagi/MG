-- ═══════════════════════════════════════════════════════════════════════════════
-- MobilityGrid — Migration v3: Add missing KYC columns to drivers table
-- Run this ONCE in Neon console (SQL Editor).
-- Safe to re-run: all statements use ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════

-- KYC document fields
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS aadhaar_number         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pan_number             VARCHAR(15),
  ADD COLUMN IF NOT EXISTS driving_license_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS driving_license_expiry DATE,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS kyc_approved_at        TIMESTAMPTZ;

-- updated_at (needed by approve/reject PATCH)
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'drivers'
  AND column_name IN (
    'aadhaar_number','pan_number','driving_license_number',
    'driving_license_expiry','kyc_rejection_reason','kyc_approved_at','updated_at'
  )
ORDER BY column_name;
-- Should return 7 rows. If all 7 show up, migration succeeded.
