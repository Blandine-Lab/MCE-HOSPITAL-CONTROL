const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth'); // ✅ import requireAdmin

router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, gravite, source } = req.query;
    let query = `
      SELECT nc.*, s.nom as service_nom, u.nom as created_by_nom
      FROM non_conformites nc
      LEFT JOIN services s ON nc.service_id = s.id
      LEFT JOIN utilisateurs u ON nc.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (statut) { query += ` AND nc.statut = $${idx++}`; params.push(statut); }
    if (gravite) { query += ` AND nc.gravite = $${idx++}`; params.push(gravite); }
    if (source) { query += ` AND nc.source = $${idx++}`; params.push(source); }
    query += ` ORDER BY nc.date_detection DESC`;
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
      SELECT nc.*, s.nom as service_nom, u.nom as created_by_nom
      FROM non_conformites nc
      LEFT JOIN services s ON nc.service_id = s.id
      LEFT JOIN utilisateurs u ON nc.created_by = u.id
      WHERE nc.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Non-conformité non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { numero_nc, date_detection, source, source_id, description,
            gravite, service_id, action_immediate } = req.body;
    const userId = req.user.id;
    const { rows } = await pool.query(`
      INSERT INTO non_conformites (
        numero_nc, date_detection, source, source_id, description,
        gravite, service_id, action_immediate, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [numero_nc, date_detection, source, source_id, description,
        gravite, service_id, action_immediate, userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { source, source_id, description, gravite, service_id,
            action_immediate, cause_racine, action_corrective_id,
            statut, date_cloture } = req.body;
    const { rows } = await pool.query(`
      UPDATE non_conformites 
      SET source = $1, source_id = $2, description = $3, gravite = $4,
          service_id = $5, action_immediate = $6, cause_racine = $7,
          action_corrective_id = $8, statut = $9, date_cloture = $10
      WHERE id = $11
      RETURNING *
    `, [source, source_id, description, gravite, service_id,
        action_immediate, cause_racine, action_corrective_id,
        statut, date_cloture, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Non-conformité non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /:id – Supprimer une non-conformité (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM non_conformites WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Non-conformité non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;