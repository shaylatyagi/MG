-- Migration 021: PIN-based login for owners and drivers
-- Initial PIN set by admin, user can change after first login

ALTER TABLE public.owners
  ADD COLUMN IF NOT EXISTS pin_hash       TEXT,
  ADD COLUMN IF NOT EXISTS pin_set_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_must_change BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS pin_hash       TEXT,
  ADD COLUMN IF NOT EXISTS pin_set_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pin_must_change BOOLEAN NOT NULL DEFAULT true;
