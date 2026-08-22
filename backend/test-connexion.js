const { Pool } = require('pg');

// Récupère la chaîne depuis le fichier .env ou utilise directement la valeur
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dY7sMK8UOPFy@ep-soft-truth-ayf3vrg0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
  .then(res => {
    console.log('✅ Connexion réussie ! Heure serveur :', res.rows[0].now);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Échec de la connexion :', err.message);
    process.exit(1);
  });