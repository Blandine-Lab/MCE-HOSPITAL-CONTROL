const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Qualité - Évaluations des risques : connecté à PostgreSQL'));

router.get('/', authenticate, async (req, res) => {
  try {
    const { service_id, type, niveau_risque } = req.query;
    let query = `
      SELECT er.*, s.nom as service_nom, u.nom as evalue_par_nom
      FROM evaluations_risques er
      LEFT JOIN services s ON er.service_id = s.id
      LEFT JOIN utilisateurs u ON er.evalue_par = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (service_id) { query += ` AND er.service_id = $${idx++}`; params.push(service_id); }
    if (type) { query += ` AND er.type = $${idx++}`; params.push(type); }
    if (niveau_risque) { query += ` AND er.niveau_risque = $${idx++}`; params.push(niveau_risque); }
    query += ` ORDER BY er.date_evaluation DESC`;
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
      SELECT er.*, s.nom as service_nom, u.nom as evalue_par_nom
      FROM evaluations_risques er
      LEFT JOIN services s ON er.service_id = s.id
      LEFT JOIN utilisateurs u ON er.evalue_par = u.id
      WHERE er.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Évaluation non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { numero_evaluation, date_evaluation, service_id, type,
            description, probabilite, impact, maitrise_actuelle,
            actions_reduction } = req.body;
    const userId = req.user.id;
    const { rows } = await pool.query(`
      INSERT INTO evaluations_risques (
        numero_evaluation, date_evaluation, service_id, type,
        description, probabilite, impact, maitrise_actuelle,
        actions_reduction, evalue_par
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [numero_evaluation, date_evaluation, service_id, type,
        description, probabilite, impact, maitrise_actuelle,
        actions_reduction, userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { service_id, type, description, probabilite, impact,
            maitrise_actuelle, actions_reduction, statut } = req.body;
    const { rows } = await pool.query(`
      UPDATE evaluations_risques 
      SET service_id = $1, type = $2, description = $3,
          probabilite = $4, impact = $5, maitrise_actuelle = $6,
          actions_reduction = $7, statut = $8
      WHERE id = $9
      RETURNING *
    `, [service_id, type, description, probabilite, impact,
        maitrise_actuelle, actions_reduction, statut, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Évaluation non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /:id – Supprimer une évaluation des risques (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM evaluations_risques WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Évaluation non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;