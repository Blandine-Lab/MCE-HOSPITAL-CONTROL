// backend/src/routes/parametresLaboRoutes.js
// ============================================================
// 🔬 LABORATOIRE – Paramètres de référence
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. requireHospital sur TOUTES les routes (req.hospitalId fiable)
//   2. WHERE hospital_id = $1 sur GET /, GET /:id, PUT /:id, DELETE /:id
//   3. Unicité du "nom" scopée au tenant (MCE et cmock peuvent avoir "Hémoglobine")
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');

// ============================================================
// GET /api/parametres-references - Liste (scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM parametres_reference
       WHERE hospital_id = $1
       ORDER BY nom ASC`,
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /parametres-references :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/parametres-references/:id - Détail (scopé au tenant)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM parametres_reference WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /parametres-references/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/parametres-references - Créer un nouveau paramètre
// ============================================================
router.post('/', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const {
      nom,
      unite,
      ref_min,
      ref_max,
      valeurs_possibles,
      seuil_critique_min,
      seuil_critique_max,
      type_parametre,
      categorie,
      commentaire
    } = req.body;

    if (!nom) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }

    // ✅ FIX : unicité du nom SCOPÉE AU TENANT
    const check = await pool.query(
      'SELECT id FROM parametres_reference WHERE nom = $1 AND hospital_id = $2',
      [nom, req.hospitalId]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Un paramètre avec ce nom existe déjà dans votre hôpital' });
    }

    const { rows } = await pool.query(
      `INSERT INTO parametres_reference 
       (hospital_id, nom, unite, ref_min, ref_max, valeurs_possibles, seuil_critique_min, seuil_critique_max,
        type_parametre, categorie, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.hospitalId,
        nom,
        unite || null,
        ref_min || null,
        ref_max || null,
        valeurs_possibles || null,
        seuil_critique_min || null,
        seuil_critique_max || null,
        type_parametre || 'quantitatif',
        categorie || null,
        commentaire || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /parametres-references :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/parametres-references/:id - Modifier un paramètre
// ============================================================
router.put('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom,
      unite,
      ref_min,
      ref_max,
      valeurs_possibles,
      seuil_critique_min,
      seuil_critique_max,
      type_parametre,
      categorie,
      commentaire
    } = req.body;

    // ✅ FIX : paramètre du tenant uniquement
    const existing = await pool.query(
      'SELECT * FROM parametres_reference WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    // ✅ FIX : unicité du nom SCOPÉE AU TENANT (exclut l'id courant)
    if (nom && nom !== existing.rows[0].nom) {
      const check = await pool.query(
        'SELECT id FROM parametres_reference WHERE nom = $1 AND hospital_id = $2 AND id != $3',
        [nom, req.hospitalId, id]
      );
      if (check.rows.length > 0) {
        return res.status(400).json({ error: 'Un paramètre avec ce nom existe déjà dans votre hôpital' });
      }
    }

    // ✅ FIX : UPDATE scopé tenant
    const { rows } = await pool.query(
      `UPDATE parametres_reference 
       SET nom = $1, unite = $2, ref_min = $3, ref_max = $4,
           valeurs_possibles = $5, seuil_critique_min = $6, seuil_critique_max = $7,
           type_parametre = $8, categorie = $9, commentaire = $10,
           updated_at = NOW()
       WHERE id = $11 AND hospital_id = $12
       RETURNING *`,
      [
        nom,
        unite || null,
        ref_min || null,
        ref_max || null,
        valeurs_possibles || null,
        seuil_critique_min || null,
        seuil_critique_max || null,
        type_parametre || 'quantitatif',
        categorie || null,
        commentaire || null,
        id,
        req.hospitalId
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /parametres-references/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/parametres-references/:id - Supprimer un paramètre (scopé tenant)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM parametres_reference WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /parametres-references/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;