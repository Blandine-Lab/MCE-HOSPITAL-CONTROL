const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../../config/multer');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ RH - Employés : connecté à PostgreSQL'));

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
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  POST / – Créer un employé (avec photo)
// ============================================================
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, poste, service_id, date_embauche, statut } = req.body;
    const photo = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO employes (nom, prenom, email, telephone, poste, service_id, date_embauche, statut, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nom, prenom, email, telephone, poste, service_id, date_embauche, statut || 'actif', photo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur création employé:', err);
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
    console.error('Erreur modification employé:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /:id – Supprimer un employé (réservé aux administrateurs)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM employes WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Employé non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;