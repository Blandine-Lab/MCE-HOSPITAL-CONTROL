const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, service_id } = req.query;
    let query = `
      SELECT a.*, s.nom as service_nom, u.nom as created_by_nom
      FROM audits a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN utilisateurs u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (statut) { query += ` AND a.statut = $${idx++}`; params.push(statut); }
    if (service_id) { query += ` AND a.service_id = $${idx++}`; params.push(service_id); }
    query += ` ORDER BY a.date_debut DESC`;
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
      SELECT a.*, s.nom as service_nom, u.nom as created_by_nom
      FROM audits a
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN utilisateurs u ON a.created_by = u.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Audit non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { numero_audit, titre, type, service_id, date_debut, date_fin,
            auditeur_principal, equipe_audit, objectif, scope, criteres } = req.body;
    const userId = req.user.id;
    const { rows } = await pool.query(`
      INSERT INTO audits (
        numero_audit, titre, type, service_id, date_debut, date_fin,
        auditeur_principal, equipe_audit, objectif, scope, criteres, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [numero_audit, titre, type, service_id, date_debut, date_fin,
        auditeur_principal, equipe_audit, objectif, scope, criteres, userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { titre, type, service_id, date_debut, date_fin,
            auditeur_principal, equipe_audit, objectif, scope, criteres,
            constatations, conclusion, recommandations, statut } = req.body;
    const { rows } = await pool.query(`
      UPDATE audits 
      SET titre = $1, type = $2, service_id = $3, date_debut = $4,
          date_fin = $5, auditeur_principal = $6, equipe_audit = $7,
          objectif = $8, scope = $9, criteres = $10,
          constatations = $11, conclusion = $12, recommandations = $13, statut = $14
      WHERE id = $15
      RETURNING *
    `, [titre, type, service_id, date_debut, date_fin,
        auditeur_principal, equipe_audit, objectif, scope, criteres,
        constatations, conclusion, recommandations, statut, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Audit non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /:id – Suppression réservée aux administrateurs
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM audits WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Audit non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;