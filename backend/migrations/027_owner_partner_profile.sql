-- Migration 027: Partner profile columns on owners table
-- Every merchant onboarded by admin gets a public partner profile page
-- at partners.mobilitygrid.in/:partner_slug
-- All fields are optional — only shown on the public page if set by admin.

ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS partner_slug        TEXT UNIQUE,          -- URL slug: "recoverynest"
  ADD COLUMN IF NOT EXISTS brand_name          TEXT,                 -- "EV4Rent"
  ADD COLUMN IF NOT EXISTS tagline             TEXT,                 -- "E-Bike Rental · Ghaziabad"
  ADD COLUMN IF NOT EXISTS about              TEXT,                  -- paragraph about the business
  ADD COLUMN IF NOT EXISTS gst_number          TEXT,                 -- GST registration number
  ADD COLUMN IF NOT EXISTS pan_number          TEXT,                 -- PAN (stored; masked on public page)
  ADD COLUMN IF NOT EXISTS cin                 TEXT,                 -- CIN / registration number
  ADD COLUMN IF NOT EXISTS legal_type          TEXT,                 -- "LLP" | "Pvt Ltd" | "Proprietorship"
  ADD COLUMN IF NOT EXISTS business_category   TEXT,                 -- "E-Bike Rental" | "EV Fleet" etc.
  ADD COLUMN IF NOT EXISTS business_address    TEXT,                 -- full registered address
  ADD COLUMN IF NOT EXISTS website             TEXT,                 -- optional website URL
  ADD COLUMN IF NOT EXISTS contact_person      TEXT,                 -- "Mukesh Kumar (Partner)"
  ADD COLUMN IF NOT EXISTS since_year          INT,                  -- year onboarded / founded
  ADD COLUMN IF NOT EXISTS partner_status      TEXT NOT NULL DEFAULT 'ACTIVE'
                                                 CHECK (partner_status IN ('ACTIVE','INACTIVE','PENDING')),
  ADD COLUMN IF NOT EXISTS is_public           BOOLEAN NOT NULL DEFAULT false;
                                                -- false = profile not shown on partners page yet

-- Seed Recovery Nest — move hardcoded data from PartnersPage.js into DB
-- Run this only once; subsequent onboardings done via admin panel
UPDATE public.owners SET
  partner_slug      = 'recoverynest',
  brand_name        = 'EV4Rent',
  tagline           = 'E-Bike Rental & Fleet Operations · Ghaziabad, UP',
  about             = 'Recovery Nest LLP (brand: EV4Rent) is a Ghaziabad-based electric two-wheeler rental fleet. They operate EVs — Dangus Pro and Swift Volt models — deployed to delivery riders across NCR. Onboarded on MobilityGrid for digital rent collection, driver KYC, and fleet tracking.',
  gst_number        = '09ABLFR5375B1ZY',
  pan_number        = 'ABLFR5375B',
  cin               = 'ACO-8282',
  legal_type        = 'Partnership LLP',
  business_category = 'E-Bike Rental Service Provider',
  business_address  = '271, Shakti Khand-04, Indirapuram, Ghaziabad – 201014, Uttar Pradesh',
  contact_person    = 'Mukesh Kumar (Partner)',
  since_year        = 2026,
  partner_status    = 'ACTIVE',
  is_public         = true
WHERE owner_code = 'MG-OWN-REC5718'   -- update to actual owner_code if different
   OR (full_name ILIKE '%mukesh%' AND mobile_number LIKE '%5718');
