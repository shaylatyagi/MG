/**
 * Daily Rent Scheduler Service
 * Register in index.js: require('./src/services/scheduler.service')
 * Runs at midnight IST (18:30 UTC) every day via node-cron.
 */

const cron = require('node-cron');
const pool = require('../config/db');

const generateDailyRentEntries = async () => {
  console.log('Generating daily rent entries...');
  let count = 0;
  let errors = 0;

  try {
    // Uses live column names: full_name, reg_number (not name/vehicle_number)
    const { rows: drivers } = await pool.query(`
      SELECT d.id, d.full_name, v.daily_rent, v.reg_number
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.status = 'ACTIVE' AND v.driver_id IS NOT NULL
    `);

    for (const driver of drivers) {
      try {
        // Idempotency check using correct entry_type from schema CHECK constraint
        const { rows: existing } = await pool.query(`
          SELECT id FROM public.driver_ledger
          WHERE driver_id = $1
            AND entry_type = 'RENT_CHARGE'
            AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
        `, [driver.id]);

        if (existing.length > 0) continue;

        const rentAmount = parseFloat(driver.daily_rent) || 0;
        if (rentAmount <= 0) continue;

        // Must provide balance_after (NOT NULL in schema)
        const { rows: balRow } = await pool.query(
          'SELECT wallet_balance FROM public.drivers WHERE id = $1',
          [driver.id]
        );
        const currentBalance = parseFloat(balRow[0]?.wallet_balance || 0);
        const balanceAfter = parseFloat((currentBalance - rentAmount).toFixed(2));

        // created_by is NULL for system actions (FK refs owners.id, not a string)
        await pool.query(`
          INSERT INTO public.driver_ledger
            (driver_id, entry_type, amount, description, balance_after, created_by)
          VALUES ($1, 'RENT_CHARGE', $2, $3, $4, NULL)
        `, [
          driver.id,
          rentAmount,
          'Daily rent - ' + driver.reg_number + ' - ' + new Date().toLocaleDateString('en-IN'),
          balanceAfter,
        ]);

        // Deduct from driver wallet
        await pool.query(
          'UPDATE public.drivers SET wallet_balance = $1 WHERE id = $2',
          [balanceAfter, driver.id]
        );

        count++;
      } catch (driverErr) {
        console.error('Daily rent failed for driver ' + driver.id + ':', driverErr.message);
        errors++;
      }
    }

    console.log('Daily rent done - ' + count + ' entries created, ' + errors + ' errors');
  } catch (err) {
    console.error('Daily rent scheduler fatal error:', err.message);
  }
};

// 00:00 IST = 18:30 UTC
cron.schedule('30 18 * * *', generateDailyRentEntries, { timezone: 'UTC' });

console.log('Daily rent scheduler registered (runs 00:00 IST / 18:30 UTC)');

module.exports = { generateDailyRentEntries };
