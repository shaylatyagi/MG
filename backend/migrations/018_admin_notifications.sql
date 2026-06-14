-- Migration 018: Ensure notifications table supports admin notifications
-- Run on Neon DB before deploying this release

-- Make driver_id nullable so admin notifications don't need a driver
ALTER TABLE public.notifications
  ALTER COLUMN driver_id DROP NOT NULL;

-- Add is_read if missing (some older schemas may not have it)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add user_type if missing
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(20);

-- Add title if missing (some schemas use different column names)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Add message if missing
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message TEXT;
