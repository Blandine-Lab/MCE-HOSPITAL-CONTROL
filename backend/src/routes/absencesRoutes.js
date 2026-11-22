// src/routes/absencesRoutes.js
// ============================================================
// 🏥 RH – Absences
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
// GET /absences – Liste avec alias
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id,
             a.employe_id,
             a.date_debut AS date,
             a.date_fin,
             a.type,
             a.motif,
             a.statut,
             a.justifie,
             a.created_at,
             e.nom AS employe_nom,
             e.prenom AS employe_prenom
      FROM absences a
      JOIN employes e ON a.employe_id = e.id
      ORDER BY a.date_debut DESC
    `);
    const data = rows.map(row => ({ ...row, justifiee: row.justifie }));
    res.json(data);
  } catch (err) {
    console.error('Erreur GET /absences :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /absences/:id – Détail
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id,
             a.employe_id,
             a.date_debut AS date,
             a.date_fin,
             a.type,
             a.motif,
             a.statut,
             a.justifie,
             a.created_at,
             e.nom AS employe_nom,
             e.prenom AS employe_prenom
      FROM absences a
      JOIN employes e ON a.employe_id = e.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Absence non trouvée' });
    const data = { ...rows[0], justifiee: rows[0].justifie };
    res.json(data);
  } catch (err) {
    console.error('Erreur GET /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /absences – Création
// ============================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date, date_fin, type, motif, statut, justifiee } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    const finalDateFin = date_fin || null;

    // ✅ FIX : hospital_id explicite
    const { rows } = await pool.query(
      `INSERT INTO absences (hospital_id, employe_id, date_debut, date_fin, type, motif, statut, justifie)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, employe_id, date_debut AS date, date_fin, type, motif, statut, justifie, created_at`,
      [req.hospitalId, employe_id, date, finalDateFin, type, motif || null, statut || 'en_attente', justifiee || false]
    );
    const result = { ...rows[0], justifiee: rows[0].justifie };
    res.status(201).json(result);
  } catch (err) {
    console.error('Erreur POST /absences :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /absences/:id – Modification
// ============================================================
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { employe_id, date, date_fin, type, motif, statut, justifiee } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    const finalDateFin = date_fin || null;

    const { rows } = await pool.query(
      `UPDATE absences
       SET employe_id = $1,
           date_debut = $2,
           date_fin = $3,
           type = $4,
           motif = $5,
           statut = $6,
           justifie = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, employe_id, date_debut AS date, date_fin, type, motif, statut, justifie, created_at`,
      [employe_id, date, finalDateFin, type, motif || null, statut || 'en_attente', justifiee || false, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Absence non trouvée' });
    const result = { ...rows[0], justifiee: rows[0].justifie };
    res.json(result);
  } catch (err) {
    console.error('Erreur PUT /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /absences/:id (admin)
// ============================================================
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM absences WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Absence non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;