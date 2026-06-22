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
// Midnight rent deduction
// Cron: "0 0 * * *" = 00:00 server time
// Render servers run UTC, so we fire at 18:30 UTC = 00:00 IST
// ─────────────────────────────────────────────────────────────────────────────
cron.schedule('30 18 * * *', async () => {
  logger.info('CRON: midnight rent deduction — starting');
  const client = await pool.connect();
  let processed = 0, skipped = 0, errors = 0;

  try {
    // Find all drivers who currently have a vehicle assigned to them
    // and whose vehicle has daily_rent > 0
    const { rows: drivers } = await client.query(`
      SELECT
        d.id            AS driver_id,
        d.full_name,
        d.owner_code,
        COALESCE(d.wallet_balance, 0)  AS wallet_balance,
        v.id            AS vehicle_id,
        v.vehicle_number,
        COALESCE(v.daily_rent, 0)      AS daily_rent
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.deleted_at IS NULL
        AND v.driver_id IS NOT NULL
        AND COALESCE(v.daily_rent, 0) > 0
    `);

    logger.info(`CRON: found ${drivers.length} assigned drivers to process`);

    for (const row of drivers) {
      const rent   = parseFloat(row.daily_rent);
      const wallet = parseFloat(row.wallet_balance);
      const deduction = Math.min(rent, Math.max(0, wallet)); // deduct only what's available
      const dateStr   = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
      });

      try {
        await client.query('BEGIN');

        // 1. Deduct from wallet only if wallet > 0
        if (deduction > 0) {
          await client.query(
            `UPDATE public.drivers
             SET wallet_balance = wallet_balance - $1,
                 updated_at     = NOW()
             WHERE id = $2`,
            [deduction, row.driver_id]
          );
        }

        // 2. Always record RENT_CHARGE in driver_ledger (full rent amount)
        //    even if wallet was 0 — this is what drives outstanding balance
        await client.query(
          `INSERT INTO public.driver_ledger
             (driver_id, owner_id, entry_type, amount, description, created_by)
           SELECT $1, o.id, 'RENT_CHARGE', $2, $3, 'SYSTEM'
           FROM public.owners o
           WHERE o.owner_code = $4
           LIMIT 1`,
          [
            row.driver_id,
            rent,
            `Auto midnight rent ₹${rent} — ${row.vehicle_number} — ${dateStr}`,
            row.owner_code,
          ]
        );

        // 3. If wallet partially covered the rent, also record PAYMENT for that portion
        if (deduction > 0) {
          await client.query(
            `INSERT INTO public.driver_ledger
               (driver_id, owner_id, entry_type, amount, description, created_by)
             SELECT $1, o.id, 'PAYMENT', $2, $3, 'SYSTEM'
             FROM public.owners o
             WHERE o.owner_code = $4
             LIMIT 1`,
            [
              row.driver_id,
              deduction,
              `Wallet auto-deduction ₹${deduction} — ${row.vehicle_number} — ${dateStr}`,
              row.owner_code,
            ]
          );
        }

        await client.query('COMMIT');
        processed++;
        logger.info(`CRON: rent ₹${rent} charged for ${row.full_name} — wallet deducted ₹${deduction}`);
      } catch (txErr) {
        await client.query('ROLLBACK');
        errors++;
        logger.error(`CRON: failed to process rent for driver ${row.driver_id}`, {
          error: txErr.message,
        });
      }
    }

    logger.info(`CRON: midnight rent done — processed=${processed} skipped=${skipped} errors=${errors}`);
  } catch (err) {
    logger.error('CRON: midnight rent deduction fatal error', { error: err.message });
  } finally {
    client.release();
  }
}, {
  timezone: 'UTC', // cron expression is in UTC (18:30 UTC = midnight IST)
});

logger.info('CRON: midnight rent deduction scheduled (18:30 UTC = 00:00 IST)');
