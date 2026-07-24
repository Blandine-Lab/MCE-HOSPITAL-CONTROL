const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Finances - Écritures : connecté à PostgreSQL'));

// GET - Récupérer toutes les écritures avec filtres et pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const { date_debut, date_fin, journal_id, statut, limit, offset } = req.query;
    
    let query = `
      SELECT e.*, 
             j.nom as journal_nom,
             u.nom as created_by_nom,
             u2.nom as validated_by_nom
      FROM ecritures e
      LEFT JOIN journaux j ON e.journal_id = j.id
      LEFT JOIN utilisateurs u ON e.created_by = u.id
      LEFT JOIN utilisateurs u2 ON e.validated_by = u2.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (date_debut) {
      query += ` AND e.date_ecriture >= $${idx++}`;
      params.push(date_debut);
    }
    if (date_fin) {
      query += ` AND e.date_ecriture <= $${idx++}`;
      params.push(date_fin);
    }
    if (journal_id) {
      query += ` AND e.journal_id = $${idx++}`;
      params.push(journal_id);
    }
    if (statut) {
      query += ` AND e.statut = $${idx++}`;
      params.push(statut);
    }

    query += ` ORDER BY e.date_ecriture DESC, e.id DESC`;

    if (limit) {
      query += ` LIMIT $${idx++}`;
      params.push(parseInt(limit));
    }
    if (offset) {
      query += ` OFFSET $${idx++}`;
      params.push(parseInt(offset));
    }

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ecritures :', err);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des écritures',
      detail: err.message,
      code: err.code
    });
  }
});

// GET - Récupérer une écriture par ID avec ses lignes
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { rows: ecritureRows } = await pool.query(
      `SELECT e.*, 
              j.nom as journal_nom,
              u.nom as created_by_nom,
              u2.nom as validated_by_nom
       FROM ecritures e
       LEFT JOIN journaux j ON e.journal_id = j.id
       LEFT JOIN utilisateurs u ON e.created_by = u.id
       LEFT JOIN utilisateurs u2 ON e.validated_by = u2.id
       WHERE e.id = $1`,
      [id]
    );
    if (ecritureRows.length === 0) {
      return res.status(404).json({ error: 'Écriture non trouvée' });
    }

    const { rows: lignesRows } = await pool.query(
      `SELECT el.*, 
              c.code as compte_code,
              c.nom as compte_nom
       FROM ecriture_lignes el
       JOIN comptes_comptables c ON el.compte_id = c.id
       WHERE el.ecriture_id = $1
       ORDER BY el.id`,
      [id]
    );

    res.json({
      ...ecritureRows[0],
      lignes: lignesRows
    });
  } catch (err) {
    console.error('❌ Erreur GET /ecritures/:id :', err);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de l\'écriture',
      detail: err.message,
      code: err.code
    });
  }
});

// POST - Créer une écriture
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { journal_id, date_ecriture, libelle, lignes } = req.body;
    const userId = req.user.id;

    const { rows: numRows } = await client.query(
      "SELECT 'PC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(numero_piece FROM 'PC-[0-9]{8}-([0-9]+)$') AS INTEGER)), 0) + 1, 4, '0') as numero FROM ecritures WHERE numero_piece LIKE 'PC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'"
    );
    const numero_piece = numRows[0].numero;

    let totalDebit = 0;
    let totalCredit = 0;
    lignes.forEach(l => {
      if (l.sens === 'debit') totalDebit += parseFloat(l.montant);
      else totalCredit += parseFloat(l.montant);
    });
    if (totalDebit !== totalCredit) {
      return res.status(400).json({ error: 'Les totaux débit et crédit doivent être égaux' });
    }

    const { rows: ecritureRows } = await client.query(
      `INSERT INTO ecritures (numero_piece, journal_id, date_ecriture, libelle, montant_total, created_by, statut)
       VALUES ($1, $2, $3, $4, $5, $6, 'brouillon')
       RETURNING *`,
      [numero_piece, journal_id, date_ecriture || new Date().toISOString().split('T')[0], libelle, totalDebit, userId]
    );

    const ecritureId = ecritureRows[0].id;

    for (const ligne of lignes) {
      await client.query(
        `INSERT INTO ecriture_lignes (ecriture_id, compte_id, sens, montant, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [ecritureId, ligne.compte_id, ligne.sens, ligne.montant, ligne.description]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(ecritureRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur POST /ecritures :', err);
    res.status(500).json({ 
      error: 'Erreur lors de la création de l\'écriture',
      detail: err.message,
      code: err.code
    });
  } finally {
    client.release();
  }
});

// PUT - Valider une écriture (changement de statut)
router.put('/:id/valider', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rows } = await pool.query(
      `UPDATE ecritures 
       SET statut = 'validé', validated_by = $2
       WHERE id = $1 AND statut = 'brouillon'
       RETURNING *`,
      [id, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Écriture non trouvée ou déjà validée' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur PUT /ecritures/:id/valider :', err);
    res.status(500).json({ 
      error: 'Erreur lors de la validation',
      detail: err.message,
      code: err.code
    });
  }
});

// PUT - Annuler une écriture
router.put('/:id/annuler', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE ecritures 
       SET statut = 'annulé'
       WHERE id = $1 AND statut IN ('brouillon', 'validé')
       RETURNING *`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Écriture non trouvée ou déjà annulée' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur PUT /ecritures/:id/annuler :', err);
    res.status(500).json({ 
      error: 'Erreur lors de l\'annulation',
      detail: err.message,
      code: err.code
    });
  }
});

// ✅ DELETE - Supprimer une écriture (seulement si brouillon) – réservé aux administrateurs
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM ecritures WHERE id = $1 AND statut = \'brouillon\'',
      [id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Écriture non trouvée ou ne peut pas être supprimée' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('❌ Erreur DELETE /ecritures/:id :', err);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression',
      detail: err.message,
      code: err.code
    });
  }
});

// GET - Statistiques financières
router.get('/stats/global', authenticate, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    const params = [];
    let idx = 1;
    let dateFilter = '';

    if (date_debut && date_fin) {
      dateFilter = ` AND e.date_ecriture BETWEEN $${idx} AND $${idx+1}`;
      params.push(date_debut, date_fin);
      idx += 2;
    }

    const { rows } = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN el.sens = 'debit' THEN el.montant ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN el.sens = 'credit' THEN el.montant ELSE 0 END), 0) as total_credit,
        COUNT(DISTINCT e.id) as total_ecritures,
        COUNT(DISTINCT CASE WHEN e.statut = 'validé' THEN e.id END) as ecritures_validees
      FROM ecritures e
      JOIN ecriture_lignes el ON e.id = el.ecriture_id
      WHERE e.statut != 'annulé' ${dateFilter}
    `, params);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur GET /ecritures/stats/global :', err);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques',
      detail: err.message,
      code: err.code
    });
  }
});

module.exports = router;