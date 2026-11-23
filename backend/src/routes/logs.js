const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireHospital } = require('../middleware/auth');

// ============================================================
// POST /download — Enregistre un téléchargement (auth obligatoire)
// ============================================================
router.post('/download', authenticate, requireHospital, async (req, res) => {
  const { fileName, type } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!fileName || !type) {
    return res.status(400).json({ error: 'fileName et type sont requis' });
  }

  try {
    await pool.query(
      `INSERT INTO telechargements (hospital_id, nom_fichier, type, ip_address, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.hospitalId, fileName, type, ip, req.user?.id || null]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET / — Historique des téléchargements (scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM telechargements WHERE hospital_id = $1 ORDER BY date_telechargement DESC',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;