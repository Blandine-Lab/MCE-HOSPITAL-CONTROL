// src/routes/typesExamensRoutes.js
// ============================================================
// 🔬 LABORATOIRE – Types d'examens
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. hospital_id explicite dans le POST (NOT NULL sans DEFAULT)
//   3. requireHospital + WHERE hospital_id = $1 sur TOUTES les routes
//   4. Check d'usage scopé tenant (DELETE + GET /:id/check)
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');

// ============================================================
// Helper – vérification d'appartenance au tenant
// ============================================================
async function typeExamenInTenant(typeId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM types_examens WHERE id = $1 AND hospital_id = $2',
    [typeId, hospitalId]
  );
  return rowCount > 0;
}

// ============================================================
// GET tous les types (scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM types_examens WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /types-examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET un type par ID (scopé au tenant)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM types_examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST créer un type
// ============================================================
router.post('/', authenticate, requireHospital, requireAdmin, async (req, res) => {
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
      parametres_ids
    } = req.body;

    // ✅ Normalisation prix
    let prixNum = null;
    if (prix !== undefined && prix !== null && prix !== '') {
      const prixStr = prix.toString().replace(',', '.');
      prixNum = parseFloat(prixStr);
      if (isNaN(prixNum)) prixNum = null;
    }

    // ✅ Normalisation durée
    let duree = null;
    if (duree_estimee !== undefined && duree_estimee !== null && duree_estimee !== '') {
      duree = parseInt(duree_estimee);
      if (isNaN(duree)) duree = null;
    }

    // ✅ Normalisation parametres_defaut
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

    // ✅ Normalisation parametres_ids
    let paramsIdsJson = null;
    if (parametres_ids && Array.isArray(parametres_ids) && parametres_ids.length > 0) {
      const ids = parametres_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      if (ids.length > 0) {
        paramsIdsJson = JSON.stringify(ids);
      }
    }

    // ✅ Normalisation prestation_id
    let prestationId = null;
    if (prestation_id && prestation_id !== '' && prestation_id !== 0) {
      prestationId = parseInt(prestation_id);
      if (isNaN(prestationId)) prestationId = null;
    }

    const { rows } = await pool.query(
      `INSERT INTO types_examens 
       (hospital_id, nom, categorie, description, duree_estimee, prix, preparation, prestation_id, 
        parametres_defaut, parametres_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.hospitalId, nom, categorie, description, duree, prixNum, preparation, prestationId, paramsDefautJson, paramsIdsJson]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /types-examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT modifier un type (scopé au tenant)
// ============================================================
router.put('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
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

    // ✅ FIX : UPDATE scopé tenant (0 ligne → 404, pas de fuite cross-tenant)
    const { rows } = await pool.query(
      `UPDATE types_examens 
       SET nom = $1, categorie = $2, description = $3,
           duree_estimee = $4, prix = $5, preparation = $6,
           prestation_id = $7, parametres_defaut = $8, 
           parametres_ids = $9, updated_at = NOW()
       WHERE id = $10 AND hospital_id = $11
       RETURNING *`,
      [nom, categorie, description, duree, prixNum, preparation, prestationId, paramsDefautJson, paramsIdsJson, id, req.hospitalId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE supprimer un type (avec vérification d'usage scopée tenant)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIX : le type doit appartenir au tenant
    if (!(await typeExamenInTenant(id, req.hospitalId))) {
      return res.status(404).json({ error: 'Type non trouvé' });
    }

    // ✅ FIX : check d'usage scopé tenant (les examens d'autres hôpitaux ne bloquent pas)
    const check = await pool.query(
      'SELECT COUNT(*) FROM examens WHERE type_examen_id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({
        error: `Ce type est utilisé par ${check.rows[0].count} examen(s). Impossible de le supprimer.`,
        used: true,
        count: parseInt(check.rows[0].count)
      });
    }

    const { rowCount } = await pool.query(
      'DELETE FROM types_examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Vérifier si un type est utilisé (pour le frontend, scopé tenant)
// ============================================================
router.get('/:id/check', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIX : type du tenant
    if (!(await typeExamenInTenant(id, req.hospitalId))) {
      return res.status(404).json({ error: 'Type non trouvé' });
    }

    // ✅ FIX : check scopé tenant
    const result = await pool.query(
      'SELECT COUNT(*) FROM examens WHERE type_examen_id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    const count = parseInt(result.rows[0].count);
    res.json({ used: count > 0, count });
  } catch (err) {
    console.error('❌ GET /types-examens/:id/check :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;