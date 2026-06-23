-- Migration 029: Multi-admin support
-- Creates an admins table so multiple admin users can log in via OTP.
-- The existing ADMIN_PHONE env var continues to work as a fallback.

CREATE TABLE IF NOT EXISTS public.admins (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  phone_number VARCHAR(15)  UNIQUE NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed: Ankit
INSERT INTO public.admins (name, phone_number)
VALUES ('Ankit', '9217352864')
ON CONFLICT (phone_number) DO NOTHING;
