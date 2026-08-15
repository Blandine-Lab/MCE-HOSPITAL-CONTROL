// AVANT D'UTILISER CE ROUTEUR, ASSUREZ-VOUS QUE LA COLONNE commentaire_rh EXISTE DANS LA TABLE demandes
// Exécutez cette commande SQL si ce n'est pas déjà fait :
// ALTER TABLE demandes ADD COLUMN commentaire_rh TEXT;

const express = require('express');
const router = express.Router();
const pool = require('../../server').pool;
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

const isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Accès refusé' });
};

// GET – récupère les demandes avec liaison employé via user_id
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let employeId = null;

    if (userRole !== 'admin') {
      // Recherche par user_id dans la table employes
      let empRes = await pool.query('SELECT id FROM employes WHERE user_id = $1', [userId]);

      // Si non trouvé, créer un nouvel employé avec ce user_id
      if (empRes.rowCount === 0) {
        const insertEmp = await pool.query(`
          INSERT INTO employes (nom, prenom, email, user_id, poste, service_id, date_embauche, statut)
          VALUES ($1, $2, $3, $4, 'Employé', 1, NOW(), 'actif')
          RETURNING id
        `, [
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

    // Construction de la requête avec jointure pour récupérer le nom de l'employé
    let query = `
      SELECT d.*, e.nom AS employe_nom, e.prenom AS employe_prenom
      FROM demandes d
      LEFT JOIN employes e ON d.employe_id = e.id
    `;
    const params = [];
    if (userRole !== 'admin' && employeId) {
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

// POST – crée une nouvelle demande (avec création automatique d'employé si nécessaire)
router.post('/', async (req, res) => {
  try {
    const { type, date_debut, date_fin, description } = req.body;
    const user = req.user;

    // 1. Trouver ou créer l'employé à partir de user_id
    let empRes = await pool.query('SELECT id FROM employes WHERE user_id = $1', [user.id]);
    if (empRes.rowCount === 0) {
      const insertEmp = await pool.query(`
        INSERT INTO employes (nom, prenom, email, user_id, poste, service_id, date_embauche, statut)
        VALUES ($1, $2, $3, $4, 'Employé', 1, NOW(), 'actif')
        RETURNING id
      `, [
        user.nom || 'Inconnu',
        user.prenom || 'Inconnu',
        user.email || null,
        user.id
      ]);
      empRes = insertEmp;
    }
    const employe_id = empRes.rows[0].id;

    // 2. Validation des données
    if (!type || !date_debut || !date_fin) {
      return res.status(400).json({ error: 'Type, date début et date fin sont requis' });
    }
    if (new Date(date_fin) < new Date(date_debut)) {
      return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' });
    }

    // 3. Insertion (utilise la colonne commentaire pour la description et date_demande automatique)
    const query = `
      INSERT INTO demandes (employe_id, type, date_debut, date_fin, commentaire, statut, date_demande)
      VALUES ($1, $2, $3, $4, $5, 'en_attente', NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(query, [employe_id, type, date_debut, date_fin, description || '']);
    res.status(201).json({ message: 'Demande créée', id: rows[0].id });
  } catch (err) {
    console.error('Erreur POST /demandes :', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT – met à jour le statut (admin uniquement)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaire_rh } = req.body;
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

// DELETE – supprime une demande (admin uniquement)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
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