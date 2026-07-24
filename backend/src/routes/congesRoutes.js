const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ RH - Congés : connecté à PostgreSQL'));

router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, e.nom, e.prenom
      FROM conges c
      JOIN employes e ON c.employe_id = e.id
      ORDER BY c.date_debut DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, e.nom, e.prenom
      FROM conges c
      JOIN employes e ON c.employe_id = e.id
      WHERE c.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Congé non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin, type, statut, commentaire } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO conges (employe_id, date_debut, date_fin, type, statut, commentaire)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employe_id, date_debut, date_fin, type, statut || 'en_attente', commentaire]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin, type, statut, commentaire } = req.body;
    const { rows } = await pool.query(
      `UPDATE conges SET employe_id=$1, date_debut=$2, date_fin=$3, type=$4, statut=$5, commentaire=$6
       WHERE id=$7 RETURNING *`,
      [employe_id, date_debut, date_fin, type, statut, commentaire, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Congé non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ DELETE - Supprimer un congé (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM conges WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Congé non trouvé' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;