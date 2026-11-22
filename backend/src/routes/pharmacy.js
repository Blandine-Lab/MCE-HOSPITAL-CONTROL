// src/routes/pharmacy.js
// ============================================================
// 💊 PHARMACIE – Médicaments, lots, délivrance, dispositifs, etc.
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. set_config dans CHAQUE transaction (~13)
//   3. hospital_id explicite dans TOUS les INSERT (~15)
//   4. ROLLBACK robuste partout
//   5. logAudit : signature objet corrigée
//   6. FIX GET /medicaments : ajout de setTenant pour le RLS
//   7. FIX GET /infirmiers : ajout de setTenant et filtre hospital_id
//   8. AJOUT GET /stats (dashboard)
//   9. AJOUT GET /ordonnances/historique (AVANT /:id !)
//  10. FIX /delivrance : sécurisation des strings (varchar overflow)
//  11. AJOUT GET /medicaments/top (top médicaments délivrés)
// ============================================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticate, requireRole, requirePermission, requireAdmin } = require('../middleware/auth');
const { getFifoLot } = require('../utils/fifo');
const { logAudit } = require('../utils/audit');

router.use(authenticate);

// ============================================================
// Helper : pose le tenant dans la transaction courante
// ============================================================
async function setTenant(client, hospitalId) {
  await client.query(
    `SELECT set_config('app.hospital_id', $1, true)`,
    [String(hospitalId)]
  );
}

// ============================================================
// Helper : logAudit compatible ancienne/nouvelle signature
// ============================================================
async function audit(req, action, table, recordId, details = {}) {
  try {
    await logAudit({
      userId: req.user?.id,
      action,
      tableCible: table,
      recordId,
      details,
      ip: req.ip,
      hospitalId: req.hospitalId,
    });
  } catch (e) {
    console.warn('⚠️ logAudit non bloquant :', e.message);
  }
}

// ========== MÉDICAMENTS ==========
router.get('/medicaments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    console.log('🔍 Récupération des médicaments...');
    const { rows } = await client.query(`
      SELECT m.*,
             (SELECT MIN(l.date_peremption)
              FROM lots l
              WHERE l.medicament_id = m.id 
                AND COALESCE(l.stock_actuel, 0) > 0) AS date_peremption_proche
      FROM medicaments m
      WHERE m.hospital_id = $1
      ORDER BY m.nom
    `, [req.hospitalId]);

    await client.query('COMMIT');
    console.log(`✅ ${rows.length} médicaments trouvés`);
    res.json(rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur GET /medicaments :', err);
    res.status(500).json({ error: err.message, detail: err.stack });
  } finally {
    client.release();
  }
});

// ==================================================================
// ==================== TOP MÉDICAMENTS DÉLIVRÉS ====================
// ⚠️ AVANT /medicaments/:id (wildcard) pour ne pas être capturé
// ==================================================================
router.get('/medicaments/top', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const { rows } = await pool.query(`
      SELECT 
        m.id,
        m.nom,
        m.code,
        m.forme,
        m.dosage,
        m.unite,
        COALESCE(SUM(ms.quantite), 0)::int AS total_delivre,
        COUNT(DISTINCT ms.id)::int        AS nb_delivrances
      FROM medicaments m
      INNER JOIN mouvements_stock ms
        ON ms.medicament_id = m.id
       AND ms.type = 'sortie'
       AND ms.motif LIKE 'Délivrance%'
      WHERE m.hospital_id = $1
      GROUP BY m.id, m.nom, m.code, m.forme, m.dosage, m.unite
      ORDER BY total_delivre DESC, nb_delivrances DESC
      LIMIT $2
    `, [req.hospitalId, limit]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /pharmacy/medicaments/top :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/medicaments', requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const { rows } = await client.query(`
      INSERT INTO medicaments (hospital_id, code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [req.hospitalId, code, nom, description, stock || 0, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant || false]);
    await client.query('COMMIT');
    await audit(req, 'CREATE_MEDICAMENT', 'medicaments', rows[0].id, { code, nom });
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /medicaments :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/medicaments/:id', requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant } = req.body;
  try {
    await pool.query(`
      UPDATE medicaments 
      SET code=$1, nom=$2, description=$3, stock=$4, seuil_alerte=$5,
          unite=$6, prix_unitaire=$7, principe_actif=$8, forme=$9, dosage=$10, est_stupefiant=$11
      WHERE id=$12
    `, [code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant, req.params.id]);
    await audit(req, 'UPDATE_MEDICAMENT', 'medicaments', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erreur PUT medicament:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/medicaments/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const lots = await client.query('SELECT id FROM lots WHERE medicament_id=$1 LIMIT 1', [req.params.id]);
    if (lots.rows.length > 0) throw new Error('Impossible de supprimer : des lots existent');
    await client.query('DELETE FROM medicaments WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    await audit(req, 'DELETE_MEDICAMENT', 'medicaments', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur DELETE /medicaments/:id :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== LOTS ==========
router.get('/lots/disponibles/:medicamentId', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM lots 
      WHERE medicament_id = $1 AND COALESCE(stock_actuel, 0) > 0
      ORDER BY date_peremption ASC
    `, [req.params.medicamentId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /lots/disponibles :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/lots', requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, numero_lot, date_peremption, quantite, prix_achat } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    if (new Date(date_peremption) < new Date()) throw new Error('Date de péremption dépassée');
    const { rows } = await client.query(`
      INSERT INTO lots (hospital_id, medicament_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
      VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING *
    `, [req.hospitalId, medicament_id, numero_lot, date_peremption, quantite, prix_achat]);
    await client.query('UPDATE medicaments SET stock = stock + $1 WHERE id = $2', [quantite, medicament_id]);
    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, $4, 'entree', 'Ajout lot', $5)
    `, [req.hospitalId, medicament_id, rows[0].id, quantite, req.user.id]);
    await client.query('COMMIT');
    await audit(req, 'ADD_LOT', 'lots', rows[0].id, { numero_lot, quantite });
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /lots :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== COMMANDES ==========
router.get('/commandes', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, f.nom AS fournisseur_nom 
      FROM commandes c
      LEFT JOIN fournisseurs f ON c.fournisseur_id = f.id
      ORDER BY c.date_commande DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /commandes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/commandes', requirePermission('manage_pharmacy'), async (req, res) => {
  const { fournisseur_id, lignes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const numCommande = `CMD-${Date.now()}`;
    const { rows } = await client.query(`
      INSERT INTO commandes (hospital_id, fournisseur_id, numero_commande, statut, validee_par)
      VALUES ($1, $2, $3, 'en_cours', $4) RETURNING id
    `, [req.hospitalId, fournisseur_id, numCommande, req.user.id]);
    const commandeId = rows[0].id;
    for (const ligne of lignes) {
      await client.query(`
        INSERT INTO commande_lignes (hospital_id, commande_id, medicament_id, quantite_commandee, prix_unitaire_ht)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.hospitalId, commandeId, ligne.medicament_id, ligne.quantite_commandee, ligne.prix_unitaire_ht]);
    }
    await client.query('COMMIT');
    await audit(req, 'CREATE_COMMANDE', 'commandes', commandeId, { fournisseur_id });
    res.status(201).json({ id: commandeId, numero: numCommande });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /commandes :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/commandes/:id/reception', requirePermission('manage_pharmacy'), async (req, res) => {
  const commandeId = req.params.id;
  const { lots_recus } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    await client.query('UPDATE commandes SET statut = $1 WHERE id = $2', ['recue', commandeId]);
    for (const lot of lots_recus) {
      const { rows } = await client.query(`
        INSERT INTO lots (hospital_id, medicament_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
        VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING id
      `, [req.hospitalId, lot.medicament_id, lot.numero_lot, lot.date_peremption, lot.quantite, lot.prix_achat]);
      await client.query('UPDATE medicaments SET stock = stock + $1 WHERE id = $2', [lot.quantite, lot.medicament_id]);
      await client.query(`
        INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id)
        VALUES ($1, $2, $3, $4, 'entree', 'Réception commande', $5)
      `, [req.hospitalId, lot.medicament_id, rows[0].id, lot.quantite, req.user.id]);
    }
    await client.query('COMMIT');
    await audit(req, 'RECEPTION_COMMANDE', 'commandes', commandeId, { lots_recus });
    res.sendStatus(200);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /commandes/:id/reception :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== DÉLIVRANCE ==========
router.post('/delivrance', requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, quantite, patient_id, posologie, prescripteur_nom, ligne_ordonnance_id, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const user = await client.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const med = await client.query('SELECT est_stupefiant FROM medicaments WHERE id=$1', [medicament_id]);
    if (med.rows[0]?.est_stupefiant && req.user.role !== 'pharmacien') {
      throw new Error('Seul un pharmacien peut délivrer un stupéfiant');
    }

    const lot = await getFifoLot(client, medicament_id, quantite);
    if (!lot) throw new Error('Stock insuffisant');

    await client.query('UPDATE lots SET stock_actuel = stock_actuel - $1 WHERE id = $2', [quantite, lot.id]);
    await client.query('UPDATE medicaments SET stock = stock - $1 WHERE id = $2', [quantite, medicament_id]);

    const safeType = 'sortie';
    const safeMotif = 'Délivrance patient';
    const safePosologie = (posologie || '').substring(0, 500);
    const safeStatutPrepa = (req.user.role === 'pharmacien') ? 'validee' : 'en_attente_validation';
    const safePrescripteur = (prescripteur_nom || '').substring(0, 255);

    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id, patient_id, ligne_ordonnance_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [req.hospitalId, medicament_id, lot.id, quantite, safeType, safeMotif, req.user.id, patient_id, ligne_ordonnance_id || null]);

    const validationPar = (req.user.role === 'pharmacien') ? req.user.id : null;
    const { rows: prepRows } = await client.query(`
      INSERT INTO preparations (hospital_id, patient_id, medicament_id, lot_id, quantite, posologie, statut, validee_par, date_validation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [req.hospitalId, patient_id, medicament_id, lot.id, quantite, safePosologie, safeStatutPrepa, validationPar, validationPar ? new Date() : null]);

    if (med.rows[0].est_stupefiant) {
      await client.query(`
        INSERT INTO registre_stupefiants (hospital_id, medicament_id, lot_id, patient_id, quantite_delivree, prescripteur_nom, pharmacien_nom)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.hospitalId, medicament_id, lot.id, patient_id, quantite, safePrescripteur, (req.user.nom || '').substring(0, 255)]);
    }

    if (ligne_ordonnance_id) {
      const ligne = await client.query(
        'SELECT quantite_prescrit, quantite_delivree, medicament_id, ordonnance_id FROM ligne_ordonnances WHERE id = $1',
        [ligne_ordonnance_id]
      );
      if (ligne.rows.length === 0) throw new Error('Ligne d\'ordonnance introuvable');
      if (ligne.rows[0].medicament_id !== medicament_id) {
        throw new Error('Le médicament ne correspond pas à la ligne d\'ordonnance');
      }
      const nouvelleDelivree = (ligne.rows[0].quantite_delivree || 0) + quantite;
      if (nouvelleDelivree > ligne.rows[0].quantite_prescrit) {
        throw new Error('Quantité délivrée supérieure à la quantité prescrite');
      }
      await client.query(
        'UPDATE ligne_ordonnances SET quantite_delivree = $1 WHERE id = $2',
        [nouvelleDelivree, ligne_ordonnance_id]
      );

      const reste = await client.query(`
        SELECT SUM(quantite_prescrit - COALESCE(quantite_delivree, 0)) AS reste
        FROM ligne_ordonnances
        WHERE ordonnance_id = $1
      `, [ligne.rows[0].ordonnance_id]);

      const resteVal = Number(reste.rows[0].reste || 0);
      const nouveauStatut = (resteVal === 0) ? 'delivree' : 'partiellement_delivree';

      await client.query(
        'UPDATE ordonnances SET statut = $1 WHERE id = $2',
        [nouveauStatut, ligne.rows[0].ordonnance_id]
      );
    }

    await client.query('COMMIT');
    await audit(req, 'DELIVRANCE', 'preparations', prepRows[0].id, { medicament_id, quantite, patient_id });
    res.status(201).json({ message: 'Délivrance enregistrée', statut: safeStatutPrepa, preparation_id: prepRows[0].id });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur délivrance :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/preparations/:id/valider', requirePermission('manage_pharmacy'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const prep = await client.query('SELECT * FROM preparations WHERE id=$1 AND statut=$2', [id, 'en_attente_validation']);
    if (prep.rows.length === 0) throw new Error('Préparation introuvable ou déjà validée');
    await client.query(`
      UPDATE preparations SET statut='validee', validee_par=$1, date_validation=NOW()
      WHERE id=$2
    `, [req.user.id, id]);
    await client.query('COMMIT');
    await audit(req, 'VALIDATION_PREPARATION', 'preparations', id, {});
    res.sendStatus(200);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur PUT /preparations/:id/valider :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== DESTRUCTION ==========
router.post('/destruction', requirePermission('manage_pharmacy'), async (req, res) => {
  const { lot_id, quantite, motif, procede, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const user = await client.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const lot = await client.query('SELECT medicament_id, stock_actuel FROM lots WHERE id=$1', [lot_id]);
    if (lot.rows[0].stock_actuel < quantite) throw new Error('Quantité à détruire supérieure au stock');
    await client.query('UPDATE lots SET stock_actuel = stock_actuel - $1 WHERE id=$2', [quantite, lot_id]);
    await client.query('UPDATE medicaments SET stock = stock - $1 WHERE id=$2', [quantite, lot.rows[0].medicament_id]);
    await client.query(`
      INSERT INTO destructions (hospital_id, lot_id, quantite, motif, validee_par, procede)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.hospitalId, lot_id, quantite, motif, req.user.id, procede]);
    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, $4, 'sortie', 'Destruction', $5)
    `, [req.hospitalId, lot.rows[0].medicament_id, lot_id, quantite, req.user.id]);
    await client.query('COMMIT');
    await audit(req, 'DESTRUCTION', 'destructions', null, { lot_id, quantite, motif });
    res.sendStatus(201);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /destruction :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== RETOUR PATIENT ==========
router.post('/retour-patient', requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, lot_id, quantite, motif, patient_id, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const user = await client.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const lotCheck = await client.query('SELECT stock_actuel FROM lots WHERE id=$1', [lot_id]);
    if (lotCheck.rows.length === 0) throw new Error('Lot introuvable');

    await client.query('UPDATE lots SET stock_actuel = stock_actuel + $1 WHERE id = $2', [quantite, lot_id]);
    await client.query('UPDATE medicaments SET stock = stock + $1 WHERE id = $2', [quantite, medicament_id]);

    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id, patient_id)
      VALUES ($1, $2, $3, $4, 'entree', $5, $6, $7)
    `, [req.hospitalId, medicament_id, lot_id, quantite, motif || 'Retour patient', req.user.id, patient_id]);

    await client.query('COMMIT');
    await audit(req, 'RETOUR_PATIENT', 'mouvements_stock', null, { medicament_id, lot_id, quantite, patient_id });
    res.sendStatus(201);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /retour-patient :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== ALERTES ==========
router.get('/alertes', async (req, res) => {
  try {
    const stock = await pool.query('SELECT * FROM medicaments WHERE stock <= seuil_alerte');
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 30);
    const peremption = await pool.query(`
      SELECT l.*, m.nom AS medicament_nom
      FROM lots l
      JOIN medicaments m ON l.medicament_id = m.id
      WHERE l.date_peremption <= $1 AND COALESCE(l.stock_actuel, 0) > 0
    `, [threshold.toISOString().split('T')[0]]);
    const commandesRetard = await pool.query(`
      SELECT * FROM commandes WHERE statut = 'en_cours' AND date_commande < NOW() - INTERVAL '15 days'
    `);
    res.json({
      stockCritique: stock.rows,
      peremptionProche: peremption.rows,
      commandesRetard: commandesRetard.rows
    });
  } catch (err) {
    console.error('❌ Erreur GET /alertes :', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== AUDIT ==========
router.get('/audit', requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.login AS utilisateur_login
      FROM audit_logs a
      LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /audit :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== FOURNISSEURS ================================
// ==================================================================
router.get('/fournisseurs', async (req, res) => {
  console.log('📦 GET /fournisseurs - utilisateur:', req.user ? req.user.login : 'non authentifié');
  try {
    const { rows } = await pool.query('SELECT * FROM fournisseurs ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /fournisseurs:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/fournisseurs', requireRole(['admin']), async (req, res) => {
  const { nom, contact_email, telephone, adresse, actif } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO fournisseurs (hospital_id, nom, contact_email, telephone, adresse, actif)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.hospitalId, nom, contact_email, telephone, adresse, actif !== false]);
    await audit(req, 'CREATE_FOURNISSEUR', 'fournisseurs', rows[0].id, { nom });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur POST /fournisseurs :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/fournisseurs/:id', requireRole(['admin']), async (req, res) => {
  const { nom, contact_email, telephone, adresse, actif } = req.body;
  try {
    await pool.query(`
      UPDATE fournisseurs SET nom=$1, contact_email=$2, telephone=$3, adresse=$4, actif=$5
      WHERE id=$6
    `, [nom, contact_email, telephone, adresse, actif !== false, req.params.id]);
    await audit(req, 'UPDATE_FOURNISSEUR', 'fournisseurs', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /fournisseurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/fournisseurs/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM fournisseurs WHERE id=$1', [req.params.id]);
    await audit(req, 'DELETE_FOURNISSEUR', 'fournisseurs', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erreur DELETE /fournisseurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== DISPOSITIFS MÉDICAUX ========================
// ==================================================================
router.get('/dispositifs', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM dispositifs_medicaux ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /dispositifs :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositifs', requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, prix_unitaire, categorie } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const { rows } = await client.query(`
      INSERT INTO dispositifs_medicaux (hospital_id, code, nom, description, stock, seuil_alerte, prix_unitaire, categorie)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [req.hospitalId, code, nom, description, stock || 0, seuil_alerte || 10, prix_unitaire, categorie]);
    await client.query('COMMIT');
    await audit(req, 'CREATE_DISPOSITIF', 'dispositifs_medicaux', rows[0].id, { code, nom });
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /dispositifs :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/dispositifs/:id', requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, prix_unitaire, categorie } = req.body;
  try {
    await pool.query(`
      UPDATE dispositifs_medicaux
      SET code=$1, nom=$2, description=$3, stock=$4, seuil_alerte=$5, prix_unitaire=$6, categorie=$7
      WHERE id=$8
    `, [code, nom, description, stock, seuil_alerte, prix_unitaire, categorie, req.params.id]);
    await audit(req, 'UPDATE_DISPOSITIF', 'dispositifs_medicaux', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /dispositifs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/dispositifs/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const lots = await client.query('SELECT id FROM lots_dispositifs WHERE dispositif_id=$1 LIMIT 1', [req.params.id]);
    if (lots.rows.length > 0) throw new Error('Impossible de supprimer : des lots existent');
    await client.query('DELETE FROM dispositifs_medicaux WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    await audit(req, 'DELETE_DISPOSITIF', 'dispositifs_medicaux', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur DELETE /dispositifs/:id :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/dispositifs/:id/lots', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM lots_dispositifs
      WHERE dispositif_id = $1 AND COALESCE(stock_actuel, 0) > 0
      ORDER BY date_peremption ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /dispositifs/:id/lots :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositifs/lots', requirePermission('manage_pharmacy'), async (req, res) => {
  const { dispositif_id, numero_lot, date_peremption, quantite, prix_achat } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    if (new Date(date_peremption) < new Date()) throw new Error('Date de péremption dépassée');
    const { rows } = await client.query(`
      INSERT INTO lots_dispositifs (hospital_id, dispositif_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
      VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING *
    `, [req.hospitalId, dispositif_id, numero_lot, date_peremption, quantite, prix_achat]);
    await client.query('UPDATE dispositifs_medicaux SET stock = stock + $1 WHERE id = $2', [quantite, dispositif_id]);
    await client.query(`
      INSERT INTO mouvements_stock_dispositifs (hospital_id, dispositif_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, $4, 'entree', 'Ajout lot', $5)
    `, [req.hospitalId, dispositif_id, rows[0].id, quantite, req.user.id]);
    await client.query('COMMIT');
    await audit(req, 'ADD_LOT_DISPOSITIF', 'lots_dispositifs', rows[0].id, { numero_lot, quantite });
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /dispositifs/lots :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================================================================
// ==================== PHARMACOVIGILANCE ===========================
// ==================================================================
router.post('/pharmacovigilance/effets-indesirables', requirePermission('manage_pharmacy'), async (req, res) => {
  const { patient_id, medicament_id, effet, description, severite, date_survenue } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO pharmacovigilance (hospital_id, patient_id, medicament_id, effet, description, severite, date_survenue, declare_par)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [req.hospitalId, patient_id, medicament_id, effet, description, severite, date_survenue, req.user.id]);
    await audit(req, 'DECLARATION_EFFET_INDESIRABLE', 'pharmacovigilance', rows[0].id, { patient_id, medicament_id });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur POST /pharmacovigilance/effets-indesirables :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/pharmacovigilance/effets-indesirables', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pv.*, u.login AS declare_par_login, m.nom AS medicament_nom
      FROM pharmacovigilance pv
      LEFT JOIN utilisateurs u ON pv.declare_par = u.id
      LEFT JOIN medicaments m ON pv.medicament_id = m.id
      ORDER BY pv.date_declaration DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /pharmacovigilance/effets-indesirables :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== PRÉPARATIONS MAGISTRALES ====================
// ==================================================================
router.get('/preparations/recettes', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM recettes_preparations ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /preparations/recettes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/preparations/recettes', requirePermission('manage_pharmacy'), async (req, res) => {
  const { nom, description, ingredients, etapes } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO recettes_preparations (hospital_id, nom, description, ingredients, etapes, cree_par)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.hospitalId, nom, description, ingredients, etapes, req.user.id]);
    await audit(req, 'CREATE_RECETTE', 'recettes_preparations', rows[0].id, { nom });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur POST /preparations/recettes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/preparations/recettes/:id', requirePermission('manage_pharmacy'), async (req, res) => {
  const { nom, description, ingredients, etapes } = req.body;
  try {
    await pool.query(`
      UPDATE recettes_preparations SET nom=$1, description=$2, ingredients=$3, etapes=$4
      WHERE id=$5
    `, [nom, description, ingredients, etapes, req.params.id]);
    await audit(req, 'UPDATE_RECETTE', 'recettes_preparations', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /preparations/recettes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/preparations/recettes/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM recettes_preparations WHERE id=$1', [req.params.id]);
    await audit(req, 'DELETE_RECETTE', 'recettes_preparations', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erreur DELETE /preparations/recettes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/preparations/executer', requirePermission('manage_pharmacy'), async (req, res) => {
  const { recette_id, patient_id, quantite_finale, lot_id_medicament } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO preparations_executees (hospital_id, recette_id, patient_id, quantite_finale, realise_par, lot_id_medicament)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.hospitalId, recette_id, patient_id, quantite_finale, req.user.id, lot_id_medicament]);
    await audit(req, 'EXECUTER_PREPARATION', 'preparations_executees', rows[0].id, { recette_id, patient_id });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur POST /preparations/executer :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== RUPTURES / SUGGESTIONS ======================
// ==================================================================
router.get('/ruptures', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, code, nom, stock, seuil_alerte
      FROM medicaments
      WHERE stock = 0
      ORDER BY nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ruptures :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions-commandes', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.code, m.nom, m.stock, m.seuil_alerte,
             COALESCE(SUM(l.stock_actuel), 0) AS stock_lots
      FROM medicaments m
      LEFT JOIN lots l ON m.id = l.medicament_id AND l.date_peremption > NOW()
      GROUP BY m.id
      HAVING COALESCE(SUM(l.stock_actuel), 0) <= m.seuil_alerte
      ORDER BY m.nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /suggestions-commandes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/preparations/executions', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pe.*, r.nom AS recette_nom, u.login AS realise_par
      FROM preparations_executees pe
      LEFT JOIN recettes_preparations r ON pe.recette_id = r.id
      LEFT JOIN utilisateurs u ON pe.realise_par = u.id
      ORDER BY pe.date_execution DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /preparations/executions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== INFIRMIERS ==========
router.get('/infirmiers', requirePermission('view_pharmacy'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const { rows } = await client.query(`
      SELECT id, nom, prenom, login
      FROM utilisateurs
      WHERE role = 'infirmier'
        AND hospital_id = $1
      ORDER BY nom, prenom
    `, [req.hospitalId]);

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur GET /infirmiers :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================================================================
// ==================== ORDONNANCES =================================
// ==================================================================
// ⚠️ ORDRE CRITIQUE : les routes SPÉCIFIQUES doivent être déclarées
//    AVANT les routes avec /:id, sinon Express les capture et plante.

// 1. Historique (AVANT /:id)
router.get('/ordonnances/historique', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.numero_ordonnance, o.date_creation, o.statut,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             u.nom AS retrieved_nom, u.prenom AS retrieved_prenom,
             (SELECT COUNT(*) FROM ligne_ordonnances lo WHERE lo.ordonnance_id = o.id) AS nb_medicaments
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id
      LEFT JOIN medecins m ON o.medecin_id = m.id
      LEFT JOIN utilisateurs u ON o.retrieved_by = u.id
      WHERE o.statut IN ('delivree', 'servie', 'partiellement_delivree')
      ORDER BY o.date_creation DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /pharmacy/ordonnances/historique :', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Ordonnances en attente (AVANT /:id)
router.get('/ordonnances/en-attente', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.patient_id, o.date_creation, o.statut, o.observations, o.numero_ordonnance,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id
      LEFT JOIN medecins m ON o.medecin_id = m.id
      WHERE o.statut = 'en_attente'
      ORDER BY o.date_creation DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/en-attente :', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Liste des ordonnances
router.get('/ordonnances', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { statut, patient_id, date_debut, date_fin } = req.query;
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (statut) { conditions.push(`o.statut = $${paramIndex++}`); params.push(statut); }
    if (patient_id) { conditions.push(`o.patient_id = $${paramIndex++}`); params.push(patient_id); }
    if (date_debut) { conditions.push(`o.date_creation >= $${paramIndex++}`); params.push(date_debut); }
    if (date_fin) { conditions.push(`o.date_creation <= $${paramIndex++}`); params.push(date_fin); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT o.id, o.patient_id, o.date_creation, o.statut, o.observations, o.numero_ordonnance, o.retrieved_by,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             u.nom AS retrieved_nom, u.prenom AS retrieved_prenom
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id
      LEFT JOIN medecins m ON o.medecin_id = m.id
      LEFT JOIN utilisateurs u ON o.retrieved_by = u.id
      ${whereClause}
      ORDER BY o.date_creation DESC
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances :', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Lignes d'une ordonnance (2 segments après /ordonnances)
router.get('/ordonnances/:id/lignes', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT lo.*, m.nom AS medicament_nom, m.code, m.stock, m.est_stupefiant
      FROM ligne_ordonnances lo
      JOIN medicaments m ON lo.medicament_id = m.id
      WHERE lo.ordonnance_id = $1
      ORDER BY lo.id
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/:id/lignes :', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Détail d'une ordonnance (EN DERNIER — wildcard /:id)
router.get('/ordonnances/:id', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.patient_id, o.date_creation, o.statut, o.observations, o.numero_ordonnance, o.retrieved_by,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             u.nom AS retrieved_nom, u.prenom AS retrieved_prenom
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id
      LEFT JOIN medecins m ON o.medecin_id = m.id
      LEFT JOIN utilisateurs u ON o.retrieved_by = u.id
      WHERE o.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/ordonnances/:id/statut', requirePermission('manage_pharmacy'), async (req, res) => {
  const { statut } = req.body;
  try {
    await pool.query('UPDATE ordonnances SET statut = $1 WHERE id = $2', [statut, req.params.id]);
    await audit(req, 'UPDATE_ORDONNANCE_STATUT', 'ordonnances', req.params.id, { statut });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /ordonnances/:id/statut :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/ordonnances/:id/serve', requirePermission('manage_pharmacy'), async (req, res) => {
  const { password, retrieved_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    if (req.user.role !== 'admin' && req.user.role !== 'pharmacien') {
      const user = await client.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [req.user.id]);
      if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
      const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
      if (!validPassword) throw new Error('Mot de passe incorrect');
    }

    await client.query(
      'UPDATE ordonnances SET statut = $1, retrieved_by = $2 WHERE id = $3',
      ['delivree', retrieved_by, req.params.id]
    );

    await client.query('COMMIT');
    await audit(req, 'SERVE_ORDONNANCE', 'ordonnances', req.params.id, { retrieved_by });
    res.sendStatus(200);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur PUT /ordonnances/:id/serve :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================================================================
// ==================== STATISTIQUES DASHBOARD ======================
// ==================================================================
router.get('/stats', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const [attente, alertes, commandes, stock] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM ordonnances WHERE statut = 'en_attente'`),
      pool.query(`SELECT COUNT(*) FROM medicaments WHERE stock <= seuil_alerte`),
      pool.query(`SELECT COUNT(*) FROM commandes WHERE statut = 'en_cours'`),
      pool.query(`SELECT COUNT(DISTINCT id) FROM medicaments WHERE stock > 0`)
    ]);

    res.json({
      ordonnancesEnAttente: parseInt(attente.rows[0].count, 10),
      alertesStock: parseInt(alertes.rows[0].count, 10),
      commandesEnCours: parseInt(commandes.rows[0].count, 10),
      medicamentsEnStock: parseInt(stock.rows[0].count, 10)
    });
  } catch (err) {
    console.error('❌ Erreur GET /pharmacy/stats :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;