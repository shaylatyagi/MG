/**
 * rls.middleware.js — Row-Level Security context setter
 *
 * Sets PostgreSQL session-level parameters so that RLS policies on
 * public.drivers and public.vehicles can filter by company.
 *
 * How it works:
 *   1. verifyToken runs first, populates req.user
 *   2. This middleware opens a client from the pool, runs:
 *        SET LOCAL app.current_company_id = '<id>'
 *        SET LOCAL app.bypass_rls = 'false'
 *      then attaches the client to req.dbClient
 *   3. Route handlers use req.dbClient (not pool.query) for tenant-scoped queries
 *   4. afterResponse() releases the client back to the pool
 *
 * For admin routes that need unrestricted access, use bypassRls middleware instead.
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Tenant-scoped DB client — attaches req.dbClient with RLS context set.
 * Must be used AFTER verifyToken.
 */
const withRls = async (req, res, next) => {
  // Only apply when we have a resolved user with a company_id
  const companyId = req.user?.company_id;
  if (!companyId) return next();   // no company context — skip (e.g. first-login flows)

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_company_id = $1`, [String(companyId)]);
    await client.query(`SET LOCAL app.bypass_rls = 'false'`);

    req.dbClient = client;

    // Release client after response finishes
    const release = () => {
      if (client) {
        client.query('COMMIT').catch(() => {}).finally(() => {
          client.release();
          client = null;
        });
      }
    };
    res.on('finish',  release);
    res.on('close',   release);

    next();
  } catch (err) {
    if (client) { client.release(); client = null; }
    logger.error('RLS middleware failed', { error: err.message });
    next(err);
  }
};

/**
 * Admin bypass — sets bypass_rls=true so admin routes see all rows.
 * Must be used AFTER verifyAdmin.
 */
const bypassRls = async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.bypass_rls = 'true'`);

    req.dbClient = client;

    const release = () => {
      if (client) {
        client.query('COMMIT').catch(() => {}).finally(() => {
          client.release();
          client = null;
        });
      }
    };
    res.on('finish', release);
    res.on('close',  release);

    next();
  } catch (err) {
    if (client) { client.release(); client = null; }
    logger.error('bypassRls middleware failed', { error: err.message });
    next(err);
  }
};

module.exports = { withRls, bypassRls };
