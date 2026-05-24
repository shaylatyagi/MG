const { Pool } = require('pg');
require('dotenv').config();

console.log('🔄 DB Connection Starting...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

let pool;

if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
} else {
  console.log('⚠️ Using individual PG variables');
  pool = new Pool({
    host: process.env.PGHOST || process.env.DB_HOST,
    port: process.env.PGPORT || process.env.DB_PORT || 5432,
    user: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

// Test connection
pool.connect()
  .then((client) => {
    console.log('✅ Database connected successfully to Neon.tech');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection FAILED:', err.message);
  });

module.exports = pool;