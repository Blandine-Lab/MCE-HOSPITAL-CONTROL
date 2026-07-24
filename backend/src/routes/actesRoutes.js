const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Test
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route actes fonctionne' });
});

// GET tous les actes
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM actes_paramedicaux ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('GET /actes-paramedicaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET un acte
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM actes_paramedicaux WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, nom, categorie, description, duree_estimee, prix } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO actes_paramedicaux (code, nom, categorie, description, duree_estimee, prix)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code, nom, categorie, description, duree_estimee, prix]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /actes-paramedicaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, nom, categorie, description, duree_estimee, prix } = req.body;
    const { rows } = await pool.query(
      `UPDATE actes_paramedicaux 
       SET code = $1, nom = $2, categorie = $3, description = $4,
           duree_estimee = $5, prix = $6
       WHERE id = $7
       RETURNING *`,
      [code, nom, categorie, description, duree_estimee, prix, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE – Suppression réservée aux administrateurs
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM actes_paramedicaux WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;