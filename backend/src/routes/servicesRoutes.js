// src/routes/servicesRoutes.js
// ============================================================
// 🏥 RH – Services
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. hospital_id explicite dans le POST (NOT NULL sans DEFAULT)
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireAdmin } = require('../middleware/auth');

// ============================================================
// GET tous les services
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /services :', err);
    if (err.message.includes('relation "services" does not exist')) {
      return res.status(500).json({
        error: 'La table services n\'existe pas encore. Veuillez exécuter le script SQL de création.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET un service par ID
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST créer un service
// ============================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { nom, responsable, description } = req.body;

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom du service est obligatoire' });
    }

    // ✅ FIX : hospital_id explicite (colonne NOT NULL sans DEFAULT)
    const { rows } = await pool.query(
      `INSERT INTO services (hospital_id, nom, responsable, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.hospitalId, nom.trim(), responsable || null, description || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /services :', err);

    if (err.code === '23505') {
      return res.status(409).json({ error: 'Un service avec ce nom existe déjà' });
    }
    if (err.code === '23502') {
      return res.status(400).json({ error: 'Un champ obligatoire est manquant (vérifiez votre table)' });
    }
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================================
// PUT modifier un service
// ============================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { nom, responsable, description } = req.body;

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom est obligatoire' });
    }

    const { rows } = await pool.query(
      `UPDATE services
       SET nom = $1, responsable = $2, description = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nom.trim(), responsable || null, description || null, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /services/:id :', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Un service avec ce nom existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE supprimer un service (admin uniquement)
// ============================================================
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;