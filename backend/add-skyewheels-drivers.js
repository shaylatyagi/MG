/**
 * add-skyewheels-drivers.js
 * Adds Skyewheels drivers + vehicles under Ashish Yadav's owner account.
 *
 * Run from backend directory:
 *   node add-skyewheels-drivers.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const OWNER_PHONE = '9717671891'; // Ashish Yadav

const DRIVERS = [
  {
    full_name:      'Gurbaksh',
    mobile_number:  '7042532074',
    address:        'Patel Nagar, Delhi',
    vehicle_number: 'SKYW-0040',
    vin:            'SKYEWHEELS2026001',
    onboarded:      '2026-03-16',
    daily_rent:     222,
  },
  {
    full_name:      'Annad Bisht',
    mobile_number:  '9873133787',
    address:        'Kanhaiya Nagar, Delhi',
    vehicle_number: 'SKYW-0036',
    vin:            'SKYEWHEELS2026003',
    onboarded:      '2026-03-16',
    daily_rent:     222,
  },
  {
    full_name:      'Aditya Tiwari',
    mobile_number:  '8054347764',
    address:        'Karam Pura, Delhi',
    vehicle_number: 'SKYEV-0061',
    vin:            'SKYEWHEELS2026009',
    onboarded:      '2026-04-04',
    daily_rent:     222,
  },
  {
    full_name:      'Mohammad Kadir',
    mobile_number:  '9779434195',
    address:        'West Patel Nagar, Delhi',
    vehicle_number: 'SKYEV-0062',
    vin:            'SKYEWHEELS2026008',
    onboarded:      '2026-04-06',
    daily_rent:     222,
  },
];

async function main() {
  const client = await pool.connect();
  console.log('✅ DB connected\n');

  try {
    // 1. Find owner
    const ownerRes = await client.query(
      `SELECT id, owner_code, full_name FROM public.owners WHERE mobile_number = $1 LIMIT 1`,
      [OWNER_PHONE]
    );

    if (!ownerRes.rows[0]) {
      console.error(`❌ Owner with phone ${OWNER_PHONE} not found. Create Ashish's account first.`);
      return;
    }

    const owner = ownerRes.rows[0];
    console.log(`👤 Owner: ${owner.full_name} | ID: ${owner.id} | Code: ${owner.owner_code}\n`);

    // 2. Add each driver + vehicle
    for (const d of DRIVERS) {
      await client.query('BEGIN');
      try {
        // Check driver
        const existingDriver = await client.query(
          `SELECT id FROM public.drivers WHERE mobile_number = $1`, [d.mobile_number]
        );
        if (existingDriver.rows[0]) {
          console.log(`⚠️  Driver ${d.full_name} (${d.mobile_number}) already exists — skipping`);
          await client.query('ROLLBACK');
          continue;
        }

        // Insert driver
        const driverCode = 'DRV' + Date.now().toString().slice(-5) + Math.random().toString(36).substr(2, 3).toUpperCase();
        const driverRes = await client.query(
          `INSERT INTO public.drivers
            (full_name, mobile_number, owner_code, driver_code, wallet_balance, status, created_at)
           VALUES ($1, $2, $3, $4, 0, 'ACTIVE', $5)
           RETURNING id, driver_code`,
          [d.full_name, d.mobile_number, owner.owner_code, driverCode, d.onboarded]
        );
        const driverId = driverRes.rows[0].id;

        // Check vehicle
        const existingVeh = await client.query(
          `SELECT id FROM public.vehicles WHERE vehicle_number = $1`, [d.vehicle_number]
        );

        let vehicleId;
        if (existingVeh.rows[0]) {
          vehicleId = existingVeh.rows[0].id;
          await client.query(
            `UPDATE public.vehicles
             SET driver_id = $1, driver_name = $2, driver_phone = $3, status = 'ASSIGNED'
             WHERE id = $4`,
            [driverId, d.full_name, d.mobile_number, vehicleId]
          );
          console.log(`  🔗 Vehicle ${d.vehicle_number} already existed — assigned to driver`);
        } else {
          const vehRes = await client.query(
            `INSERT INTO public.vehicles
              (vehicle_number, vehicle_model, daily_rent, owner_id, driver_id,
               driver_name, driver_phone, status, chassis_number, created_at)
             VALUES ($1, 'Electric Scooter', $2, $3, $4, $5, $6, 'ASSIGNED', $7, $8)
             RETURNING id`,
            [d.vehicle_number, d.daily_rent, owner.id, driverId,
             d.full_name, d.mobile_number, d.vin, d.onboarded]
          );
          vehicleId = vehRes.rows[0].id;
        }

        // Link vehicle back to driver
        await client.query(
          `UPDATE public.drivers SET assigned_vehicle_id = $1 WHERE id = $2`,
          [vehicleId, driverId]
        );

        await client.query('COMMIT');
        console.log(`✅ ${d.full_name} | ${d.mobile_number} | ${d.vehicle_number} — added`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ ${d.full_name}: ${err.message}`);
      }
    }

    console.log('\n🎉 Done! Check the owner dashboard at mobilitygrid.in/owner/dashboard');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
