-- Migration 025: vehicle_types lookup table + owners.plan column
-- vehicle_types: canonical list with numeric PK, code, label, category, is_ev flag
-- owners.plan: FREE or PAID plan tag (no feature gating, display only)

BEGIN;

-- 1. vehicle_types lookup table
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('EV','CNG','FUEL','OTHER')),
  is_ev      BOOLEAN NOT NULL DEFAULT false,
  icon       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with the 13 canonical types (matches frontend vehicleTypes.js)
INSERT INTO public.vehicle_types (id, code, label, category, is_ev, icon) VALUES
  (1,  'EV_2W',      'Electric 2-Wheeler',        'EV',    true,  '⚡🏍️'),
  (2,  'EV_3W',      'Electric Auto (E-Rickshaw)', 'EV',    true,  '⚡🛺'),
  (3,  'EV_4W',      'Electric Car',               'EV',    true,  '⚡🚗'),
  (4,  'EV_LCV',     'Electric Light CV / Van',    'EV',    true,  '⚡🚐'),
  (5,  'EV_HCV',     'Electric Heavy CV / Truck',  'EV',    true,  '⚡🚛'),
  (6,  'CNG_AUTO',   'CNG Auto',                   'CNG',   false, '🟢🛺'),
  (7,  'CNG_CAR',    'CNG Car',                    'CNG',   false, '🟢🚗'),
  (8,  'CNG_BUS',    'CNG Bus / Mini-bus',         'CNG',   false, '🟢🚌'),
  (9,  'PETROL_2W',  'Petrol 2-Wheeler',           'FUEL',  false, '⛽🏍️'),
  (10, 'PETROL_CAR', 'Petrol Car',                 'FUEL',  false, '⛽🚗'),
  (11, 'DIESEL_LCV', 'Diesel Truck / LCV',         'FUEL',  false, '⛽🚛'),
  (12, 'DIESEL_BUS', 'Diesel Bus',                 'FUEL',  false, '⛽🚌'),
  (13, 'OTHER',      'Other',                      'OTHER', false, '🚘')
ON CONFLICT (id) DO NOTHING;

-- Keep SERIAL sequence in sync after manual id inserts
SELECT setval('public.vehicle_types_id_seq', 13, true);

-- 2. owners.plan column — FREE / PAID label (no feature gating)
ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'FREE'
    CHECK (plan IN ('FREE','PAID'));

COMMIT;
