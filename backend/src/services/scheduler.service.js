/**
 * Daily Rent Scheduler Service
 * backend/src/services/scheduler.service.js
 * 
 * Register in index.js: require('./src/services/scheduler.service')
 */

const pool = require('../config/db');

const generateDailyRentEntries = async () => {
  try {
    console.log('🔄 Generating daily rent entries...');
    const drivers = await pool.query(`
      SELECT d.id, d.full_name, v.daily_rent, v.vehicle_number
      FROM public.drivers d
      JOIN public.vehicles v ON v.driver_id = d.id
      WHERE d.status = 'ACTIVE' AND v.status = 'ASSIGNED'
    `);

    let count = 0;
    for (const driver of drivers.rows) {
      const existing = await pool.query(`
        SELECT id FROM public.driver_ledger
        WHERE driver_id = $1 AND entry_type = 'RENT_CHARGE' AND DATE(created_at) = CURRENT_DATE
      `, [driver.id]);

      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO public.driver_ledger (driver_id, entry_type, amount, description, created_by)
          VALUES ($1, 'RENT_CHARGE', $2, $3, 'SYSTEM')
        `, [driver.id, parseFloat(driver.daily_rent),
            `Daily rent - ${driver.vehicle_number} - ${new Date().toLocaleDateString('en-IN')}`]);
        count++;
      }
    }
    console.log(`✅ Daily rent generated for ${count} drivers`);
  } catch(err) {
    console.error('Daily rent scheduler error:', err.message);
  }
};

// Schedule at midnight
const midnight = new Date();
midnight.setHours(24, 0, 0, 0);
const msUntilMidnight = midnight - new Date();

setTimeout(() => {
  generateDailyRentEntries();
  setInterval(generateDailyRentEntries, 24 * 60 * 60 * 1000);
}, msUntilMidnight);

console.log('⏰ Daily rent scheduler set');

module.exports = { generateDailyRentEntries };