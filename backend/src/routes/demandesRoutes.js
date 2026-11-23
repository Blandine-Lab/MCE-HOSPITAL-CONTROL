// src/routes/demandesRoutes.js
// ============================================================
// 🏥 RH – Demandes (congés, formation, etc.)
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. require('../config/db') au lieu de require('../../server').pool
//   2. hospital_id explicite dans les INSERT employes (×2)
//   3. hospital_id explicite dans INSERT demandes
//   4. requireHospital sur TOUTES les routes (req.hospitalId fiable)
//   5. Filtre hospital_id sur GET / en mode admin (fuite cross-tenant)
//   6. Filtre hospital_id sur PUT /:id et DELETE /:id (modif/suppression cross-tenant)
//   7. Recherche employe scopée au tenant
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché (propre)
const { authenticate, requireHospital } = require('../middleware/auth');

router.use(authenticate);
router.use(requireHospital);   // ✅ FIX : req.hospitalId fiable partout

const isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Accès refusé' });
};

// Petit utilitaire : true si la valeur est un id exploitable
const hasId = (v) =>
  v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '0';

// ============================================================
// GET — récupère les demandes avec liaison employé via user_id
// ============================================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const hospitalId = req.hospitalId;

    let employeId = null;

    if (userRole !== 'admin') {
      // ✅ FIX : employé du tenant uniquement
      const empRes = await pool.query(
        'SELECT id FROM employes WHERE user_id = $1 AND hospital_id = $2',
        [userId, hospitalId]
      );

      if (empRes.rowCount === 0) {
        // ✅ FIX : hospital_id explicite
        const insertEmp = await pool.query(`
          INSERT INTO employes (hospital_id, nom, prenom, email, user_id, poste, service_id, date_embauche, statut)
          VALUES ($1, $2, $3, $4, $5, 'Employé', NULL, NOW(), 'actif')
          RETURNING id
        `, [
          hospitalId,
          req.user.nom || 'Inconnu',
          req.user.prenom || 'Inconnu',
          req.user.email || null,
          userId
        ]);
        employeId = insertEmp.rows[0].id;
      } else {
        employeId = empRes.rows[0].id;
      }
    }

    // ✅ FIX : filtre tenant TOUJOURS appliqué (admin comme non-admin)
    let query = `
      SELECT d.*, e.nom AS employe_nom, e.prenom AS employe_prenom
      FROM demandes d
      LEFT JOIN employes e ON d.employe_id = e.id
      WHERE d.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;

    if (userRole !== 'admin' && hasId(employeId)) {
      query += ` AND d.employe_id = $${idx++}`;
      params.push(employeId);
    }
    query += ` ORDER BY d.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error('Erreur GET /demandes :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// POST — crée une nouvelle demande
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { type, date_debut, date_fin, description } = req.body;
    const user = req.user;
    const hospitalId = req.hospitalId;

    // 1. Trouver ou créer l'employé à partir de user_id (scopé tenant)
    let empRes = await pool.query(
      'SELECT id FROM employes WHERE user_id = $1 AND hospital_id = $2',
      [user.id, hospitalId]
    );
    if (empRes.rowCount === 0) {
      // ✅ FIX : hospital_id explicite
      const insertEmp = await pool.query(`
        INSERT INTO employes (hospital_id, nom, prenom, email, user_id, poste, service_id, date_embauche, statut)
        VALUES ($1, $2, $3, $4, $5, 'Employé', NULL, NOW(), 'actif')
        RETURNING id
      `, [
        hospitalId,
        user.nom || 'Inconnu',
        user.prenom || 'Inconnu',
        user.email || null,
        user.id
      ]);
      empRes = insertEmp;
    }
    const employe_id = empRes.rows[0].id;

    if (!hasId(employe_id)) {
      return res.status(400).json({ error: 'Employé introuvable ou invalide' });
    }

    // 2. Validation
    if (!type || !date_debut || !date_fin) {
      return res.status(400).json({ error: 'Type, date début et date fin sont requis' });
    }
    if (new Date(date_fin) < new Date(date_debut)) {
      return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' });
    }

    // 3. Insertion
    const query = `
      INSERT INTO demandes (hospital_id, employe_id, type, date_debut, date_fin, commentaire, statut, date_demande)
      VALUES ($1, $2, $3, $4, $5, $6, 'en_attente', NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(query, [
      hospitalId,
      employe_id,
      type,
      date_debut,
      date_fin,
      description || ''
    ]);
    res.status(201).json({ message: 'Demande créée', id: rows[0].id });
  } catch (err) {
    console.error('Erreur POST /demandes :', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================================
// PUT — met à jour le statut (admin uniquement, scopé tenant)
// ============================================================
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaire_rh } = req.body;
    const hospitalId = req.hospitalId;

    if (!hasId(id)) {
      return res.status(400).json({ error: 'ID de demande invalide' });
    }
    if (!['en_attente', 'approuvé', 'refusé'].includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    // ✅ FIX : UPDATE scopé tenant
    const result = await pool.query(
      'UPDATE demandes SET statut = $1, commentaire_rh = $2 WHERE id = $3 AND hospital_id = $4',
      [statut, commentaire_rh || null, id, hospitalId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    res.json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error('Erreur PUT /demandes :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// DELETE — supprime une demande (admin uniquement, scopé tenant)
// ============================================================
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.hospitalId;

    if (!hasId(id)) {
      return res.status(400).json({ error: 'ID de demande invalide' });
    }

    // ✅ FIX : DELETE scopé tenant
    const result = await pool.query(
      'DELETE FROM demandes WHERE id = $1 AND hospital_id = $2',
      [id, hospitalId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    res.json({ message: 'Demande supprimée' });
  } catch (err) {
    console.error('Erreur DELETE /demandes :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;