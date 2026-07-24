const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /absences – Liste avec alias pour le frontend
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             e.nom AS employe_nom, 
             e.prenom AS employe_prenom
      FROM absences a
      JOIN employes e ON a.employe_id = e.id
      ORDER BY a.date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /absences :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /absences/:id – Détail avec alias
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             e.nom AS employe_nom, 
             e.prenom AS employe_prenom
      FROM absences a
      JOIN employes e ON a.employe_id = e.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Absence non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /absences – Création (inchangé)
router.post('/', authenticate, async (req, res) => {
  try {
    const { employe_id, date, motif, justifiee } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO absences (employe_id, date, motif, justifiee) VALUES ($1,$2,$3,$4) RETURNING *`,
      [employe_id, date, motif, justifiee || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /absences :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /absences/:id – Modification (inchangé)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { employe_id, date, motif, justifiee } = req.body;
    const { rows } = await pool.query(
      `UPDATE absences SET employe_id=$1, date=$2, motif=$3, justifiee=$4 WHERE id=$5 RETURNING *`,
      [employe_id, date, motif, justifiee, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Absence non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /absences/:id – Suppression réservée aux administrateurs
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM absences WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Absence non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /absences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;