-- Run this in Neon SQL Editor ONCE
-- Fixes chat_messages table to match backend column expectations

DROP TABLE IF EXISTS public.chat_messages;

CREATE TABLE public.chat_messages (
  id             BIGSERIAL    PRIMARY KEY,
  sender_id      INTEGER      NOT NULL,
  sender_role    VARCHAR(20)  NOT NULL,   -- 'DRIVER' | 'OWNER'
  recipient_id   INTEGER      NOT NULL,
  recipient_role VARCHAR(20)  NOT NULL,   -- 'DRIVER' | 'OWNER'
  body           TEXT         NOT NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_by_driver ON public.chat_messages (sender_id, sender_role);
CREATE INDEX idx_chat_to_driver ON public.chat_messages (recipient_id, recipient_role);
