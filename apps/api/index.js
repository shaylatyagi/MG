// apps/api/index.js — Bootstrap: secrets load BEFORE any require
const { loadSecrets } = require('./src/config/secrets');

async function bootstrap() {
  // FIRST: load from AWS Secrets Manager (prod) or .env (dev)
  await loadSecrets();

  // SECOND: validate all required keys — crash loudly if missing
  const REQUIRED = [
    'DATABASE_URL', 'JWT_SECRET', 'ADMIN_SECRET_KEY', 'ADMIN_PHONE',
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM',
  ];
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('FATAL: Missing required env vars:', missing.join(', '));
    process.exit(1);
  }

  // THIRD: only now import the app
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
