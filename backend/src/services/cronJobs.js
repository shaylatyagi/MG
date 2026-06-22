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
      const rent      = parseFloat(row.daily_rent);
      const wallet    = parseFloat(row.wallet_balance);
      const deduction = Math.min(rent, Math.max(0, wallet));
      const dateStr   = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
      });

      try {
        await client.query('BEGIN');

        if (deduction > 0) {
          await client.query(
            `UPDATE public.drivers SET wallet_balance = wallet_balance - $1, updated_at = NOW() WHERE id = $2`,
            [deduction, row.driver_id]
          );
        }

        await client.query(
          `INSERT INTO public.driver_ledger (driver_id, owner_id, entry_type, amount, description, created_by)
           VALUES ($1, $2, 'RENT_CHARGE', $3, $4, 'SYSTEM')`,
          [row.driver_id, row.owner_id, rent, `Auto midnight rent ₹${rent} — ${row.vehicle_number} — ${dateStr}`]
        );

        if (deduction > 0) {
          await client.query(
            `INSERT INTO public.driver_ledger (driver_id, owner_id, entry_type, amount, description, created_by)
             VALUES ($1, $2, 'PAYMENT', $3, $4, 'SYSTEM')`,
            [row.driver_id, row.owner_id, deduction, `Wallet auto-deduction ₹${deduction} — ${row.vehicle_number} — ${dateStr}`]
          );
        }

        await client.query('COMMIT');
        processed++;
        logger.info(`CRON: rent ₹${rent} charged for ${row.full_name} — wallet deducted ₹${deduction}`);
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

// Schedule at 18:30 UTC = 00:00 IST daily
cron.schedule('15 17 * * *', runMidnightRentDeduction, { timezone: 'UTC' });

logger.info('CRON: midnight rent deduction scheduled (18:30 UTC = 00:00 IST)');

module.exports = { runMidnightRentDeduction };
