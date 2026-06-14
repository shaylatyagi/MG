-- Migration 020: WebAuthn Passkeys (biometric / face ID / device PIN login)

-- Stores registered passkey credentials per user
CREATE TABLE IF NOT EXISTS public.passkeys (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER       NOT NULL,
  user_type       VARCHAR(10)   NOT NULL CHECK (user_type IN ('DRIVER', 'OWNER')),
  credential_id   TEXT          NOT NULL UNIQUE,   -- base64url encoded
  public_key      BYTEA         NOT NULL,           -- COSE public key bytes
  counter         BIGINT        NOT NULL DEFAULT 0, -- replay attack prevention
  device_type     VARCHAR(32),                      -- 'singleDevice' | 'multiDevice'
  backed_up       BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user       ON public.passkeys (user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential ON public.passkeys (credential_id);

-- Temporary challenge storage (expires in 5 min)
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id          SERIAL PRIMARY KEY,
  identifier  VARCHAR(30)   NOT NULL,   -- phone number
  user_type   VARCHAR(10),
  challenge   TEXT          NOT NULL,
  expires_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wac_identifier ON public.webauthn_challenges (identifier);
