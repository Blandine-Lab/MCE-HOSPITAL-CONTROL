// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  // Utilisation de DATABASE_URL (Render, Neon, etc.)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
} else {
  // Fallback : variables individuelles (développement local)
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hopital_db',
    client_encoding: 'UTF8',
  });
}

pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL');
});

module.exports = pool;