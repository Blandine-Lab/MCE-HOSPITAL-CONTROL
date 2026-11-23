// src/routes/employesRoutes.js
// ============================================================
// 🏥 RH – Employés
// ------------------------------------------------------------
// Le pool patché pose `app.hospital_id` via ALS, MAIS depuis que
// le RLS est en NO FORCE + policy supprimée, la DB ne filtre plus.
// → filtrage explicite côté backend sur `req.hospitalId` (JWT).
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');
const upload = require('../../config/multer');

router.use(authenticate, requireHospital);

// ============================================================
//  Helper : vérifie qu'un service appartient au tenant
// ============================================================
async function serviceBelongsToHospital(service_id, hospitalId) {
  if (!service_id || service_id === '' || service_id === 'null' || service_id === 'undefined') {
    return true; // pas de service → OK
  }
  const { rows } = await pool.query(
    'SELECT id FROM services WHERE id = $1 AND hospital_id = $2',
    [service_id, hospitalId]
  );
  return rows.length > 0;
}

// ============================================================
//  GET / – Liste des employés du tenant uniquement
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT e.*, s.nom AS service_nom
      FROM employes e
      LEFT JOIN services s
        ON e.service_id = s.id
       AND s.hospital_id = e.hospital_id
      WHERE e.hospital_id = $1
      ORDER BY e.nom, e.prenom
      `,
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /employes :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  GET /:id – Détail d'un employé du tenant
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT e.*, s.nom AS service_nom
      FROM employes e
      LEFT JOIN services s
        ON e.service_id = s.id
       AND s.hospital_id = e.hospital_id
      WHERE e.id = $1 AND e.hospital_id = $2
      `,
      [req.params.id, req.hospitalId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /employes/:id :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  POST / – Créer un employé rattaché au tenant
// ============================================================
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const {
      nom, prenom, email, telephone, poste,
      service_id, date_embauche, statut,
    } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    // 🔍 Log de diagnostic (temporaire — retirez après résolution)
    console.log('🔍 POST /employes — reçu :', {
      service_id,
      service_id_type: typeof service_id,
      hospitalId: req.hospitalId,
      body_keys: Object.keys(req.body),
    });

    // ✅ Vérifie que le service demandé appartient bien au tenant
    if (!(await serviceBelongsToHospital(service_id, req.hospitalId))) {
      return res.status(400).json({
        error: `Service inconnu pour cet hôpital (reçu: "${service_id}", type: ${typeof service_id})`,
        code: 'SERVICE_NOT_IN_TENANT',
        service_id_recu: service_id,
        hospital_id: req.hospitalId,
      });
    }

    // ✅ Normalise : "" / "null" / undefined → NULL
    const cleanServiceId =
      service_id === '' || service_id === 'null' || service_id === 'undefined' || service_id === null || service_id === undefined
        ? null
        : service_id;

    const { rows } = await pool.query(
      `INSERT INTO employes
         (hospital_id, nom, prenom, email, telephone, poste,
          service_id, date_embauche, statut, photo)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.hospitalId,
        nom, prenom, email, telephone, poste,
        cleanServiceId, date_embauche, statut || 'actif', photo,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /employes :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  PUT /:id – Modifier un employé du tenant uniquement
// ============================================================
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const {
      nom, prenom, email, telephone, poste,
      service_id, date_embauche, statut,
    } = req.body;

    let photo = req.body.photo;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    console.log('🔍 PUT /employes/:id — reçu :', {
      service_id,
      service_id_type: typeof service_id,
      hospitalId: req.hospitalId,
      id: req.params.id,
    });

    // ✅ Vérifie le service si fourni
    if (service_id && service_id !== '' && service_id !== 'null' && service_id !== 'undefined') {
      if (!(await serviceBelongsToHospital(service_id, req.hospitalId))) {
        return res.status(400).json({
          error: `Service inconnu pour cet hôpital (reçu: "${service_id}")`,
          code: 'SERVICE_NOT_IN_TENANT',
          service_id_recu: service_id,
        });
      }
    }

    const cleanServiceId =
      service_id === '' || service_id === 'null' || service_id === 'undefined'
        ? null
        : service_id;

    const { rows } = await pool.query(
      `UPDATE employes SET
         nom = COALESCE($1, nom),
         prenom = COALESCE($2, prenom),
         email = COALESCE($3, email),
         telephone = COALESCE($4, telephone),
         poste = COALESCE($5, poste),
         service_id = COALESCE($6, service_id),
         date_embauche = COALESCE($7, date_embauche),
         statut = COALESCE($8, statut),
         photo = COALESCE($9, photo)
       WHERE id = $10 AND hospital_id = $11
       RETURNING *`,
      [
        nom, prenom, email, telephone, poste,
        cleanServiceId, date_embauche, statut, photo,
        req.params.id,
        req.hospitalId,
      ]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /employes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  DELETE /:id – Supprimer un employé du tenant (admin)
// ============================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM employes WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /employes/:id :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;