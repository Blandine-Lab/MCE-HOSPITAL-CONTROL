const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET - Tous les signalements avec filtres
router.get('/', authenticate, async (req, res) => {
  try {
    const { statut, categorie, priorite, date_debut, date_fin } = req.query;
    let query = `
      SELECT s.*, 
             c.nom as categorie_nom,
             nc.nom as criticite_nom,
             nc.couleur as criticite_couleur,
             p.nom as patient_nom,
             p.prenom as patient_prenom,
             u.nom as declare_par_nom,
             u2.nom as responsable_nom
      FROM signalements s
      LEFT JOIN categories_evenements c ON s.categorie_id = c.id
      LEFT JOIN niveaux_criticite nc ON s.criticite_id = nc.id
      LEFT JOIN patients p ON s.patient_id = p.id
      LEFT JOIN utilisateurs u ON s.declare_par = u.id
      LEFT JOIN utilisateurs u2 ON s.responsable_traitement = u2.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (statut) { query += ` AND s.statut = $${idx++}`; params.push(statut); }
    if (categorie) { query += ` AND s.categorie_id = $${idx++}`; params.push(categorie); }
    if (priorite) { query += ` AND s.priorite = $${idx++}`; params.push(priorite); }
    if (date_debut) { query += ` AND s.date_signalement >= $${idx++}`; params.push(date_debut); }
    if (date_fin) { query += ` AND s.date_signalement <= $${idx++}`; params.push(date_fin); }

    query += ` ORDER BY s.date_signalement DESC, s.id DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Signalement par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, 
             c.nom as categorie_nom,
             nc.nom as criticite_nom,
             nc.couleur as criticite_couleur,
             p.nom as patient_nom,
             p.prenom as patient_prenom,
             u.nom as declare_par_nom,
             u2.nom as responsable_nom
      FROM signalements s
      LEFT JOIN categories_evenements c ON s.categorie_id = c.id
      LEFT JOIN niveaux_criticite nc ON s.criticite_id = nc.id
      LEFT JOIN patients p ON s.patient_id = p.id
      LEFT JOIN utilisateurs u ON s.declare_par = u.id
      LEFT JOIN utilisateurs u2 ON s.responsable_traitement = u2.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Signalement non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un signalement
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      date_evenement, categorie_id, criticite_id, patient_id, 
      employe_id, service_id, description, circonstances, 
      consequence_patient, actions_immediates, priorite 
    } = req.body;
    
    const userId = req.user.id;
    const { rows: numRows } = await pool.query(
      "SELECT 'SIG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(numero_signalement FROM 'SIG-[0-9]{8}-([0-9]+)$') AS INTEGER)), 0) + 1, 4, '0') as numero FROM signalements WHERE numero_signalement LIKE 'SIG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'"
    );
    const numero_signalement = numRows[0].numero;

    const { rows } = await pool.query(`
      INSERT INTO signalements (
        numero_signalement, date_evenement, categorie_id, criticite_id,
        patient_id, employe_id, service_id, description, circonstances,
        consequence_patient, actions_immediates, priorite, declare_par
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [numero_signalement, date_evenement, categorie_id, criticite_id, 
        patient_id, employe_id, service_id, description, circonstances,
        consequence_patient, actions_immediates, priorite, userId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un signalement
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { 
      categorie_id, criticite_id, patient_id, employe_id, service_id,
      description, circonstances, consequence_patient, actions_immediates,
      priorite, responsable_traitement
    } = req.body;
    const { rows } = await pool.query(`
      UPDATE signalements 
      SET categorie_id = $1, criticite_id = $2, patient_id = $3,
          employe_id = $4, service_id = $5, description = $6,
          circonstances = $7, consequence_patient = $8,
          actions_immediates = $9, priorite = $10,
          responsable_traitement = $11
      WHERE id = $12
      RETURNING *
    `, [categorie_id, criticite_id, patient_id, employe_id, service_id,
        description, circonstances, consequence_patient, actions_immediates,
        priorite, responsable_traitement, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Signalement non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Changer le statut
router.put('/:id/statut', authenticate, async (req, res) => {
  try {
    const { statut, date_resolution, resolution_notes } = req.body;
    const { rows } = await pool.query(`
      UPDATE signalements 
      SET statut = $1, date_resolution = $2, resolution_notes = $3
      WHERE id = $4
      RETURNING *
    `, [statut, date_resolution, resolution_notes, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Signalement non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer un signalement (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM signalements WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Signalement non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;