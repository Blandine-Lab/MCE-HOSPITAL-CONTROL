// backend/src/routes/parametresLaboRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ============================================================
// GET /api/parametres-references - Liste tous les paramètres
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM parametres_reference ORDER BY nom ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /parametres-references :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/parametres-references/:id - Détail d'un paramètre
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM parametres_reference WHERE id = $1',
      [id]
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
router.post('/', authenticate, requireAdmin, async (req, res) => {
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

    // Vérifier si le nom existe déjà
    const check = await pool.query('SELECT id FROM parametres_reference WHERE nom = $1', [nom]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Un paramètre avec ce nom existe déjà' });
    }

    const { rows } = await pool.query(
      `INSERT INTO parametres_reference 
       (nom, unite, ref_min, ref_max, valeurs_possibles, seuil_critique_min, seuil_critique_max,
        type_parametre, categorie, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
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

    // Vérifier si le paramètre existe
    const existing = await pool.query('SELECT * FROM parametres_reference WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Paramètre non trouvé' });
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé par un autre
    if (nom && nom !== existing.rows[0].nom) {
      const check = await pool.query('SELECT id FROM parametres_reference WHERE nom = $1 AND id != $2', [nom, id]);
      if (check.rows.length > 0) {
        return res.status(400).json({ error: 'Un paramètre avec ce nom existe déjà' });
      }
    }

    const { rows } = await pool.query(
      `UPDATE parametres_reference 
       SET nom = $1, unite = $2, ref_min = $3, ref_max = $4,
           valeurs_possibles = $5, seuil_critique_min = $6, seuil_critique_max = $7,
           type_parametre = $8, categorie = $9, commentaire = $10,
           updated_at = NOW()
       WHERE id = $11
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
        id
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /parametres-references/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/parametres-references/:id - Supprimer un paramètre
// ============================================================
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM parametres_reference WHERE id = $1',
      [id]
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