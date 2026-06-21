// apps/api/index.js — Bootstrap: secrets load BEFORE any require
const { loadSecrets } = require('./src/config/secrets');

async function bootstrap() {
  // FIRST: load from AWS Secrets Manager (prod) or .env (dev)
  await loadSecrets();

  // SECOND: validate all required keys — crash loudly if missing
  const REQUIRED = [
    'DATABASE_URL', 'JWT_SECRET', 'ADMIN_SECRET_KEY', 'ADMIN_PHONE',
  ];
  // Twilio only required when actually sending OTPs (NODE_ENV=production + DEV_BYPASS_OTP off)
  if (process.env.NODE_ENV === 'production' && process.env.DEV_BYPASS_OTP !== 'true') {
    REQUIRED.push('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM');
  }
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('FATAL: Missing required env vars:', missing.join(', '));
    process.exit(1);
  }

  // THIRD: run lightweight DB migrations (idempotent — safe to re-run)
  try {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false },connectionTimeoutMillis: 30000 });
    await pool.query(`
      ALTER TABLE public.owners
        ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) NOT NULL DEFAULT 'BOTH'
        CHECK (payment_mode IN ('CASH_ONLY','ONLINE_ONLY','BOTH'));
    `);
    await pool.end();
    console.log(JSON.stringify({ level: 'info', event: 'migration_ok', msg: 'owners.payment_mode ensured' }));
  } catch (e) {
    console.warn(JSON.stringify({ level: 'warn', event: 'migration_warn', msg: e.message }));
  }

  // FOURTH: only now import the app
  const app = require('./src/app');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(JSON.stringify({ level: 'info', event: 'server_start', port: PORT }))
  );
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
