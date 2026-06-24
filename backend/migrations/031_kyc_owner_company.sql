-- Migration 031: KYC verification columns for owners, companies, and drivers
-- Owners: add Aadhaar, bank, and per-document verified flags + kyc_status
-- Companies: add per-document verified flags + kyc_status
-- Drivers: add voter_id column (alternative identity proof)

ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS aadhaar_last4        VARCHAR(4),
  ADD COLUMN IF NOT EXISTS bank_account_number  VARCHAR(25),
  ADD COLUMN IF NOT EXISTS bank_ifsc            VARCHAR(11),
  ADD COLUMN IF NOT EXISTS gst_verified         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pan_verified         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aadhaar_verified     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_verified        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_status           VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                                  CHECK (kyc_status IN ('PENDING','PARTIAL','VERIFIED','REJECTED'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS gst_verified         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pan_verified         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_status           VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                                                  CHECK (kyc_status IN ('PENDING','PARTIAL','VERIFIED','REJECTED'));

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS voter_id             VARCHAR(20);
