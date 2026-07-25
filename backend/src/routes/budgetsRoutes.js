const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Finances - Budgets : connecté à PostgreSQL'));

// GET - Tous les budgets avec filtres
router.get('/', authenticate, async (req, res) => {
  try {
    const { exercice, compte_id } = req.query;
    let query = `
      SELECT b.*, c.code as compte_code, c.nom as compte_nom
      FROM budgets b
      JOIN comptes_comptables c ON b.compte_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (exercice) {
      query += ` AND b.exercice = $${idx++}`;
      params.push(exercice);
    }
    if (compte_id) {
      query += ` AND b.compte_id = $${idx++}`;
      params.push(compte_id);
    }

    query += ` ORDER BY b.exercice DESC, c.code`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /budgets :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Budget par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, c.code as compte_code, c.nom as compte_nom
       FROM budgets b
       JOIN comptes_comptables c ON b.compte_id = c.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Budget non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /budgets/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un budget
router.post('/', authenticate, async (req, res) => {
  try {
    const { compte_id, exercice, montant_prevu } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO budgets (compte_id, exercice, montant_prevu)
       VALUES ($1, $2, $3)
       ON CONFLICT (compte_id, exercice) DO UPDATE 
       SET montant_prevu = EXCLUDED.montant_prevu, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [compte_id, exercice, montant_prevu || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /budgets :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un budget
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { montant_prevu } = req.body;
    const { rows } = await pool.query(
      `UPDATE budgets 
       SET montant_prevu = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [montant_prevu, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Budget non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /budgets/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un budget (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM budgets WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Budget non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /budgets/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;