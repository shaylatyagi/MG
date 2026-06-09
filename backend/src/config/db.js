const { Pool } = require('pg');
require('dotenv').config();

console.log('🔄 DB Connection Starting...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

let pool;

if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
} else {
  console.log('⚠️ Using individual PG variables');
  pool = new Pool({
    host: process.env.PGHOST || process.env.DB_HOST,
    port: process.env.PGPORT || process.env.DB_PORT || 5432,
    user: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Test connection + auto-migrate chat_messages table
pool.connect()
  .then(async (client) => {
    console.log('✅ Database connected successfully to Neon.tech');
    client.release();

    // Auto-migrate chat_messages: drop+recreate if it has old column schema
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name   = 'chat_messages'
            AND column_name  = 'sender_id'
        ) THEN
          DROP TABLE IF EXISTS public.chat_messages;
          CREATE TABLE public.chat_messages (
            id             BIGSERIAL    PRIMARY KEY,
            sender_id      INTEGER      NOT NULL,
            sender_role    VARCHAR(20)  NOT NULL,
            recipient_id   INTEGER      NOT NULL,
            recipient_role VARCHAR(20)  NOT NULL,
            body           TEXT         NOT NULL,
            read_at        TIMESTAMPTZ,
            created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_chat_by_driver
            ON public.chat_messages (sender_id, sender_role);
          CREATE INDEX IF NOT EXISTS idx_chat_to_driver
            ON public.chat_messages (recipient_id, recipient_role);
          RAISE NOTICE 'chat_messages table migrated to new schema';
        END IF;
      END $$;
    `).then(() => console.log('✅ chat_messages schema OK'))
      .catch(e  => console.warn('⚠️  chat migration skipped:', e.message));

    // Auto-add status + message columns to sos_alerts if missing
    await pool.query(`
      ALTER TABLE public.sos_alerts
        ADD COLUMN IF NOT EXISTS status  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS message TEXT;
    `).then(() => console.log('✅ sos_alerts columns OK'))
      .catch(e  => console.warn('⚠️  sos_alerts migration skipped:', e.message));
  })
  .catch(err => {
    console.error('❌ Database connection FAILED:', err.message);
  });

module.exports = pool;