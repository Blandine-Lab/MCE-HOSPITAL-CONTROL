// src/routes/planningsRoutes.js
// ============================================================
// 🏥 RH – Plannings
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. hospital_id explicite dans le POST (NOT NULL sans DEFAULT)
//   3. requireHospital + WHERE hospital_id = $1 sur TOUTES les routes
//   4. Vérification que employe_id appartient au tenant (RLS off → check applicatif obligatoire)
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
// GET tous les plannings (avec filtres, scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin } = req.query;
    let query = `
      SELECT p.*,
             e.nom AS employe_nom,
             e.prenom AS employe_prenom
      FROM plannings p
      LEFT JOIN employes e ON p.employe_id = e.id
      WHERE p.hospital_id = $1
    `;
    const params = [req.hospitalId];
    let idx = 2;
    if (employe_id) { query += ` AND p.employe_id = $${idx++}`; params.push(employe_id); }
    if (date_debut && date_fin) {
      query += ` AND p.date BETWEEN $${idx++} AND $${idx++}`;
      params.push(date_debut, date_fin);
    }
    query += ` ORDER BY p.date DESC, p.heure_debut`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /plannings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET un planning par ID (scopé au tenant)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              e.nom AS employe_nom,
              e.prenom AS employe_prenom
       FROM plannings p
       LEFT JOIN employes e ON p.employe_id = e.id
       WHERE p.id = $1 AND p.hospital_id = $2`,
      [req.params.id, req.hospitalId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Planning non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /plannings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST – Créer un planning
// ============================================================
router.post('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date, heure_debut, heure_fin, type, notes } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    // ✅ FIX : check applicatif (RLS off → on ne peut pas s'y fier)
    if (!(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const { rows } = await pool.query(
      `INSERT INTO plannings (hospital_id, employe_id, date, heure_debut, heure_fin, type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.hospitalId, employe_id, date, heure_debut || null, heure_fin || null, type, notes || null]
    );
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error('POST /plannings error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================================
// PUT – Mettre à jour un planning (scopé au tenant)
// ============================================================
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date, heure_debut, heure_fin, type, notes } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    // ✅ FIX : vérifier que le planning appartient au tenant
    const existing = await pool.query(
      'SELECT id FROM plannings WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!existing.rowCount) return res.status(404).json({ error: 'Planning non trouvé' });

    // ✅ FIX : employé cible dans le tenant
    if (!(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const { rows } = await pool.query(
      `UPDATE plannings SET
        employe_id = $1,
        date = $2,
        heure_debut = $3,
        heure_fin = $4,
        type = $5,
        notes = $6
      WHERE id = $7 AND hospital_id = $8
      RETURNING *`,
      [employe_id, date, heure_debut || null, heure_fin || null, type, notes || null, req.params.id, req.hospitalId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Planning non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /plannings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE – Supprimer un planning (admin, scopé au tenant)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM plannings WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Planning non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /plannings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;