const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireAdmin } = require('../middleware/auth');

// ============================================================
// Helper : pose le tenant dans la transaction courante
// ============================================================
async function setTenant(client, hospitalId) {
  await client.query(
    `SELECT set_config('app.hospital_id', $1, true)`,
    [String(hospitalId)]
  );
}

// GET - Mouvements avec filtres
router.get('/', authenticate, async (req, res) => {
  try {
    const { produit_id, type, date_debut, date_fin } = req.query;
    let query = `
      SELECT m.*, 
             p.nom AS produit_nom, 
             p.code AS produit_code,
             u.nom AS created_by_nom
      FROM mouvements_stock m
      JOIN produits p ON m.produit_id = p.id
      LEFT JOIN utilisateurs u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (produit_id) { query += ` AND m.produit_id = $${idx++}`; params.push(produit_id); }
    if (type) { query += ` AND m.type = $${idx++}`; params.push(type); }
    if (date_debut) { query += ` AND m.date_mouvement >= $${idx++}`; params.push(date_debut); }
    if (date_fin) { query += ` AND m.date_mouvement <= $${idx++}`; params.push(date_fin); }
    query += ` ORDER BY m.date_mouvement DESC, m.id DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /mouvements :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Enregistrer un mouvement (entrée/sortie)
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);   // ✅ FIX : poser le tenant

    const { produit_id, type, quantite, reference, motif, date_mouvement } = req.body;
    const userId = req.user.id;

    // ✅ FIX : hospital_id explicite dans mouvements_stock
    const { rows: movRows } = await client.query(
      `INSERT INTO mouvements_stock (hospital_id, produit_id, type, quantite, reference, motif, date_mouvement, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.hospitalId, produit_id, type, quantite, reference, motif, date_mouvement, userId]
    );

    if (type === 'entree') {
      await client.query(
        `UPDATE stocks SET quantite = quantite + $1, date_derniere_entree = $2 WHERE produit_id = $3`,
        [quantite, date_mouvement, produit_id]
      );
    } else if (type === 'sortie') {
      const { rows: stockRows } = await client.query('SELECT quantite FROM stocks WHERE produit_id = $1', [produit_id]);
      if (stockRows.length === 0 || stockRows[0].quantite < quantite) {
        throw new Error('Stock insuffisant');
      }
      await client.query(
        `UPDATE stocks SET quantite = quantite - $1, date_derniere_sortie = $2 WHERE produit_id = $3`,
        [quantite, date_mouvement, produit_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(movRows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Erreur POST /mouvements :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ DELETE - Supprimer un mouvement (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT produit_id, type, quantite FROM mouvements_stock WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Mouvement non trouvé' });
    }
    
    // On supprime le mouvement (le stock n'est pas ajusté automatiquement pour éviter les incohérences historiques)
    await pool.query('DELETE FROM mouvements_stock WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Erreur DELETE /mouvements/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;