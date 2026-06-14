-- Migration 019: Driver GPS location columns
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS last_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS last_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_drivers_location ON public.drivers (last_lat, last_lng) WHERE last_lat IS NOT NULL;
