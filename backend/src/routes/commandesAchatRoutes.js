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

// GET - Liste des commandes avec détails
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, f.nom as fournisseur_nom, u.nom as created_by_nom
      FROM commandes_achat c
      LEFT JOIN fournisseurs f ON c.fournisseur_id = f.id
      LEFT JOIN utilisateurs u ON c.created_by = u.id
      ORDER BY c.date_commande DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Commande par ID avec lignes
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows: cmdRows } = await pool.query(`
      SELECT c.*, f.nom as fournisseur_nom, u.nom as created_by_nom
      FROM commandes_achat c
      LEFT JOIN fournisseurs f ON c.fournisseur_id = f.id
      LEFT JOIN utilisateurs u ON c.created_by = u.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (cmdRows.length === 0) return res.status(404).json({ error: 'Commande non trouvée' });
    const { rows: lignesRows } = await pool.query(`
      SELECT cl.*, p.nom as produit_nom, p.code as produit_code
      FROM commande_lignes cl
      JOIN produits p ON cl.produit_id = p.id
      WHERE cl.commande_id = $1
    `, [req.params.id]);
    res.json({ ...cmdRows[0], lignes: lignesRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer une commande
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);   // ✅ FIX : poser le tenant

    const { fournisseur_id, date_commande, date_livraison_prevue, notes, lignes } = req.body;
    
    // Générer numéro de commande
    const { rows: numRows } = await client.query(
      "SELECT 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(numero_commande FROM 'CMD-[0-9]{8}-([0-9]+)$') AS INTEGER)), 0) + 1, 4, '0') as numero FROM commandes_achat WHERE numero_commande LIKE 'CMD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'"
    );
    const numero_commande = numRows[0].numero;
    const userId = req.user.id;
    let montant_total = 0;
    lignes.forEach(l => montant_total += l.quantite * l.prix_unitaire);

    // ✅ FIX : hospital_id explicite dans commandes_achat
    const { rows: cmdRows } = await client.query(
      `INSERT INTO commandes_achat (hospital_id, numero_commande, fournisseur_id, date_commande, date_livraison_prevue, montant_total, notes, created_by, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'commandé') RETURNING *`,
      [req.hospitalId, numero_commande, fournisseur_id, date_commande, date_livraison_prevue, montant_total, notes, userId]
    );
    const commandeId = cmdRows[0].id;
    
    // Insérer les lignes
    for (const l of lignes) {
      // ✅ FIX : hospital_id explicite dans commande_lignes
      await client.query(
        `INSERT INTO commande_lignes (hospital_id, commande_id, produit_id, quantite, prix_unitaire)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.hospitalId, commandeId, l.produit_id, l.quantite, l.prix_unitaire]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(cmdRows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT - Mettre à jour le statut (ex: réception)
router.put('/:id/statut', authenticate, async (req, res) => {
  try {
    const { statut, date_livraison_effective } = req.body;
    const { rows } = await pool.query(
      `UPDATE commandes_achat SET statut = $1, date_livraison_effective = $2 WHERE id = $3 RETURNING *`,
      [statut, date_livraison_effective, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Commande non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE - Supprimer une commande (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM commandes_achat WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Commande non trouvée' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;