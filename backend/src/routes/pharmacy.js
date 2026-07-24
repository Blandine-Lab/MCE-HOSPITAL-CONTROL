const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { authenticate, requireRole, requirePermission, requireAdmin } = require('../middleware/auth');
const { getFifoLot } = require('../utils/fifo');
const { logAudit } = require('../utils/audit');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Pharmacie : connecté à PostgreSQL'));

router.use(authenticate);

// ========== MÉDICAMENTS (avec date de péremption la plus proche) ==========
router.get('/medicaments', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*,
             (SELECT MIN(l.date_peremption)
              FROM lots l
              WHERE l.medicament_id = m.id AND l.stock_actuel > 0) AS date_peremption_proche
      FROM medicaments m
      ORDER BY m.nom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/medicaments', requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO medicaments (code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [code, nom, description, stock || 0, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant || false]);
    await logAudit(req.user.id, 'CREATE_MEDICAMENT', 'medicaments', rows[0].id, { code, nom });
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
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
    await logAudit(req.user.id, 'UPDATE_MEDICAMENT', 'medicaments', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Erreur PUT medicament:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /medicaments/:id – réservé aux administrateurs
router.delete('/medicaments/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lots = await client.query('SELECT id FROM lots WHERE medicament_id=$1 LIMIT 1', [req.params.id]);
    if (lots.rows.length > 0) throw new Error('Impossible de supprimer : des lots existent');
    await client.query('DELETE FROM medicaments WHERE id=$1', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_MEDICAMENT', 'medicaments', req.params.id, {});
    await client.query('COMMIT');
    res.sendStatus(204);
  } catch (err) {
    await client.query('ROLLBACK');
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
      WHERE medicament_id = $1 AND stock_actuel > 0
      ORDER BY date_peremption ASC
    `, [req.params.medicamentId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lots', requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, numero_lot, date_peremption, quantite, prix_achat } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (new Date(date_peremption) < new Date()) throw new Error('Date de péremption dépassée');
    const { rows } = await client.query(`
      INSERT INTO lots (medicament_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
      VALUES ($1, $2, $3, $4, $4, $5) RETURNING *
    `, [medicament_id, numero_lot, date_peremption, quantite, prix_achat]);
    await client.query('UPDATE medicaments SET stock = stock + $1 WHERE id = $2', [quantite, medicament_id]);
    await client.query(`
      INSERT INTO mouvements_stock (medicament_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, 'entree', 'Ajout lot', $4)
    `, [medicament_id, rows[0].id, quantite, req.user.id]);
    await logAudit(req.user.id, 'ADD_LOT', 'lots', rows[0].id, { numero_lot, quantite });
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
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
    res.status(500).json({ error: err.message });
  }
});

router.post('/commandes', requirePermission('manage_pharmacy'), async (req, res) => {
  const { fournisseur_id, lignes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numCommande = `CMD-${Date.now()}`;
    const { rows } = await client.query(`
      INSERT INTO commandes (fournisseur_id, numero_commande, statut, validee_par)
      VALUES ($1, $2, 'en_cours', $3) RETURNING id
    `, [fournisseur_id, numCommande, req.user.id]);
    const commandeId = rows[0].id;
    for (const ligne of lignes) {
      await client.query(`
        INSERT INTO commande_lignes (commande_id, medicament_id, quantite_commandee, prix_unitaire_ht)
        VALUES ($1, $2, $3, $4)
      `, [commandeId, ligne.medicament_id, ligne.quantite_commandee, ligne.prix_unitaire_ht]);
    }
    await logAudit(req.user.id, 'CREATE_COMMANDE', 'commandes', commandeId, { fournisseur_id });
    await client.query('COMMIT');
    res.status(201).json({ id: commandeId, numero: numCommande });
  } catch (err) {
    await client.query('ROLLBACK');
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
    await client.query('UPDATE commandes SET statut = $1 WHERE id = $2', ['recue', commandeId]);
    for (const lot of lots_recus) {
      const { rows } = await client.query(`
        INSERT INTO lots (medicament_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
        VALUES ($1, $2, $3, $4, $4, $5) RETURNING id
      `, [lot.medicament_id, lot.numero_lot, lot.date_peremption, lot.quantite, lot.prix_achat]);
      await client.query('UPDATE medicaments SET stock = stock + $1 WHERE id = $2', [lot.quantite, lot.medicament_id]);
      await client.query(`
        INSERT INTO mouvements_stock (medicament_id, lot_id, quantite, type, motif, utilisateur_id)
        VALUES ($1, $2, $3, 'entree', 'Réception commande', $4)
      `, [lot.medicament_id, rows[0].id, lot.quantite, req.user.id]);
    }
    await logAudit(req.user.id, 'RECEPTION_COMMANDE', 'commandes', commandeId, { lots_recus });
    await client.query('COMMIT');
    res.sendStatus(200);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== DÉLIVRANCE AVEC VÉRIFICATION DU MOT DE PASSE ==========
router.post('/delivrance', requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, quantite, patient_id, posologie, prescripteur_nom, ligne_ordonnance_id, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await client.query('SELECT password FROM utilisateurs WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const med = await client.query('SELECT est_stupefiant FROM medicaments WHERE id=$1', [medicament_id]);
    if (med.rows[0]?.est_stupefiant && req.user.role !== 'pharmacien') {
      throw new Error('Seul un pharmacien peut délivrer un stupéfiant');
    }

    const lot = await getFifoLot(client, medicament_id, quantite);
    if (!lot) throw new Error('Stock insuffisant');

    await client.query('UPDATE lots SET stock_actuel = stock_actuel - $1 WHERE id = $2', [quantite, lot.id]);
    await client.query('UPDATE medicaments SET stock = stock - $1 WHERE id = $2', [quantite, medicament_id]);

    await client.query(`
      INSERT INTO mouvements_stock (medicament_id, lot_id, quantite, type, motif, utilisateur_id, patient_id, ligne_ordonnance_id)
      VALUES ($1, $2, $3, 'sortie', 'Délivrance patient', $4, $5, $6)
    `, [medicament_id, lot.id, quantite, req.user.id, patient_id, ligne_ordonnance_id || null]);

    const validationPar = (req.user.role === 'pharmacien') ? req.user.id : null;
    const statut = validationPar ? 'validee' : 'en_attente_validation';
    const { rows: prepRows } = await client.query(`
      INSERT INTO preparations (patient_id, medicament_id, lot_id, quantite, posologie, statut, validee_par, date_validation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [patient_id, medicament_id, lot.id, quantite, posologie, statut, validationPar, validationPar ? new Date() : null]);

    if (med.rows[0].est_stupefiant) {
      await client.query(`
        INSERT INTO registre_stupefiants (medicament_id, lot_id, patient_id, quantite_delivree, prescripteur_nom, pharmacien_nom)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [medicament_id, lot.id, patient_id, quantite, prescripteur_nom, req.user.nom]);
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
      const nouvelleDelivree = ligne.rows[0].quantite_delivree + quantite;
      if (nouvelleDelivree > ligne.rows[0].quantite_prescrit) {
        throw new Error('Quantité délivrée supérieure à la quantité prescrite');
      }
      await client.query(
        'UPDATE ligne_ordonnances SET quantite_delivree = $1 WHERE id = $2',
        [nouvelleDelivree, ligne_ordonnance_id]
      );

      const reste = await client.query(`
        SELECT SUM(quantite_prescrit - quantite_delivree) AS reste
        FROM ligne_ordonnances
        WHERE ordonnance_id = $1
      `, [ligne.rows[0].ordonnance_id]);
      const nouveauStatut = (reste.rows[0].reste === 0) ? 'delivree' : 'partiellement_delivree';
      await client.query(
        'UPDATE ordonnances SET statut = $1 WHERE id = $2',
        [nouveauStatut, ligne.rows[0].ordonnance_id]
      );
    }

    await logAudit(req.user.id, 'DELIVRANCE', 'preparations', prepRows[0].id, { medicament_id, quantite, patient_id });
    await client.query('COMMIT');
    res.status(201).json({ message: 'Délivrance enregistrée', statut, preparation_id: prepRows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
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
    const prep = await client.query('SELECT * FROM preparations WHERE id=$1 AND statut=$2', [id, 'en_attente_validation']);
    if (prep.rows.length === 0) throw new Error('Préparation introuvable ou déjà validée');
    await client.query(`
      UPDATE preparations SET statut='validee', validee_par=$1, date_validation=NOW()
      WHERE id=$2
    `, [req.user.id, id]);
    await logAudit(req.user.id, 'VALIDATION_PREPARATION', 'preparations', id, {});
    await client.query('COMMIT');
    res.sendStatus(200);
  } catch (err) {
    await client.query('ROLLBACK');
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

    const user = await client.query('SELECT password FROM utilisateurs WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const lot = await client.query('SELECT medicament_id, stock_actuel FROM lots WHERE id=$1', [lot_id]);
    if (lot.rows[0].stock_actuel < quantite) throw new Error('Quantité à détruire supérieure au stock');
    await client.query('UPDATE lots SET stock_actuel = stock_actuel - $1 WHERE id=$2', [quantite, lot_id]);
    await client.query('UPDATE medicaments SET stock = stock - $1 WHERE id=$2', [quantite, lot.rows[0].medicament_id]);
    await client.query(`
      INSERT INTO destructions (lot_id, quantite, motif, validee_par, procede)
      VALUES ($1, $2, $3, $4, $5)
    `, [lot_id, quantite, motif, req.user.id, procede]);
    await client.query(`
      INSERT INTO mouvements_stock (medicament_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, 'sortie', 'Destruction', $4)
    `, [lot.rows[0].medicament_id, lot_id, quantite, req.user.id]);
    await logAudit(req.user.id, 'DESTRUCTION', 'destructions', null, { lot_id, quantite, motif });
    await client.query('COMMIT');
    res.sendStatus(201);
  } catch (err) {
    await client.query('ROLLBACK');
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

    const user = await client.query('SELECT password FROM utilisateurs WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const lotCheck = await client.query('SELECT stock_actuel FROM lots WHERE id=$1', [lot_id]);
    if (lotCheck.rows.length === 0) throw new Error('Lot introuvable');

    await client.query('UPDATE lots SET stock_actuel = stock_actuel + $1 WHERE id = $2', [quantite, lot_id]);
    await client.query('UPDATE medicaments SET stock = stock + $1 WHERE id = $2', [quantite, medicament_id]);

    await client.query(`
      INSERT INTO mouvements_stock (medicament_id, lot_id, quantite, type, motif, utilisateur_id, patient_id)
      VALUES ($1, $2, $3, 'entree', $4, $5, $6)
    `, [medicament_id, lot_id, quantite, motif || 'Retour patient', req.user.id, patient_id]);

    await logAudit(req.user.id, 'RETOUR_PATIENT', 'mouvements_stock', null, { medicament_id, lot_id, quantite, patient_id });
    await client.query('COMMIT');
    res.sendStatus(201);
  } catch (err) {
    await client.query('ROLLBACK');
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
      WHERE l.date_peremption <= $1 AND l.stock_actuel > 0
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
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== NOUVELLES FONCTIONNALITÉS ====================
// ==================================================================

// ---------- Fournisseurs ----------
// GET /fournisseurs – accessible à tous les utilisateurs authentifiés (pour tests)
router.get('/fournisseurs', async (req, res) => {
  console.log('📦 GET /fournisseurs (test sans middleware) - utilisateur:', req.user ? req.user.login : 'non authentifié');
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
      INSERT INTO fournisseurs (nom, contact_email, telephone, adresse, actif)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [nom, contact_email, telephone, adresse, actif !== false]);
    await logAudit(req.user.id, 'CREATE_FOURNISSEUR', 'fournisseurs', rows[0].id, { nom });
    res.status(201).json(rows[0]);
  } catch (err) {
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
    await logAudit(req.user.id, 'UPDATE_FOURNISSEUR', 'fournisseurs', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /fournisseurs/:id – réservé aux administrateurs
router.delete('/fournisseurs/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM fournisseurs WHERE id=$1', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_FOURNISSEUR', 'fournisseurs', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Dispositifs Médicaux ----------
router.get('/dispositifs', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM dispositifs_medicaux ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositifs', requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, prix_unitaire, categorie } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO dispositifs_medicaux (code, nom, description, stock, seuil_alerte, prix_unitaire, categorie)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [code, nom, description, stock || 0, seuil_alerte || 10, prix_unitaire, categorie]);
    await logAudit(req.user.id, 'CREATE_DISPOSITIF', 'dispositifs_medicaux', rows[0].id, { code, nom });
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
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
    await logAudit(req.user.id, 'UPDATE_DISPOSITIF', 'dispositifs_medicaux', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /dispositifs/:id – réservé aux administrateurs
router.delete('/dispositifs/:id', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lots = await client.query('SELECT id FROM lots_dispositifs WHERE dispositif_id=$1 LIMIT 1', [req.params.id]);
    if (lots.rows.length > 0) throw new Error('Impossible de supprimer : des lots existent');
    await client.query('DELETE FROM dispositifs_medicaux WHERE id=$1', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_DISPOSITIF', 'dispositifs_medicaux', req.params.id, {});
    await client.query('COMMIT');
    res.sendStatus(204);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Lots de dispositifs médicaux
router.get('/dispositifs/:id/lots', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM lots_dispositifs
      WHERE dispositif_id = $1 AND stock_actuel > 0
      ORDER BY date_peremption ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositifs/lots', requirePermission('manage_pharmacy'), async (req, res) => {
  const { dispositif_id, numero_lot, date_peremption, quantite, prix_achat } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (new Date(date_peremption) < new Date()) throw new Error('Date de péremption dépassée');
    const { rows } = await client.query(`
      INSERT INTO lots_dispositifs (dispositif_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
      VALUES ($1, $2, $3, $4, $4, $5) RETURNING *
    `, [dispositif_id, numero_lot, date_peremption, quantite, prix_achat]);
    await client.query('UPDATE dispositifs_medicaux SET stock = stock + $1 WHERE id = $2', [quantite, dispositif_id]);
    await client.query(`
      INSERT INTO mouvements_stock_dispositifs (dispositif_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, 'entree', 'Ajout lot', $4)
    `, [dispositif_id, rows[0].id, quantite, req.user.id]);
    await logAudit(req.user.id, 'ADD_LOT_DISPOSITIF', 'lots_dispositifs', rows[0].id, { numero_lot, quantite });
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- Pharmacovigilance ----------
router.post('/pharmacovigilance/effets-indesirables', requirePermission('manage_pharmacy'), async (req, res) => {
  const { patient_id, medicament_id, effet, description, severite, date_survenue } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO pharmacovigilance (patient_id, medicament_id, effet, description, severite, date_survenue, declare_par)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [patient_id, medicament_id, effet, description, severite, date_survenue, req.user.id]);
    await logAudit(req.user.id, 'DECLARATION_EFFET_INDESIRABLE', 'pharmacovigilance', rows[0].id, { patient_id, medicament_id });
    res.status(201).json(rows[0]);
  } catch (err) {
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
    res.status(500).json({ error: err.message });
  }
});

// ---------- Préparations magistrales (recettes) ----------
router.get('/preparations/recettes', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM recettes_preparations ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/preparations/recettes', requirePermission('manage_pharmacy'), async (req, res) => {
  const { nom, description, ingredients, etapes } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO recettes_preparations (nom, description, ingredients, etapes, cree_par)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [nom, description, ingredients, etapes, req.user.id]);
    await logAudit(req.user.id, 'CREATE_RECETTE', 'recettes_preparations', rows[0].id, { nom });
    res.status(201).json(rows[0]);
  } catch (err) {
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
    await logAudit(req.user.id, 'UPDATE_RECETTE', 'recettes_preparations', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /preparations/recettes/:id – réservé aux administrateurs
router.delete('/preparations/recettes/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM recettes_preparations WHERE id=$1', [req.params.id]);
    await logAudit(req.user.id, 'DELETE_RECETTE', 'recettes_preparations', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Exécution d'une préparation
router.post('/preparations/executer', requirePermission('manage_pharmacy'), async (req, res) => {
  const { recette_id, patient_id, quantite_finale, lot_id_medicament } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO preparations_executees (recette_id, patient_id, quantite_finale, realise_par, lot_id_medicament)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [recette_id, patient_id, quantite_finale, req.user.id, lot_id_medicament]);
    await logAudit(req.user.id, 'EXECUTER_PREPARATION', 'preparations_executees', rows[0].id, { recette_id, patient_id });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Ruptures de stock ----------
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
    res.status(500).json({ error: err.message });
  }
});

// ---------- Suggestions de réapprovisionnement ----------
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
    res.status(500).json({ error: err.message });
  }
});

// ---------- Historique des exécutions ----------
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
    res.status(500).json({ error: err.message });
  }
});

// ========== INFIRMIERS (pour la délivrance) ==========
router.get('/infirmiers', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nom, prenom, login
      FROM utilisateurs
      WHERE role = 'infirmier'
      ORDER BY nom, prenom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ✅ ORDONNANCES EN ATTENTE (table prescriptions)
// ================================================================
router.get('/ordonnances/en-attente', requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id,
             p.patient_id,
             p.date_creation,
             p.status,
             p.pharmacist_id,
             p.date_served,
             p.retrieved_by,
             pat.nom AS patient_nom,
             pat.prenom AS patient_prenom,
             u.nom AS medecin_nom,
             u.prenom AS medecin_prenom
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      JOIN utilisateurs u ON p.doctor_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.date_creation DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/en-attente :', err);
    res.status(500).json({ error: err.message });
  }
});

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
    res.status(500).json({ error: err.message });
  }
});

router.put('/ordonnances/:id/statut', requirePermission('manage_pharmacy'), async (req, res) => {
  const { statut } = req.body;
  try {
    await pool.query('UPDATE ordonnances SET statut = $1 WHERE id = $2', [statut, req.params.id]);
    await logAudit(req.user.id, 'UPDATE_ORDONNANCE_STATUT', 'ordonnances', req.params.id, { statut });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;