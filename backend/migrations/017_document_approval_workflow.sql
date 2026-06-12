-- Migration 017: Document approval workflow
-- Adds rejection_reason + reviewed_at to user_documents
-- Migrates existing 'UPLOADED' status → 'PENDING'

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- All existing uploads become pending (awaiting admin review)
UPDATE public.user_documents
SET status = 'PENDING'
WHERE status = 'UPLOADED';
