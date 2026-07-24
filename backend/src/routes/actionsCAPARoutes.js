const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, type } = req.query;
    let query = `
      SELECT a.*, u.nom as responsable_nom, u2.nom as created_by_nom
      FROM actions_capa a
      LEFT JOIN utilisateurs u ON a.responsable_id = u.id
      LEFT JOIN utilisateurs u2 ON a.created_by = u2.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (statut) { query += ` AND a.statut = $${idx++}`; params.push(statut); }
    if (type) { query += ` AND a.type = $${idx++}`; params.push(type); }
    query += ` ORDER BY a.date_prevue ASC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.nom as responsable_nom, u2.nom as created_by_nom
      FROM actions_capa a
      LEFT JOIN utilisateurs u ON a.responsable_id = u.id
      LEFT JOIN utilisateurs u2 ON a.created_by = u2.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Action non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { numero_action, titre, type, signalement_id, audit_id, description,
            cause_racine, action_planifiee, responsable_id, date_prevue } = req.body;
    const userId = req.user.id;
    const { rows } = await pool.query(`
      INSERT INTO actions_capa (
        numero_action, titre, type, signalement_id, audit_id, description,
        cause_racine, action_planifiee, responsable_id, date_prevue, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [numero_action, titre, type, signalement_id, audit_id, description,
        cause_racine, action_planifiee, responsable_id, date_prevue, userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { titre, type, signalement_id, audit_id, description,
            cause_racine, action_planifiee, responsable_id, date_prevue,
            date_realisation, statut, efficacite, verification_par, date_verification } = req.body;
    const { rows } = await pool.query(`
      UPDATE actions_capa 
      SET titre = $1, type = $2, signalement_id = $3, audit_id = $4,
          description = $5, cause_racine = $6, action_planifiee = $7,
          responsable_id = $8, date_prevue = $9, date_realisation = $10,
          statut = $11, efficacite = $12, verification_par = $13, date_verification = $14
      WHERE id = $15
      RETURNING *
    `, [titre, type, signalement_id, audit_id, description,
        cause_racine, action_planifiee, responsable_id, date_prevue,
        date_realisation, statut, efficacite, verification_par, date_verification, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Action non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /:id – Suppression réservée aux administrateurs
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM actions_capa WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Action non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;