const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Finances - Journaux : connecté à PostgreSQL'));

// GET - Tous les journaux
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM journaux ORDER BY code');
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /journaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Journal par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM journaux WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Journal non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /journaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un journal
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, nom, description } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO journaux (code, nom, description) VALUES ($1, $2, $3) RETURNING *',
      [code, nom, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /journaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un journal
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { code, nom, description } = req.body;
    const { rows } = await pool.query(
      'UPDATE journaux SET code = $1, nom = $2, description = $3 WHERE id = $4 RETURNING *',
      [code, nom, description, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Journal non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /journaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un journal (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM journaux WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Journal non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /journaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;