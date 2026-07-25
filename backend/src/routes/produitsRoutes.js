const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Stock - Produits : connecté à PostgreSQL'));

// ================================================================
// ========== CATÉGORIES DE PRODUITS ==============================
// ================================================================

// GET /categories-produits – Liste des catégories (pour les formulaires)
router.get('/categories-produits', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nom, description
      FROM categories_produits
      ORDER BY nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /categories-produits :', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ========== PRODUITS (CRUD) ====================================
// ================================================================

// GET - Liste des produits avec catégorie et stock
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.nom as categorie_nom, 
             COALESCE(s.quantite, 0) as stock_actuel,
             COALESCE(s.quantite_reservee, 0) as quantite_reservee,
             s.emplacement
      FROM produits p
      LEFT JOIN categories_produits c ON p.categorie_id = c.id
      LEFT JOIN stocks s ON p.id = s.produit_id
      ORDER BY p.nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /produits :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Produit par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, c.nom as categorie_nom,
             COALESCE(s.quantite, 0) as stock_actuel,
             COALESCE(s.quantite_reservee, 0) as quantite_reservee,
             s.emplacement
      FROM produits p
      LEFT JOIN categories_produits c ON p.categorie_id = c.id
      LEFT JOIN stocks s ON p.id = s.produit_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Produit non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /produits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un produit
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { code, nom, description, categorie_id, unite, prix_achat, prix_vente, seuil_alerte } = req.body;

    // ✅ Convertir categorie_id vide en NULL
    const categorieId = categorie_id && categorie_id !== '' ? parseInt(categorie_id, 10) : null;

    const { rows: produitRows } = await client.query(
      `INSERT INTO produits (code, nom, description, categorie_id, unite, prix_achat, prix_vente, seuil_alerte)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [code, nom, description, categorieId, unite, prix_achat, prix_vente, seuil_alerte]
    );
    // Créer une ligne de stock initiale
    await client.query(
      `INSERT INTO stocks (produit_id, quantite, quantite_reservee) VALUES ($1, 0, 0)`,
      [produitRows[0].id]
    );
    await client.query('COMMIT');
    res.status(201).json(produitRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST /produits :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT - Modifier un produit
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { code, nom, description, categorie_id, unite, prix_achat, prix_vente, seuil_alerte } = req.body;

    // ✅ Convertir categorie_id vide en NULL
    const categorieId = categorie_id && categorie_id !== '' ? parseInt(categorie_id, 10) : null;

    const { rows } = await pool.query(
      `UPDATE produits SET code=$1, nom=$2, description=$3, categorie_id=$4, unite=$5, prix_achat=$6, prix_vente=$7, seuil_alerte=$8
       WHERE id=$9 RETURNING *`,
      [code, nom, description, categorieId, unite, prix_achat, prix_vente, seuil_alerte, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Produit non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /produits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un produit (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM produits WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Produit non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /produits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;