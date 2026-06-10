-- MobilityGrid — Full Database Schema
-- Source: DevSpec v2.0 Part V §15 (2026-06-06)
-- Run against PostgreSQL 15+
-- Usage: psql -U postgres -d mobilitygrid_dev < docs/schema.sql

-- ── COMPANIES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_companies (
  id              SERIAL PRIMARY KEY,
  company_name    VARCHAR(200)  NOT NULL,
  company_code    VARCHAR(50)   NOT NULL UNIQUE,
  cin             VARCHAR(21),
  city            VARCHAR(100),
  company_status  VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                  CHECK (company_status IN ('ACTIVE','SUSPENDED','INACTIVE')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── OWNERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owners (
  id                       SERIAL PRIMARY KEY,
  company_id               INTEGER       NOT NULL REFERENCES client_companies(id),
  name                     VARCHAR(200)  NOT NULL,
  phone_number             VARCHAR(15)   NOT NULL UNIQUE,
  email                    VARCHAR(255),
  status                   VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                           CHECK (status IN ('ACTIVE','SUSPENDED','INACTIVE')),
  subscription_status      VARCHAR(20)   NOT NULL DEFAULT 'INACTIVE'
                           CHECK (subscription_status IN ('ACTIVE','INACTIVE','EXPIRED')),
  subscription_expires_at  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owners_company_id ON owners(company_id);
CREATE INDEX IF NOT EXISTS idx_owners_phone      ON owners(phone_number);

-- ── VEHICLES (defined before DRIVERS to allow FK) ─────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER        NOT NULL REFERENCES owners(id),
  company_id  INTEGER        NOT NULL REFERENCES client_companies(id),
  reg_number  VARCHAR(20)    NOT NULL UNIQUE,
  type        VARCHAR(50)    NOT NULL,      -- 'EV_AUTO', 'PETROL_AUTO', 'TRUCK', etc.
  model       VARCHAR(100),
  status      VARCHAR(30)    NOT NULL DEFAULT 'AVAILABLE'
              CHECK (status IN ('AVAILABLE','ASSIGNED','UNDER_MAINTENANCE','INACTIVE')),
  driver_id   INTEGER,                      -- FK added after DRIVERS table creation
  rent_type   VARCHAR(20)    NOT NULL DEFAULT 'DAILY'
              CHECK (rent_type IN ('DAILY','WEEKLY','MONTHLY','PER_KM')),
  daily_rent  DECIMAL(12,2)  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);

-- ── DRIVERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id                   SERIAL PRIMARY KEY,
  owner_id             INTEGER        NOT NULL REFERENCES owners(id),
  company_id           INTEGER        NOT NULL REFERENCES client_companies(id),
  name                 VARCHAR(200)   NOT NULL,
  phone_number         VARCHAR(15)    NOT NULL UNIQUE,
  emergency_contact    VARCHAR(15),
  assigned_vehicle_id  INTEGER        REFERENCES vehicles(id),
  wallet_balance       DECIMAL(12,2)  NOT NULL DEFAULT 0,
  status               VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
  kyc_status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                       CHECK (kyc_status IN ('PENDING','PARTIAL','APPROVED','REJECTED')),
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ    -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_drivers_owner_id   ON drivers(owner_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_phone      ON drivers(phone_number);
CREATE INDEX IF NOT EXISTS idx_drivers_active     ON drivers(owner_id) WHERE deleted_at IS NULL;

-- Add FK from vehicles.driver_id → drivers (circular ref resolved via deferred alter)
ALTER TABLE vehicles
  ADD CONSTRAINT fk_vehicles_driver
  FOREIGN KEY (driver_id) REFERENCES drivers(id);
-- Enforce one driver per vehicle at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_active_driver
  ON vehicles(driver_id) WHERE driver_id IS NOT NULL;

-- ── ASSIGNMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_vehicle_history (
  id                BIGSERIAL PRIMARY KEY,
  driver_id         INTEGER        NOT NULL REFERENCES drivers(id),
  vehicle_id        INTEGER        NOT NULL REFERENCES vehicles(id),
  owner_id          INTEGER        NOT NULL REFERENCES owners(id),
  assigned_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  unassigned_at     TIMESTAMPTZ,
  rent_type         VARCHAR(20)    NOT NULL,
  rent_amount       DECIMAL(12,2)  NOT NULL,
  deposit_amount    DECIMAL(12,2)  DEFAULT 0,
  reason            TEXT,
  incentive_applied BOOLEAN        NOT NULL DEFAULT FALSE,
  incentive_amount  DECIMAL(12,2)  DEFAULT 0,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dvh_driver_id  ON driver_vehicle_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_dvh_vehicle_id ON driver_vehicle_history(vehicle_id);
-- Enforce one open assignment per driver
CREATE UNIQUE INDEX IF NOT EXISTS idx_dvh_open_driver
  ON driver_vehicle_history(driver_id) WHERE unassigned_at IS NULL;
-- Enforce one open assignment per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS idx_dvh_open_vehicle
  ON driver_vehicle_history(vehicle_id) WHERE unassigned_at IS NULL;

-- ── PAYMENTS (IMMUTABLE — amounts never updated after INSERT) ─────────────────
CREATE TABLE IF NOT EXISTS ms_orders (
  id                 BIGSERIAL PRIMARY KEY,
  driver_id          INTEGER        NOT NULL REFERENCES drivers(id),
  owner_id           INTEGER        NOT NULL REFERENCES owners(id),
  amount             DECIMAL(12,2)  NOT NULL,
  payment_mode       VARCHAR(20)    NOT NULL DEFAULT 'ONLINE'
                     CHECK (payment_mode IN ('ONLINE','CASH','WALLET')),
  transaction_status VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                     CHECK (transaction_status IN ('PENDING','SUCCESS','FAILED','CANCELLED')),
  order_id           VARCHAR(100)   UNIQUE,   -- PayYantra order ID
  txn_id             VARCHAR(100),            -- PayYantra transaction ID
  payment_date       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ms_orders_driver_id  ON ms_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_ms_orders_owner_id   ON ms_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_ms_orders_created_at ON ms_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ms_orders_status     ON ms_orders(transaction_status);

-- ── DRIVER LEDGER (APPEND-ONLY — no UPDATEs, no DELETEs ever) ────────────────
CREATE TABLE IF NOT EXISTS driver_ledger (
  id            BIGSERIAL PRIMARY KEY,
  driver_id     INTEGER        NOT NULL REFERENCES drivers(id),
  owner_id      INTEGER        NOT NULL REFERENCES owners(id),
  entry_type    VARCHAR(30)    NOT NULL
                CHECK (entry_type IN (
                  'PAYMENT','CASH_PAYMENT','ADVANCE_CREDIT','REPAIR_CREDIT',
                  'DAMAGE_CHARGE','PENALTY','REFUND','DEPOSIT_CHARGE',
                  'INCENTIVE','DAILY_RENT'
                )),
  amount        DECIMAL(12,2)  NOT NULL CHECK (amount != 0),  -- positive=credit, negative=debit
  description   TEXT,
  balance_after DECIMAL(12,2)  NOT NULL,  -- snapshot of wallet after this entry
  created_by    INTEGER        REFERENCES owners(id),
  order_id      BIGINT         REFERENCES ms_orders(id),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_driver_id  ON driver_ledger(driver_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON driver_ledger(created_at DESC);

-- ── OTPs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
  id            SERIAL PRIMARY KEY,
  phone_number  VARCHAR(15)   NOT NULL,
  otp_hash      TEXT          NOT NULL,   -- bcrypt hash, never plaintext
  expires_at    TIMESTAMPTZ   NOT NULL,
  attempts      INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone_number);

-- ── KYC DOCUMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id               SERIAL PRIMARY KEY,
  entity_type      VARCHAR(20)  NOT NULL CHECK (entity_type IN ('driver','owner','vehicle')),
  entity_id        INTEGER      NOT NULL,
  doc_type         VARCHAR(50)  NOT NULL
                   CHECK (doc_type IN (
                     'aadhaar_front','aadhaar_back','pan','driving_licence',
                     'bank_account','rc','insurance','business_pan','gst'
                   )),
  s3_key           TEXT         NOT NULL,   -- {entity_type}/{entity_id}/{doc_type}/{uuid}.{ext}
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','under_review','approved','rejected')),
  rejection_reason TEXT,
  reviewed_by      INTEGER      REFERENCES owners(id),
  reviewed_at      TIMESTAMPTZ,
  uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, doc_type)  -- one doc per type per entity
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- ── MANAGERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS managers (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER       NOT NULL REFERENCES owners(id),
  name          VARCHAR(200)  NOT NULL,
  phone_number  VARCHAR(15)   NOT NULL UNIQUE,
  permissions   JSONB         NOT NULL DEFAULT '[]',
  status        VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managers_owner_id ON managers(owner_id);
CREATE INDEX IF NOT EXISTS idx_managers_phone    ON managers(phone_number);

-- ── INCENTIVE RULES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS owner_incentive_rules (
  id              SERIAL PRIMARY KEY,
  owner_id        INTEGER        NOT NULL REFERENCES owners(id) UNIQUE,
  min_hours       INTEGER        NOT NULL DEFAULT 10,
  incentive_type  VARCHAR(20)    NOT NULL
                  CHECK (incentive_type IN ('FULL_WAIVER','PERCENTAGE','FIXED')),
  incentive_value DECIMAL(12,2)  NOT NULL DEFAULT 0,
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             BIGSERIAL PRIMARY KEY,
  recipient_id   INTEGER      NOT NULL,
  recipient_role VARCHAR(20)  NOT NULL CHECK (recipient_role IN ('driver','owner','manager','admin')),
  type           VARCHAR(50)  NOT NULL,
  title          VARCHAR(200) NOT NULL,
  body           TEXT,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_unread    ON notifications(recipient_id) WHERE read_at IS NULL;

-- ── CHAT ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id             BIGSERIAL PRIMARY KEY,
  sender_id      INTEGER      NOT NULL,
  sender_role    VARCHAR(20)  NOT NULL,
  recipient_id   INTEGER      NOT NULL,
  recipient_role VARCHAR(20)  NOT NULL,
  body           TEXT         NOT NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat ON chat_messages(sender_id, recipient_id, created_at DESC);

-- ── SOS ALERTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sos_alerts (
  id          SERIAL PRIMARY KEY,
  driver_id   INTEGER        NOT NULL REFERENCES drivers(id),
  owner_id    INTEGER        NOT NULL REFERENCES owners(id),
  lat         DECIMAL(10,7),
  lng         DECIMAL(10,7),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_owner ON sos_alerts(owner_id) WHERE resolved_at IS NULL;

-- ── AUDIT LOG (APPEND-ONLY — all admin and financial actions) ─────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  actor_id     INTEGER      NOT NULL,
  actor_role   VARCHAR(20)  NOT NULL,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    INTEGER,
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- ── DEVICE TOKENS (FCM push — COM-02 / PAY-04) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL,
  user_role  VARCHAR(20)  NOT NULL CHECK (user_role IN ('driver','owner','manager')),
  fcm_token  TEXT         NOT NULL,
  platform   VARCHAR(20)  NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, user_role, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user
  ON public.device_tokens(user_id, user_role);
