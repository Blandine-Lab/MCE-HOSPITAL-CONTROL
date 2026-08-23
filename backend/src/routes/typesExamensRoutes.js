const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Laboratoire - Types Examens : connecté à PostgreSQL'));

// ============================================================
// GET tous les types
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM types_examens ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('GET /types-examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET un type par ID
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM types_examens WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST créer un type (avec support de parametres_ids)
// ============================================================
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 POST /types-examens - Body reçu :', req.body);
    const {
      nom,
      categorie,
      description,
      duree_estimee,
      prix,
      preparation,
      prestation_id,
      parametres_defaut,
      parametres_ids   // nouveau champ (tableau d'IDs)
    } = req.body;

    // ✅ Normalisation des données
    // prix : virgule → point → nombre
    let prixNum = null;
    if (prix !== undefined && prix !== null && prix !== '') {
      const prixStr = prix.toString().replace(',', '.');
      prixNum = parseFloat(prixStr);
      if (isNaN(prixNum)) prixNum = null;
    }

    // duree_estimee : entier
    let duree = null;
    if (duree_estimee !== undefined && duree_estimee !== null && duree_estimee !== '') {
      duree = parseInt(duree_estimee);
      if (isNaN(duree)) duree = null;
    }

    // parametres_defaut (ancien champ) : conversion en JSON
    let paramsDefautJson = null;
    if (parametres_defaut) {
      if (Array.isArray(parametres_defaut)) {
        paramsDefautJson = JSON.stringify(parametres_defaut);
      } else if (typeof parametres_defaut === 'string') {
        try {
          JSON.parse(parametres_defaut);
          paramsDefautJson = parametres_defaut;
        } catch {
          paramsDefautJson = JSON.stringify([]);
        }
      }
    }

    // parametres_ids (nouveau champ) : tableau d'entiers → JSON
    let paramsIdsJson = null;
    if (parametres_ids && Array.isArray(parametres_ids) && parametres_ids.length > 0) {
      // S'assurer que ce sont des entiers
      const ids = parametres_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        paramsIdsJson = JSON.stringify(ids);
      }
    }

    // prestation_id : nombre ou NULL
    let prestationId = null;
    if (prestation_id && prestation_id !== '' && prestation_id !== 0) {
      prestationId = parseInt(prestation_id);
      if (isNaN(prestationId)) prestationId = null;
    }

    const { rows } = await pool.query(
      `INSERT INTO types_examens 
       (nom, categorie, description, duree_estimee, prix, preparation, prestation_id, 
        parametres_defaut, parametres_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nom, categorie, description, duree, prixNum, preparation, prestationId, paramsDefautJson, paramsIdsJson]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /types-examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT modifier un type (avec support de parametres_ids)
// ============================================================
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 PUT /types-examens/${id} - Body reçu :`, req.body);

    const {
      nom,
      categorie,
      description,
      duree_estimee,
      prix,
      preparation,
      prestation_id,
      parametres_defaut,
      parametres_ids
    } = req.body;

    // ✅ Normalisation des données (identique à POST)
    let prixNum = null;
    if (prix !== undefined && prix !== null && prix !== '') {
      const prixStr = prix.toString().replace(',', '.');
      prixNum = parseFloat(prixStr);
      if (isNaN(prixNum)) prixNum = null;
    }

    let duree = null;
    if (duree_estimee !== undefined && duree_estimee !== null && duree_estimee !== '') {
      duree = parseInt(duree_estimee);
      if (isNaN(duree)) duree = null;
    }

    let paramsDefautJson = null;
    if (parametres_defaut) {
      if (Array.isArray(parametres_defaut)) {
        paramsDefautJson = JSON.stringify(parametres_defaut);
      } else if (typeof parametres_defaut === 'string') {
        try {
          JSON.parse(parametres_defaut);
          paramsDefautJson = parametres_defaut;
        } catch {
          paramsDefautJson = JSON.stringify([]);
        }
      }
    }

    let paramsIdsJson = null;
    if (parametres_ids && Array.isArray(parametres_ids) && parametres_ids.length > 0) {
      const ids = parametres_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        paramsIdsJson = JSON.stringify(ids);
      }
    }

    let prestationId = null;
    if (prestation_id && prestation_id !== '' && prestation_id !== 0) {
      prestationId = parseInt(prestation_id);
      if (isNaN(prestationId)) prestationId = null;
    }

    const { rows } = await pool.query(
      `UPDATE types_examens 
       SET nom = $1, categorie = $2, description = $3,
           duree_estimee = $4, prix = $5, preparation = $6,
           prestation_id = $7, parametres_defaut = $8, 
           parametres_ids = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [nom, categorie, description, duree, prixNum, preparation, prestationId, paramsDefautJson, paramsIdsJson, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE supprimer un type (avec vérification d'usage)
// ============================================================
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Vérifier si des examens utilisent ce type
    const check = await pool.query('SELECT COUNT(*) FROM examens WHERE type_examen_id = $1', [id]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({
        error: `Ce type est utilisé par ${check.rows[0].count} examen(s). Impossible de le supprimer.`,
        used: true,
        count: parseInt(check.rows[0].count)
      });
    }
    const { rowCount } = await pool.query('DELETE FROM types_examens WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Vérifier si un type est utilisé (pour le frontend)
// ============================================================
router.get('/:id/check', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT COUNT(*) FROM examens WHERE type_examen_id = $1', [id]);
    const count = parseInt(result.rows[0].count);
    res.json({ used: count > 0, count });
  } catch (err) {
    console.error('❌ GET /types-examens/:id/check :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;