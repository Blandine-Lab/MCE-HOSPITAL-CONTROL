// src/routes/demandesRoutes.js
// ============================================================
// 🏥 RH – Demandes (congés, formation, etc.)
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. require('../config/db') au lieu de require('../../server').pool
//      (évite la dépendance circulaire et garantit le pool patché)
//   2. hospital_id explicite dans les INSERT employes (×2)
//   3. hospital_id explicite dans INSERT demandes
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché (propre)
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

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

    let employeId = null;

    if (userRole !== 'admin') {
      let empRes = await pool.query(
        'SELECT id FROM employes WHERE user_id = $1',
        [userId]
      );

      if (empRes.rowCount === 0) {
        // ✅ FIX : hospital_id explicite
        const insertEmp = await pool.query(`
          INSERT INTO employes (hospital_id, nom, prenom, email, user_id, poste, service_id, date_embauche, statut)
          VALUES ($1, $2, $3, $4, $5, 'Employé', NULL, NOW(), 'actif')
          RETURNING id
        `, [
          req.hospitalId,
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

    let query = `
      SELECT d.*, e.nom AS employe_nom, e.prenom AS employe_prenom
      FROM demandes d
      LEFT JOIN employes e ON d.employe_id = e.id
    `;
    const params = [];

    if (userRole !== 'admin' && hasId(employeId)) {
      query += ` WHERE d.employe_id = $1`;
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

    // 1. Trouver ou créer l'employé à partir de user_id
    let empRes = await pool.query(
      'SELECT id FROM employes WHERE user_id = $1',
      [user.id]
    );
    if (empRes.rowCount === 0) {
      // ✅ FIX : hospital_id explicite
      const insertEmp = await pool.query(`
        INSERT INTO employes (hospital_id, nom, prenom, email, user_id, poste, service_id, date_embauche, statut)
        VALUES ($1, $2, $3, $4, $5, 'Employé', NULL, NOW(), 'actif')
        RETURNING id
      `, [
        req.hospitalId,
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
    // ✅ FIX : hospital_id explicite
    const query = `
      INSERT INTO demandes (hospital_id, employe_id, type, date_debut, date_fin, commentaire, statut, date_demande)
      VALUES ($1, $2, $3, $4, $5, $6, 'en_attente', NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(query, [
      req.hospitalId,
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
// PUT — met à jour le statut (admin uniquement)
// ============================================================
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaire_rh } = req.body;

    if (!hasId(id)) {
      return res.status(400).json({ error: 'ID de demande invalide' });
    }
    if (!['en_attente', 'approuvé', 'refusé'].includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const result = await pool.query(
      'UPDATE demandes SET statut = $1, commentaire_rh = $2 WHERE id = $3',
      [statut, commentaire_rh || null, id]
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
// DELETE — supprime une demande (admin uniquement)
// ============================================================
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!hasId(id)) {
      return res.status(400).json({ error: 'ID de demande invalide' });
    }

    const result = await pool.query('DELETE FROM demandes WHERE id = $1', [id]);
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