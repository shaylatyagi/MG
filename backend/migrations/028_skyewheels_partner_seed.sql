-- Migration 028: Seed SKYEWHEELS partner profile
-- Source: PY MAF Ver3.0.xlsx + Merchant Agreement June 2026
-- Contact: Ashish Yadav | 9717671891 | SKYEWHEELS@GMAIL.COM

UPDATE public.owners SET
  partner_slug      = 'skyewheels',
  brand_name        = 'Skye Wheels',
  tagline           = 'EV Rental & Fleet Operations · Uttam Nagar, New Delhi',
  about             = 'Skye Wheels (SKYEWHEELS) is a Delhi-based electric vehicle rental platform operating out of Uttam Nagar. They supply EVs to delivery and ride-sharing drivers under a recurring weekly rental model — giving drivers an affordable, eco-friendly way to work without the burden of ownership. Onboarded on MobilityGrid for digital rent collection, driver KYC, and fleet tracking.',
  gst_number        = '07AFTFS7550R1ZR',
  pan_number        = 'AFTFS7550R',
  cin               = NULL,
  legal_type        = 'Proprietorship',
  business_category = 'Vehicle Rental and Leasing',
  business_address  = 'F-22, Om Vihar Extension, Gali No. 4, Uttam Nagar, New Delhi – 110059',
  website           = NULL,
  contact_person    = 'Ashish Yadav (Authorised Signatory)',
  since_year        = 2025,
  partner_status    = 'ACTIVE',
  is_public         = true
WHERE mobile_number = '9717671891'
   OR mobile_number = '09717671891';
