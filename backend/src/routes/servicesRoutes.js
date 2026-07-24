const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ RH - Services : connecté à PostgreSQL'));

// GET tous les services (version simplifiée, sans jointure)
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /services :', err);
    if (err.message.includes('relation "services" does not exist')) {
      return res.status(500).json({ 
        error: 'La table services n\'existe pas encore. Veuillez exécuter le script SQL de création.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET un service par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST créer un service
router.post('/', authenticate, async (req, res) => {
  try {
    const { nom, description } = req.body;
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom est requis' });
    }
    const { rows } = await pool.query(
      'INSERT INTO services (nom, description) VALUES ($1, $2) RETURNING *',
      [nom.trim(), description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /services :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier un service
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { nom, description } = req.body;
    const { rows } = await pool.query(
      'UPDATE services SET nom = $1, description = $2 WHERE id = $3 RETURNING *',
      [nom, description, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE supprimer un service (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;