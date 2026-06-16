/**
 * db.js — PostgreSQL connection pool
 *
 * Schema is managed exclusively via numbered migration files in /migrations.
 * Run `npm run migrate` to apply pending migrations before first start.
 * No inline DDL here — keeps startup fast and migrations auditable.
 */
const { Pool } = require('pg');
require('dotenv').config();

const logger = require('../utils/logger');

const POOL_CONFIG = {
  max: parseInt(process.env.DB_POOL_MAX || '4'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// SSL: Neon requires rejectUnauthorized:false on pooled endpoints.
// Set DB_SSL_REJECT_UNAUTHORIZED=true to enforce cert verification (e.g. AWS RDS).
const sslConfig = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
  : false;

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig, ...POOL_CONFIG });
} else {
  pool = new Pool({
    host:     process.env.PGHOST     || process.env.DB_HOST,
    port:     process.env.PGPORT     || process.env.DB_PORT || 5432,
    user:     process.env.PGUSER     || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    ssl: sslConfig,
    ...POOL_CONFIG,
  });
}

pool.connect()
  .then((client) => {
    logger.info('Database connected');
    client.release();
  })
  .catch((err) => {
    logger.error('Database connection FAILED', { error: err.message });
  });

module.exports = pool;
