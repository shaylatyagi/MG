-- ADM-06: Admin Audit Log
-- Run once on Neon (or any PostgreSQL) before deploying audit log feature.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT        NOT NULL,        -- e.g. 'KYC_APPROVED', 'KYC_REJECTED', 'COMPANY_STATUS_CHANGED'
  entity_type TEXT        NOT NULL,        -- 'driver', 'manager', 'company'
  entity_id   TEXT,                        -- ID of the affected row
  performed_by TEXT,                       -- Admin identifier (phone or 'system')
  details     JSONB,                       -- Extra context (reason, old_status, new_status, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity   ON public.admin_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action    ON public.admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON public.admin_audit_log (created_at DESC);
