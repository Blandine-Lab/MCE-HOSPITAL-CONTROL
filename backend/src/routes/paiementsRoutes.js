const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth'); // ✅ import requireAdmin

// GET - Tous les paiements avec filtres
router.get('/', authenticate, async (req, res) => {
  try {
    const { facture_id, date_debut, date_fin, mode_paiement } = req.query;
    let query = `
      SELECT p.*, 
             f.numero_facture,
             u.nom as created_by_nom
      FROM paiements p
      JOIN factures f ON p.facture_id = f.id
      LEFT JOIN utilisateurs u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (facture_id) {
      query += ` AND p.facture_id = $${idx++}`;
      params.push(facture_id);
    }
    if (date_debut) {
      query += ` AND p.date_paiement >= $${idx++}`;
      params.push(date_debut);
    }
    if (date_fin) {
      query += ` AND p.date_paiement <= $${idx++}`;
      params.push(date_fin);
    }
    if (mode_paiement) {
      query += ` AND p.mode_paiement = $${idx++}`;
      params.push(mode_paiement);
    }

    query += ` ORDER BY p.date_paiement DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /paiements :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Paiement par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, f.numero_facture, u.nom as created_by_nom
       FROM paiements p
       JOIN factures f ON p.facture_id = f.id
       LEFT JOIN utilisateurs u ON p.created_by = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur GET /paiements/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un paiement
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { facture_id, montant, date_paiement, mode_paiement, reference, notes } = req.body;
    const userId = req.user.id;

    const { rows: paiementRows } = await client.query(
      `INSERT INTO paiements (facture_id, montant, date_paiement, mode_paiement, reference, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [facture_id, montant, date_paiement || new Date().toISOString().split('T')[0], mode_paiement, reference, notes, userId]
    );

    await client.query(
      `UPDATE factures 
       SET statut_paiement = 'payée', date_dernier_paiement = $1
       WHERE id = $2`,
      [date_paiement || new Date().toISOString().split('T')[0], facture_id]
    );

    await client.query('COMMIT');
    res.status(201).json(paiementRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST /paiements :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ DELETE - Supprimer un paiement (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM paiements WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Paiement non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /paiements/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;