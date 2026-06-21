// apps/api/src/config/db.js — pg pool, no ORM (ADR-004)
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error(JSON.stringify({ level: 'error', event: 'pg_pool_error', message: err.message }));
});

module.exports = pool;
