// src/routes/congesRoutes.js
// ============================================================
// 🏥 RH – Congés
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
// GET tous les congés
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, e.nom, e.prenom
      FROM conges c
      JOIN employes e ON c.employe_id = e.id
      ORDER BY c.date_debut DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET un congé par ID
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, e.nom, e.prenom
      FROM conges c
      JOIN employes e ON c.employe_id = e.id
      WHERE c.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Congé non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// POST créer un congé
// ============================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin, type, statut, commentaire } = req.body;

    if (!employe_id || !date_debut || !date_fin || !type) {
      return res.status(400).json({ error: 'employe_id, date_debut, date_fin et type sont requis' });
    }

    // ✅ FIX : hospital_id explicite (colonne NOT NULL sans DEFAULT)
    const { rows } = await pool.query(
      `INSERT INTO conges (hospital_id, employe_id, date_debut, date_fin, type, statut, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.hospitalId, employe_id, date_debut, date_fin, type, statut || 'en_attente', commentaire || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// PUT modifier un congé
// ============================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin, type, statut, commentaire } = req.body;
    const { rows } = await pool.query(
      `UPDATE conges SET employe_id=$1, date_debut=$2, date_fin=$3, type=$4, statut=$5, commentaire=$6
       WHERE id=$7 RETURNING *`,
      [employe_id, date_debut, date_fin, type, statut, commentaire, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Congé non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// DELETE supprimer un congé (admin)
// ============================================================
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM conges WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Congé non trouvé' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;