const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth'); // ✅ import requireAdmin

// GET tous les plannings (avec filtres optionnels)
router.get('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date_debut, date_fin } = req.query;
    let query = `
      SELECT p.*, e.nom, e.prenom
      FROM plannings p
      JOIN employes e ON p.employe_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (employe_id) { query += ` AND p.employe_id = $${idx++}`; params.push(employe_id); }
    if (date_debut && date_fin) { query += ` AND p.date BETWEEN $${idx++} AND $${idx++}`; params.push(date_debut, date_fin); }
    query += ` ORDER BY p.date DESC, p.heure_debut`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, e.nom, e.prenom
      FROM plannings p
      JOIN employes e ON p.employe_id = e.id
      WHERE p.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Planning non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date, heure_debut, heure_fin, type, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO plannings (employe_id, date, heure_debut, heure_fin, type, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employe_id, date, heure_debut, heure_fin, type, notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { employe_id, date, heure_debut, heure_fin, type, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE plannings SET employe_id=$1, date=$2, heure_debut=$3, heure_fin=$4, type=$5, notes=$6
       WHERE id=$7 RETURNING *`,
      [employe_id, date, heure_debut, heure_fin, type, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Planning non trouvé' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ DELETE - Supprimer un planning (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM plannings WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Planning non trouvé' });
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;