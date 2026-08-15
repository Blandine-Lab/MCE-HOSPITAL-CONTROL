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

// GET tous les types
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM types_examens ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('GET /types-examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET un type par ID
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

// POST créer un type (avec parametres_defaut en texte)
router.post('/', authenticate, async (req, res) => {
  try {
    const { nom, categorie, description, duree_estimee, prix, preparation, parametres_defaut } = req.body;
    // On stocke la valeur directement (si vide, on met NULL)
    const params = (parametres_defaut && parametres_defaut.trim() !== '') ? parametres_defaut : null;
    const { rows } = await pool.query(
      `INSERT INTO types_examens (nom, categorie, description, duree_estimee, prix, preparation, parametres_defaut)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nom, categorie, description, duree_estimee, prix, preparation, params]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /types-examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier un type (avec parametres_defaut en texte)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, categorie, description, duree_estimee, prix, preparation, parametres_defaut } = req.body;
    const params = (parametres_defaut && parametres_defaut.trim() !== '') ? parametres_defaut : null;
    const { rows } = await pool.query(
      `UPDATE types_examens 
       SET nom = $1, categorie = $2, description = $3,
           duree_estimee = $4, prix = $5, preparation = $6,
           parametres_defaut = $7
       WHERE id = $8
       RETURNING *`,
      [nom, categorie, description, duree_estimee, prix, preparation, params, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE supprimer un type (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM types_examens WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Type non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /types-examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;