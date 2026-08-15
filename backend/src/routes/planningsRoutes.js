const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Connexion PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
pool.on('connect', () => console.log('✅ RH - Plannings : connecté à PostgreSQL'));

// GET tous les plannings (avec filtres) – LEFT JOIN pour garder les plannings orphelins
router.get('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin } = req.query;
    let query = `
      SELECT p.*,
             e.nom AS employe_nom,
             e.prenom AS employe_prenom
      FROM plannings p
      LEFT JOIN employes e ON p.employe_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (employe_id) { query += ` AND p.employe_id = $${idx++}`; params.push(employe_id); }
    if (date_debut && date_fin) { query += ` AND p.date BETWEEN $${idx++} AND $${idx++}`; params.push(date_debut, date_fin); }
    query += ` ORDER BY p.date DESC, p.heure_debut`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /plannings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET un planning par ID – LEFT JOIN également
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*,
             e.nom AS employe_nom,
             e.prenom AS employe_prenom
      FROM plannings p
      LEFT JOIN employes e ON p.employe_id = e.id
      WHERE p.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Planning non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /plannings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST – Créer un planning (champs: employe_id, date, heure_debut, heure_fin, type, notes)
router.post('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date, heure_debut, heure_fin, type, notes } = req.body;

    // Validation – on exige employe_id, date et type
    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    // Vérifier que l'employé existe (pour la création, on refuse si inexistant)
    const empCheck = await pool.query('SELECT id FROM employes WHERE id = $1', [employe_id]);
    if (empCheck.rowCount === 0) {
      return res.status(400).json({ error: 'Employé inexistant' });
    }

    const query = `
      INSERT INTO plannings (employe_id, date, heure_debut, heure_fin, type, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [employe_id, date, heure_debut || null, heure_fin || null, type, notes || null];
    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error('POST /plannings error:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT – Mettre à jour un planning (champs: employe_id, date, heure_debut, heure_fin, type, notes)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { employe_id, date, heure_debut, heure_fin, type, notes } = req.body;

    if (!employe_id || !date || !type) {
      return res.status(400).json({ error: 'employe_id, date et type sont requis' });
    }

    const query = `
      UPDATE plannings SET
        employe_id = $1,
        date = $2,
        heure_debut = $3,
        heure_fin = $4,
        type = $5,
        notes = $6
      WHERE id = $7
      RETURNING *
    `;
    const values = [employe_id, date, heure_debut || null, heure_fin || null, type, notes || null, req.params.id];
    const { rows } = await pool.query(query, values);
    if (!rows.length) return res.status(404).json({ error: 'Planning non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /plannings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE – Supprimer un planning (admin uniquement)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM plannings WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Planning non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /plannings/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;