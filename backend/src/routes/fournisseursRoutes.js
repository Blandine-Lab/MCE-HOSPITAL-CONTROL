const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM fournisseurs ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM fournisseurs WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { nom, contact, telephone, email, adresse } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO fournisseurs (nom, contact, telephone, email, adresse) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nom, contact, telephone, email, adresse]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { nom, contact, telephone, email, adresse } = req.body;
    const { rows } = await pool.query(
      'UPDATE fournisseurs SET nom=$1, contact=$2, telephone=$3, email=$4, adresse=$5 WHERE id=$6 RETURNING *',
      [nom, contact, telephone, email, adresse, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un fournisseur (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM fournisseurs WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;