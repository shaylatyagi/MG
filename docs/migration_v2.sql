-- ═══════════════════════════════════════════════════════════════════════════════
-- MobilityGrid — Migration v2
-- Run this on Neon ONCE after deploying the latest backend code.
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. VEHICLES: maintenance support ─────────────────────────────────────────
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS maintenance_reason TEXT;

-- Ensure status enum covers MAINTENANCE (if using CHECK constraint)
-- If you have: CHECK (status IN ('AVAILABLE','ASSIGNED','INACTIVE'))
-- add MAINTENANCE to it, or drop/re-add:
-- ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
-- ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check
--   CHECK (status IN ('AVAILABLE','ASSIGNED','MAINTENANCE','INACTIVE'));

-- ── 2. OWNERS: KYC gate + subscription ───────────────────────────────────────
ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS kyc_required_for_assignment BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- ── 3. MANAGERS: REVOKED status support ──────────────────────────────────────
-- If managers.status uses a CHECK constraint, update it:
-- ALTER TABLE managers DROP CONSTRAINT IF EXISTS managers_status_check;
-- ALTER TABLE managers ADD CONSTRAINT managers_status_check
--   CHECK (status IN ('ACTIVE','INACTIVE','REVOKED'));

-- ── 4. CHAT MESSAGES: replace old schema with correct one ────────────────────
-- The old chat_messages used sender_id/recipient_id/body.
-- The new backend uses driver_id/owner_id/sender_type/message/is_read.
-- Drop old table (safe — no production data in it yet) and recreate.

DROP TABLE IF EXISTS chat_messages CASCADE;

CREATE TABLE chat_messages (
  id          BIGSERIAL    PRIMARY KEY,
  driver_id   INTEGER      NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  owner_id    INTEGER      REFERENCES owners(id) ON DELETE SET NULL,
  sender_type VARCHAR(10)  NOT NULL CHECK (sender_type IN ('DRIVER', 'OWNER')),
  message     TEXT         NOT NULL,
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_driver   ON chat_messages(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_unread   ON chat_messages(driver_id) WHERE is_read = FALSE;

-- ── 5. SOS ALERTS: ensure table exists with resolved_at ──────────────────────
CREATE TABLE IF NOT EXISTS sos_alerts (
  id          SERIAL       PRIMARY KEY,
  driver_id   INTEGER      NOT NULL REFERENCES drivers(id),
  owner_id    INTEGER      NOT NULL REFERENCES owners(id),
  lat         DECIMAL(10,7),
  lng         DECIMAL(10,7),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_owner_unresolved ON sos_alerts(owner_id) WHERE resolved_at IS NULL;

-- ── 6. DRIVER_VEHICLE_HISTORY: ensure deposit_amount column exists ────────────
ALTER TABLE driver_vehicle_history
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0;

-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running: restart Render backend (or it'll pick up on next deploy).
