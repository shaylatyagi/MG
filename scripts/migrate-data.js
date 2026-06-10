// scripts/migrate-data.js
// Migrates data from old Neon DB (backend/) to new Neon DB (apps/api/)
// Usage: node scripts/migrate-data.js OLD_DB_URL NEW_DB_URL
'use strict';

const { Client } = require('pg');

const OLD_URL = process.argv[2];
const NEW_URL = process.argv[3];

if (!OLD_URL || !NEW_URL) {
  console.error('Usage: node scripts/migrate-data.js OLD_DB_URL NEW_DB_URL');
  process.exit(1);
}

async function migrate() {
  const old = new Client({ connectionString: OLD_URL, ssl: { rejectUnauthorized: false } });
  const nw  = new Client({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false } });

  await old.connect();
  await nw.connect();
  console.log('Connected to both DBs');

  // ── 1. COMPANIES ─────────────────────────────────────────────
  console.log('\n[1/5] Migrating companies...');
  const companies = await old.query(`
    SELECT id, name AS company_name, company_code, cin, city, status, created_at
    FROM public.companies ORDER BY id
  `);

  for (const c of companies.rows) {
    const companyStatus = ['ACTIVE','SUSPENDED','INACTIVE'].includes(c.status) ? c.status : 'ACTIVE';
    await nw.query(`
      INSERT INTO client_companies (id, company_name, company_code, cin, city, company_status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO NOTHING
    `, [c.id, c.company_name, c.company_code || 'CO' + c.id, c.cin, c.city,
        companyStatus, c.created_at]);
  }
  // Sync sequence
  await nw.query(`SELECT setval('client_companies_id_seq', (SELECT MAX(id) FROM client_companies))`);
  console.log(`  ✓ ${companies.rows.length} companies`);

  // ── 2. OWNERS ────────────────────────────────────────────────
  console.log('[2/5] Migrating owners...');
  const owners = await old.query(`SELECT * FROM public.owners ORDER BY id`);
  if (owners.rows.length > 0) {
    console.log(`  [debug] owner columns: ${Object.keys(owners.rows[0]).join(', ')}`);
  }

  for (const o of owners.rows) {
    const ownerStatus = ['ACTIVE','SUSPENDED','INACTIVE'].includes(o.status) ? o.status : 'ACTIVE';
    await nw.query(`
      INSERT INTO owners (id, company_id, name, phone_number, email, status,
                          subscription_status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7)
      ON CONFLICT (id) DO NOTHING
    `, [o.id, o.company_id, o.full_name, o.mobile_number, o.email,
        ownerStatus, o.created_at]);
  }
  await nw.query(`SELECT setval('owners_id_seq', (SELECT MAX(id) FROM owners))`);
  console.log(`  ✓ ${owners.rows.length} owners`);

  // ── 3. VEHICLES (before drivers for FK) ──────────────────────
  console.log('[3/5] Migrating vehicles...');
  // id → {id, company_id}, also owner_code → {id, company_id}
  const ownerCompanyMap  = {};   // owner.id → company_id
  const ownerByCode      = {};   // owner_code → owner row
  for (const o of owners.rows) {
    ownerCompanyMap[o.id] = o.company_id;
    if (o.owner_code) ownerByCode[o.owner_code] = o;
  }

  const vehicles = await old.query(`SELECT * FROM public.vehicles ORDER BY id`);

  if (vehicles.rows.length > 0) {
    console.log(`  [debug] vehicle columns: ${Object.keys(vehicles.rows[0]).join(', ')}`);
  }

  for (const v of vehicles.rows) {
    const regNum = v.vehicle_number || v.reg_number || v.registration_number || ('VH-' + v.id);
    const rawStatus = v.operational_status || v.status || '';
    const vStatus = ['AVAILABLE','ASSIGNED','UNDER_MAINTENANCE','INACTIVE'].includes(rawStatus) ? rawStatus : 'AVAILABLE';
    const vType   = v.vehicle_type || v.type || 'AUTO';
    const vModel  = v.vehicle_model || v.model || null;
    await nw.query(`
      INSERT INTO vehicles (id, owner_id, company_id, reg_number, type, model, status,
                            rent_type, daily_rent, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO NOTHING
    `, [v.id, v.owner_id, ownerCompanyMap[v.owner_id] || 1,
        regNum, vType, vModel,
        vStatus, v.rent_type || 'DAILY',
        v.daily_rent || 0, v.created_at]);
  }
  await nw.query(`SELECT setval('vehicles_id_seq', (SELECT MAX(id) FROM vehicles))`);
  console.log(`  ✓ ${vehicles.rows.length} vehicles`);

  // ── 4. DRIVERS ───────────────────────────────────────────────
  console.log('[4/5] Migrating drivers...');
  const drivers = await old.query(`SELECT * FROM public.drivers ORDER BY id`);
  if (drivers.rows.length > 0) {
    console.log(`  [debug] driver columns: ${Object.keys(drivers.rows[0]).join(', ')}`);
  }

  for (const d of drivers.rows) {
    // Resolve owner: try owner_code lookup first, then direct owner_id
    const ownerRow = d.owner_code ? ownerByCode[d.owner_code] : null;
    const ownerId  = ownerRow?.id || d.owner_id;
    const companyId = ownerRow?.company_id || ownerCompanyMap[ownerId] || 1;

    if (!ownerId) {
      console.log(`  [skip] driver ${d.id} (${d.full_name}) — no owner_id resolved`);
      continue;
    }

    const dName     = d.name || d.full_name || d.driver_name || 'Unknown';
    const dPhone    = d.phone_number || d.mobile_number || d.phone;
    const dEmergency = d.emergency_contact_number || d.emergency_contact || null;
    const dStatus   = ['ACTIVE','INACTIVE','SUSPENDED'].includes(d.status) ? d.status : 'ACTIVE';
    const kycStatus = ['PENDING','PARTIAL','APPROVED','REJECTED'].includes(d.kyc_status) ? d.kyc_status : 'PENDING';

    await nw.query(`
      INSERT INTO drivers (id, owner_id, company_id, name, phone_number, emergency_contact,
                           wallet_balance, status, kyc_status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO NOTHING
    `, [d.id, ownerId, companyId, dName, dPhone,
        dEmergency, d.wallet_balance || 0,
        dStatus, kycStatus, d.created_at]);
  }
  await nw.query(`SELECT setval('drivers_id_seq', (SELECT MAX(id) FROM drivers))`);
  console.log(`  ✓ ${drivers.rows.length} drivers`);

  // ── 5. MANAGERS ──────────────────────────────────────────────
  console.log('[5/5] Migrating managers...');
  const managers = await old.query(`SELECT * FROM public.managers ORDER BY id`).catch(() => ({ rows: [] }));
  if (managers.rows.length > 0) {
    console.log(`  [debug] manager columns: ${Object.keys(managers.rows[0]).join(', ')}`);
  }

  for (const m of managers.rows) {
    const mName  = m.name || m.full_name || 'Unknown';
    const mPhone = m.phone_number || m.mobile_number || m.phone;
    await nw.query(`
      INSERT INTO managers (id, owner_id, name, phone_number, permissions, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO NOTHING
    `, [m.id, m.owner_id, mName, mPhone,
        m.permissions || '[]', m.status || 'ACTIVE', m.created_at]);
  }
  if (managers.rows.length > 0)
    await nw.query(`SELECT setval('managers_id_seq', (SELECT MAX(id) FROM managers))`);
  console.log(`  ✓ ${managers.rows.length} managers`);

  await old.end();
  await nw.end();
  console.log('\n✅ Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
