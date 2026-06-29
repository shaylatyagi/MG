/**
 * cronJobs.js — Scheduled background tasks
 *
 * Registered once at startup in app.js via:
 *   require('./services/cronJobs');
 *
 * Tasks:
 *   1. Midnight rent deduction — at 00:00 IST every day, deduct daily_rent
 *      from wallet_balance for every driver who has an assigned vehicle.
 *      Skips drivers whose wallet is already 0 or vehicle has rent = 0.
 */

const cron   = require('node-cron');
const pool   = require('../config/db');
const logger = require('../utils/logger');
const fcm = require('./fcm');
// ─────────────────────────────────────────────────────────────────────────────
// Core rent deduction logic — exported so admin can trigger manually for testing
// ─────────────────────────────────────────────────────────────────────────────
async function runMidnightRentDeduction() {
  logger.info('CRON: midnight rent deduction — starting');
  const client = await pool.connect();
  let processed = 0, skipped = 0, errors = 0;

  try {
    const { rows: drivers } = await client.query(`
      SELECT
        d.id            AS driver_id,
        d.full_name,
        d.owner_id,
        COALESCE(d.wallet_balance, 0)  AS wallet_balance,
        v.id            AS vehicle_id,
        v.vehicle_number,
        COALESCE(v.daily_rent, 0)      AS daily_rent
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.deleted_at IS NULL
        AND v.driver_id IS NOT NULL
        AND COALESCE(v.daily_rent, 0) > 0
        AND d.owner_id IS NOT NULL
    `);

    logger.info(`CRON: found ${drivers.length} assigned drivers to process`);

    for (const row of drivers) {
      const rent    = parseFloat(row.daily_rent);
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
      });

      try {
        await client.query('BEGIN');

        // Only record RENT_CHARGE — wallet deduction happens when driver pays manually
        await client.query(
          `INSERT INTO public.driver_ledger (driver_id, owner_id, entry_type, amount, description, created_by)
           VALUES ($1, $2, 'RENT_CHARGE', $3, $4, 'SYSTEM')`,
          [row.driver_id, row.owner_id, rent, `Daily rent ₹${rent} — ${row.vehicle_number} — ${dateStr}`]
        );

        await client.query('COMMIT');
        processed++;
        logger.info(`CRON: rent ₹${rent} charged for ${row.full_name}`);
      } catch (txErr) {
        await client.query('ROLLBACK');
        errors++;
        logger.error(`CRON: failed for driver ${row.driver_id}`, { error: txErr.message });
      }
    }

    logger.info(`CRON: done — processed=${processed} skipped=${skipped} errors=${errors}`);
    return { processed, skipped, errors, total: drivers.length };
  } catch (err) {
    logger.error('CRON: fatal error', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}
// ─── 12AM IST — Driver reminder notification ───────────────────────────────
async function sendMidnightDriverReminders() {
  logger.info('CRON: midnight driver reminders — starting');
  try {
    const { rows: drivers } = await pool.query(`
      SELECT d.id, d.full_name, COALESCE(v.daily_rent, 0) AS daily_rent
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.deleted_at IS NULL
        AND v.driver_id IS NOT NULL
        AND d.owner_id IS NOT NULL
    `);

    logger.info(`CRON: sending midnight reminders to ${drivers.length} drivers`);

    for (const driver of drivers) {
      try {
        await fcm.sendToUser(
          pool,
          driver.id,
          'driver',
          '🌙 Nayi Shuruat!',
          `Aaj ka din accha ho. Aapka daily rent ₹${driver.daily_rent} hai. Safe drive karo! 🚗`
        );
      } catch (e) {
        // silent — one driver failure shouldn't stop others
      }
    }

    logger.info('CRON: midnight reminders done');
  } catch (err) {
    logger.error('CRON: midnight reminder error', { error: err.message });
  }
}

// 00:00 IST = 18:30 UTC
cron.schedule('30 18 * * *', sendMidnightDriverReminders, { timezone: 'UTC' });
logger.info('CRON: midnight driver reminder scheduled (00:00 IST)');
module.exports = { runMidnightRentDeduction };
