// src/routes/absencesRoutes.js
// ============================================================
// 🏥 RH – Absences
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. hospital_id explicite dans le POST (NOT NULL sans DEFAULT)
//   3. requireHospital + WHERE hospital_id = $1 sur TOUTES les routes
//   4. Vérification que employe_id appartient au tenant (RLS off)
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');

// ============================================================
// Helper – vérification d'appartenance au tenant
// ============================================================
async function employeInTenant(employeId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM employes WHERE id = $1 AND hospital_id = $2',
    [employeId, hospitalId]
  );
  return rowCount > 0;
}

// ============================================================
// GET /absences – Liste avec alias (scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id,
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
       WHERE a.hospital_id = $1
         AND e.hospital_id = $1
       ORDER BY a.date_debut DESC`,
      [req.hospitalId]
    );
    const data = rows.map(row => ({ ...row, justifiee: row.justifie }));
    res.json(data);
  } catch (err) {
    console.error('Erreur GET /absences :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /absences/:id – Détail (scopé au tenant)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id,
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
       WHERE a.id = $1 AND a.hospital_id = $2`,
      [req.params.id, req.hospitalId]
    );
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
router.post('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date, date_fin, type, motif, statut, justifiee } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    // ✅ FIX : employé du tenant
    if (!(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const finalDateFin = date_fin || null;

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
// PUT /absences/:id – Modification (scopé au tenant)
// ============================================================
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date, date_fin, type, motif, statut, justifiee } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    // ✅ FIX : absence du tenant
    const existing = await pool.query(
      'SELECT id FROM absences WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!existing.rowCount) return res.status(404).json({ error: 'Absence non trouvée' });

    // ✅ FIX : employé cible dans le tenant
    if (!(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
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
       WHERE id = $8 AND hospital_id = $9
       RETURNING id, employe_id, date_debut AS date, date_fin, type, motif, statut, justifie, created_at`,
      [employe_id, date, finalDateFin, type, motif || null, statut || 'en_attente', justifiee || false, req.params.id, req.hospitalId]
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
// DELETE /absences/:id (admin, scopé au tenant)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM absences WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Absence non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;