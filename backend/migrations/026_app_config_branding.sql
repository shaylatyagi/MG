-- Migration 026: app_config table for dynamic branding / logo URLs
-- Logos are stored on S3 and URLs are managed here.
-- To update a logo: UPDATE app_config SET value = 'new-s3-url' WHERE key = 'logo_cyan';

CREATE TABLE IF NOT EXISTS public.app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default logo keys (values will be set to real S3 URLs by admin)
INSERT INTO public.app_config (key, value) VALUES
  ('logo_cyan',  NULL),   -- Dark navy bg + cyan logo (primary)
  ('logo_white', NULL),   -- Black bg + white logo (for dark overlays)
  ('logo_icon',  NULL)    -- Icon only (square, no text) — optional
ON CONFLICT (key) DO NOTHING;
