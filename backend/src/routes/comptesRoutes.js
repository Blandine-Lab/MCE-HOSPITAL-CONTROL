const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET - Récupérer tous les comptes avec hiérarchie
router.get('/', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    let query = `
      SELECT c.*, p.nom as parent_nom
      FROM comptes_comptables c
      LEFT JOIN comptes_comptables p ON c.parent_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (type) {
      query += ` AND c.type = $1`;
      params.push(type);
    }
    query += ` ORDER BY c.code`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /comptes :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Récupérer un compte par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.nom as parent_nom
       FROM comptes_comptables c
       LEFT JOIN comptes_comptables p ON c.parent_id = p.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Compte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /comptes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un compte
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, nom, type, parent_id, description } = req.body;
    if (!code || !nom || !type) {
      return res.status(400).json({ error: 'Code, nom et type sont requis' });
    }
    const { rows } = await pool.query(
      `INSERT INTO comptes_comptables (code, nom, type, parent_id, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, nom, type, parent_id || null, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /comptes :', err);
    if (err.constraint === 'comptes_comptables_code_key') {
      return res.status(409).json({ error: 'Ce code de compte existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un compte
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { code, nom, type, parent_id, description } = req.body;
    const { rows } = await pool.query(
      `UPDATE comptes_comptables 
       SET code = $1, nom = $2, type = $3, parent_id = $4, description = $5
       WHERE id = $6
       RETURNING *`,
      [code, nom, type, parent_id || null, description, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Compte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /comptes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un compte (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM comptes_comptables WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Compte non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /comptes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;