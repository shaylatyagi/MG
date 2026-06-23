-- Migration 030: Add metadata column to notifications for device/IP tracking
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;
