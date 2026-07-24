const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL non définie !');
  process.exit(1);
}

console.log('🔗 Connexion à PostgreSQL avec DATABASE_URL');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Connecté à PostgreSQL'));

module.exports = pool;