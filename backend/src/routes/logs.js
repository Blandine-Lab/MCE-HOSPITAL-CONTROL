const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/download', async (req, res) => {
  const { fileName, type } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    await pool.query(
      'INSERT INTO telechargements (nom_fichier, type, ip_address) VALUES ($1, $2, $3)',
      [fileName, type, ip]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM telechargements ORDER BY date_telechargement DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;