// src/routes/servicesRoutes.js
// ============================================================
// 🏥 RH – Services
// ------------------------------------------------------------
// ⚠️ Le pool patché pose `app.hospital_id` via ALS, MAIS depuis
//    que le RLS est en NO FORCE + policy supprimée, la DB ne
//    filtre plus. On filtre donc explicitement côté backend sur
//    `req.hospitalId` (JWT) pour garantir l'isolation tenant.
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // pool patché
const { authenticate, requireAdmin } = require('../middleware/auth');

// ============================================================
//  Middleware local : vérifier que req.hospitalId existe
// ============================================================
function requireHospital(req, res, next) {
  if (!req.hospitalId) {
    return res.status(403).json({
      error: 'Contexte hôpital manquant',
      code: 'TENANT_MISSING',
    });
  }
  next();
}

// ============================================================
// GET tous les services du tenant
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM services WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
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
// GET un service par ID (uniquement dans le tenant)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
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
router.post('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { nom, responsable, description } = req.body;

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom du service est obligatoire' });
    }

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
// PUT modifier un service (uniquement dans le tenant)
// ============================================================
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { nom, responsable, description } = req.body;

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom est obligatoire' });
    }

    const { rows } = await pool.query(
      `UPDATE services
       SET nom = $1, responsable = $2, description = $3, updated_at = NOW()
       WHERE id = $4 AND hospital_id = $5
       RETURNING *`,
      [nom.trim(), responsable || null, description || null, req.params.id, req.hospitalId]
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
// DELETE supprimer un service (admin uniquement, dans le tenant)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM services WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
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