const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Stock - Inventaires : connecté à PostgreSQL'));

// GET - Liste des inventaires
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, u.nom as created_by_nom
      FROM inventaires i
      LEFT JOIN utilisateurs u ON i.created_by = u.id
      ORDER BY i.date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /inventaires :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Inventaire par ID avec lignes
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows: invRows } = await pool.query('SELECT * FROM inventaires WHERE id = $1', [req.params.id]);
    if (invRows.length === 0) return res.status(404).json({ error: 'Inventaire non trouvé' });
    const { rows: lignesRows } = await pool.query(`
      SELECT il.*, p.nom as produit_nom, p.code as produit_code
      FROM inventaire_lignes il
      JOIN produits p ON il.produit_id = p.id
      WHERE il.inventaire_id = $1
    `, [req.params.id]);
    res.json({ ...invRows[0], lignes: lignesRows });
  } catch (err) {
    console.error('Erreur GET /inventaires/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un inventaire (avec lignes)
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { date, type, notes, lignes } = req.body;
    const userId = req.user.id;

    const { rows: invRows } = await client.query(
      `INSERT INTO inventaires (date, type, statut, notes, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [date || new Date().toISOString().split('T')[0], type, 'en_cours', notes, userId]
    );
    const invId = invRows[0].id;

    for (const l of lignes) {
      const { rows: stockRows } = await client.query('SELECT quantite FROM stocks WHERE produit_id = $1', [l.produit_id]);
      const quantite_theorique = stockRows.length > 0 ? stockRows[0].quantite : 0;
      const quantite_reelle = l.quantite_reelle || 0;

      await client.query(
        `INSERT INTO inventaire_lignes (inventaire_id, produit_id, quantite_theorique, quantite_reelle)
         VALUES ($1, $2, $3, $4)`,
        [invId, l.produit_id, quantite_theorique, quantite_reelle]
      );

      await client.query(
        `UPDATE stocks SET quantite = $1 WHERE produit_id = $2`,
        [quantite_reelle, l.produit_id]
      );
    }

    await client.query(
      `UPDATE inventaires SET statut = 'terminé' WHERE id = $1`,
      [invId]
    );

    await client.query('COMMIT');
    res.status(201).json(invRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST /inventaires :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ DELETE /:id – Supprimer un inventaire (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Supprimer d'abord les lignes associées
    await pool.query('DELETE FROM inventaire_lignes WHERE inventaire_id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM inventaires WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Inventaire non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /inventaires/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;