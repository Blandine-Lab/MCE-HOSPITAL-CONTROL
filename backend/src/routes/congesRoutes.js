// src/routes/congesRoutes.js
// ============================================================
// 🏥 RH – Congés
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. hospital_id explicite dans le POST (NOT NULL sans DEFAULT)
//   3. requireHospital + WHERE hospital_id = $1 sur TOUTES les routes
//   4. Vérification que employe_id appartient au tenant
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
// GET tous les congés (scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, e.nom, e.prenom
       FROM conges c
       JOIN employes e ON c.employe_id = e.id
       WHERE c.hospital_id = $1
         AND e.hospital_id = $1
       ORDER BY c.date_debut DESC`,
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// GET un congé par ID (scopé au tenant)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, e.nom, e.prenom
       FROM conges c
       JOIN employes e ON c.employe_id = e.id
       WHERE c.id = $1
         AND c.hospital_id = $2`,
      [req.params.id, req.hospitalId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Congé non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// POST créer un congé
// ============================================================
router.post('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin, type, statut, commentaire } = req.body;

    if (!employe_id || !date_debut || !date_fin || !type) {
      return res.status(400).json({ error: 'employe_id, date_debut, date_fin et type sont requis' });
    }

    // ✅ FIX : l'employé doit appartenir au tenant courant
    if (!(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const { rows } = await pool.query(
      `INSERT INTO conges (hospital_id, employe_id, date_debut, date_fin, type, statut, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.hospitalId, employe_id, date_debut, date_fin, type, statut || 'en_attente', commentaire || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// PUT modifier un congé (scopé au tenant)
// ============================================================
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin, type, statut, commentaire } = req.body;

    // ✅ FIX : vérifier que le congé appartient au tenant
    const existing = await pool.query(
      'SELECT id FROM conges WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!existing.rowCount) return res.status(404).json({ error: 'Congé non trouvé' });

    // ✅ FIX : si on change l'employé, il doit être dans le tenant
    if (employe_id && !(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const { rows } = await pool.query(
      `UPDATE conges
       SET employe_id = $1, date_debut = $2, date_fin = $3,
           type = $4, statut = $5, commentaire = $6
       WHERE id = $7 AND hospital_id = $8
       RETURNING *`,
      [employe_id, date_debut, date_fin, type, statut, commentaire, req.params.id, req.hospitalId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Congé non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// DELETE supprimer un congé (admin, scopé au tenant)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM conges WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Congé non trouvé' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;