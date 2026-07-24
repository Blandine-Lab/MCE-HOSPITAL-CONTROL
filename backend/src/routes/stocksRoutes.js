const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate } = require('../middleware/auth');

// GET - État des stocks
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, p.nom as produit_nom, p.code as produit_code, p.seuil_alerte,
             p.unite, c.nom as categorie_nom
      FROM stocks s
      JOIN produits p ON s.produit_id = p.id
      LEFT JOIN categories_produits c ON p.categorie_id = c.id
      ORDER BY p.nom
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Stock d'un produit
router.get('/produit/:produitId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stocks WHERE produit_id = $1', [req.params.produitId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Stock non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Mettre à jour un stock (manuel)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { quantite, quantite_reservee, emplacement } = req.body;
    const { rows } = await pool.query(
      `UPDATE stocks SET quantite=$1, quantite_reservee=$2, emplacement=$3 WHERE id=$4 RETURNING *`,
      [quantite, quantite_reservee, emplacement, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Stock non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;