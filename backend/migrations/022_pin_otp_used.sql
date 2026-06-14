-- Migration 022: Track one-time PIN reset OTP usage
-- Once used, user must contact admin for future PIN resets

ALTER TABLE public.owners  ADD COLUMN IF NOT EXISTS pin_otp_used BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS pin_otp_used BOOLEAN NOT NULL DEFAULT false;
