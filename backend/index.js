require('dotenv').config();

// ── Startup env guard — fail fast, never silently use weak defaults ────────────
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'ADMIN_SECRET_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  console.error('Set them in Render → Environment before deploying.');
  process.exit(1);
}

// ── Connect DB + run migration 023 ────────────────────────────────────────────
require('./src/config/db');
require('./src/services/scheduler.service');
const pool = require('./src/config/db');
const fs   = require('fs');
const path = require('path');

const migrationSql = fs.readFileSync(
  path.join(__dirname, 'migrations', '023_startup_schema.sql'),
  'utf8'
);
pool.query(migrationSql)
  .then(() => console.log('✅ Migration 023 applied'))
  .catch(err => console.warn('⚠️  Migration 023 warning:', err.message));

// ── Authenticated drivers list (was public — fixed C-1) ───────────────────────
// Wired after app is created so it uses the same app instance
const app = require('./src/app');

app.get('/api/drivers/list', require('./src/middleware/auth.middleware').verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, mobile_number, driver_code
       FROM public.drivers WHERE status = 'ACTIVE' ORDER BY full_name`
    );
    res.json({ drivers: result.rows, success: true });
  } catch (err) {
    res.status(500).json({ drivers: [], success: false, error: err.message });
  }
});

// ── SERVER START ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
