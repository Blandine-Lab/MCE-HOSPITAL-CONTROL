const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Qualité - Indicateurs : connecté à PostgreSQL'));

router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, categorie } = req.query;
    let query = `SELECT * FROM indicateurs_qualite WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (statut) { query += ` AND statut = $${idx++}`; params.push(statut); }
    if (categorie) { query += ` AND categorie = $${idx++}`; params.push(categorie); }
    query += ` ORDER BY code`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM indicateurs_qualite WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Indicateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { code, nom, description, categorie, unite, cible, seuil_alerte, formule, periode, statut } = req.body;
    const userId = req.user.id;
    const { rows } = await pool.query(`
      INSERT INTO indicateurs_qualite (
        code, nom, description, categorie, unite, cible, seuil_alerte,
        formule, periode, statut, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [code, nom, description, categorie, unite, cible, seuil_alerte,
        formule, periode, statut || 'actif', userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { code, nom, description, categorie, unite, cible, seuil_alerte, formule, periode, statut } = req.body;
    const { rows } = await pool.query(`
      UPDATE indicateurs_qualite 
      SET code = $1, nom = $2, description = $3, categorie = $4, unite = $5,
          cible = $6, seuil_alerte = $7, formule = $8, periode = $9, statut = $10
      WHERE id = $11
      RETURNING *
    `, [code, nom, description, categorie, unite, cible, seuil_alerte,
        formule, periode, statut, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Indicateur non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Valeurs d'un indicateur
router.get('/:id/valeurs', authenticate, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    let query = `
      SELECT v.*, u.nom as created_by_nom
      FROM valeurs_indicateurs v
      LEFT JOIN utilisateurs u ON v.created_by = u.id
      WHERE v.indicateur_id = $1
    `;
    const params = [req.params.id];
    let idx = 2;
    if (date_debut) { query += ` AND v.date_valeur >= $${idx++}`; params.push(date_debut); }
    if (date_fin) { query += ` AND v.date_valeur <= $${idx++}`; params.push(date_fin); }
    query += ` ORDER BY v.date_valeur DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Ajouter une valeur
router.post('/:id/valeurs', authenticate, async (req, res) => {
  try {
    const { date_valeur, valeur, commentaire } = req.body;
    const userId = req.user.id;
    const { rows } = await pool.query(`
      INSERT INTO valeurs_indicateurs (indicateur_id, date_valeur, valeur, commentaire, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.params.id, date_valeur, valeur, commentaire, userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un indicateur (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Supprimer d'abord les valeurs associées (cascade)
    await pool.query('DELETE FROM valeurs_indicateurs WHERE indicateur_id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM indicateurs_qualite WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Indicateur non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;