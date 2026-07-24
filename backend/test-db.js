require('dotenv').config();
const pool = require('./src/config/db');

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ Erreur de connexion :', err);
  else console.log('✅ Connecté à PostgreSQL !', res.rows[0]);
  pool.end();
});