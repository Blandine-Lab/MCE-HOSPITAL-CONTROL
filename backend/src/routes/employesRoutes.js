// src/routes/employesRoutes.js
// ============================================================
// 🏥 RH – Employés
// ------------------------------------------------------------
// ⚠️ FIX CRITIQUE : on utilise le pool PATCHÉ de config/db.js
//    (et non un `new Pool(...)` local) pour que `patchedQuery`
//    pose `app.hospital_id` via AsyncLocalStorage → RLS OK.
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché (ALS + set_config)
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../../config/multer');

// ============================================================
//  PROTECTION : toutes les routes nécessitent un token
// ============================================================
router.use(authenticate);

// ============================================================
//  GET / – Liste des employés (avec service_nom)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, s.nom AS service_nom
      FROM employes e
      LEFT JOIN services s ON e.service_id = s.id
      ORDER BY e.nom, e.prenom
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /employes :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  GET /:id – Détail d'un employé (avec service_nom)
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, s.nom AS service_nom
      FROM employes e
      LEFT JOIN services s ON e.service_id = s.id
      WHERE e.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /employes/:id :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  POST / – Créer un employé (avec photo)
//  ⚠️ hospital_id est injecté par RLS : on ne le met PAS dans l'INSERT.
//     Si la colonne est NOT NULL sans DEFAULT, ajoute
//     `hospital_id = current_setting('app.hospital_id')::uuid` côté DB,
//     ou passe-le explicitement via req.hospitalId (voir note plus bas).
// ============================================================
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, poste, service_id, date_embauche, statut } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO employes
         (hospital_id, nom, prenom, email, telephone, poste, service_id, date_embauche, statut, photo)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.hospitalId,                                      // ✅ tenant explicite (NOT NULL)
        nom, prenom, email, telephone, poste,
        service_id, date_embauche, statut || 'actif', photo,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /employes :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  PUT /:id – Modifier un employé (avec photo)
// ============================================================
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, poste, service_id, date_embauche, statut } = req.body;

    let photo = req.body.photo;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

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
       WHERE id = $10
       RETURNING *`,
      [nom, prenom, email, telephone, poste, service_id, date_embauche, statut, photo, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /employes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  DELETE /:id – Supprimer un employé (réservé aux administrateurs)
// ============================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM employes WHERE id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Employé non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /employes/:id :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;