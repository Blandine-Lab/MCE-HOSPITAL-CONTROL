// src/routes/pharmacy.js
// ============================================================
// 💊 PHARMACIE – Médicaments, lots, délivrance, dispositifs, etc.
// ------------------------------------------------------------
// ⚠️ Le pool patché pose `app.hospital_id` via ALS, MAIS le RLS
//    a été mis en NO FORCE + policy tenant_isolation supprimée.
//    On filtre donc explicitement TOUTES les routes sur
//    `req.hospitalId` (JWT) pour garantir l'isolation tenant.
// ------------------------------------------------------------
// 🔧 PATCH P0 : /delivrance utilise getFifoLots (pluriel) avec
//    req.hospitalId en 2e arg → supporte la délivrance multi-lots
//    (ex : lot A=5 + lot B=7 pour une ordonnance de 12).
// ============================================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticate, requireRole, requirePermission, requireAdmin } = require('../middleware/auth');
const { getFifoLots } = require('../utils/fifo');       // ✅ PATCH : pluriel
const { logAudit } = require('../utils/audit');

router.use(authenticate);

// ============================================================
// Helpers
// ============================================================
async function setTenant(client, hospitalId) {
  await client.query(
    `SELECT set_config('app.hospital_id', $1, true)`,
    [String(hospitalId)]
  );
}

function requireHospital(req, res, next) {
  if (!req.hospitalId) {
    return res.status(403).json({
      error: 'Contexte hôpital manquant',
      code: 'TENANT_MISSING',
    });
  }
  next();
}

function assertPositiveInt(v, label) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} doit être un entier strictement positif`);
  }
  return n;
}

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

// ==================================================================
// ========== MÉDICAMENTS ===========================================
// ==================================================================
router.get('/medicaments', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const { rows } = await client.query(`
      SELECT m.*,
             (SELECT MIN(l.date_peremption)
              FROM lots l
              WHERE l.medicament_id = m.id
                AND l.hospital_id = $1
                AND COALESCE(l.stock_actuel, 0) > 0) AS date_peremption_proche
      FROM medicaments m
      WHERE m.hospital_id = $1
      ORDER BY m.nom
    `, [req.hospitalId]);

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur GET /medicaments :', err);
    res.status(500).json({ error: err.message, detail: err.stack });
  } finally {
    client.release();
  }
});

router.get('/medicaments/top', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const { rows } = await pool.query(`
      SELECT 
        m.id, m.nom, m.code, m.forme, m.dosage, m.unite,
        COALESCE(SUM(ms.quantite), 0)::int AS total_delivre,
        COUNT(DISTINCT ms.id)::int        AS nb_delivrances
      FROM medicaments m
      INNER JOIN mouvements_stock ms
        ON ms.medicament_id = m.id
       AND ms.hospital_id = $1
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

router.post('/medicaments', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
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

router.put('/medicaments/:id', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant } = req.body;
  try {
    const result = await pool.query(`
      UPDATE medicaments
      SET code=$1, nom=$2, description=$3, stock=$4, seuil_alerte=$5,
          unite=$6, prix_unitaire=$7, principe_actif=$8, forme=$9, dosage=$10, est_stupefiant=$11
      WHERE id=$12 AND hospital_id=$13
    `, [code, nom, description, stock, seuil_alerte, unite, prix_unitaire, principe_actif, forme, dosage, est_stupefiant, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médicament non trouvé' });
    await audit(req, 'UPDATE_MEDICAMENT', 'medicaments', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erreur PUT medicament:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/medicaments/:id', requireHospital, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const own = await client.query(
      'SELECT id FROM medicaments WHERE id=$1 AND hospital_id=$2',
      [req.params.id, req.hospitalId]
    );
    if (own.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Médicament non trouvé' });
    }

    const lots = await client.query(
      'SELECT id FROM lots WHERE medicament_id=$1 AND hospital_id=$2 LIMIT 1',
      [req.params.id, req.hospitalId]
    );
    if (lots.rows.length > 0) throw new Error('Impossible de supprimer : des lots existent');

    await client.query('DELETE FROM medicaments WHERE id=$1 AND hospital_id=$2', [req.params.id, req.hospitalId]);
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

// ==================================================================
// ========== LOTS ==================================================
// ==================================================================
router.get('/lots/disponibles/:medicamentId', requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM lots
      WHERE medicament_id = $1
        AND hospital_id = $2
        AND COALESCE(stock_actuel, 0) > 0
      ORDER BY date_peremption ASC
    `, [req.params.medicamentId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /lots/disponibles :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/lots', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, numero_lot, date_peremption, quantite, prix_achat } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    if (new Date(date_peremption) < new Date()) throw new Error('Date de péremption dépassée');
    const qte = assertPositiveInt(quantite, 'quantite');

    const medCheck = await client.query(
      'SELECT id FROM medicaments WHERE id=$1 AND hospital_id=$2',
      [medicament_id, req.hospitalId]
    );
    if (medCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Médicament non trouvé' });
    }

    const { rows } = await client.query(`
      INSERT INTO lots (hospital_id, medicament_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
      VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING *
    `, [req.hospitalId, medicament_id, numero_lot, date_peremption, qte, prix_achat]);

    await client.query(
      'UPDATE medicaments SET stock = stock + $1 WHERE id = $2 AND hospital_id = $3',
      [qte, medicament_id, req.hospitalId]
    );

    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, $4, 'entree', 'Ajout lot', $5)
    `, [req.hospitalId, medicament_id, rows[0].id, qte, req.user.id]);

    await client.query('COMMIT');
    await audit(req, 'ADD_LOT', 'lots', rows[0].id, { numero_lot, quantite: qte });
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /lots :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================================================================
// ========== COMMANDES =============================================
// ==================================================================
router.get('/commandes', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, f.nom AS fournisseur_nom
      FROM commandes c
      LEFT JOIN fournisseurs f ON c.fournisseur_id = f.id AND f.hospital_id = $1
      WHERE c.hospital_id = $1
      ORDER BY c.date_commande DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /commandes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/commandes', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { fournisseur_id, lignes } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    if (fournisseur_id) {
      const fsCheck = await client.query(
        'SELECT id FROM fournisseurs WHERE id=$1 AND hospital_id=$2',
        [fournisseur_id, req.hospitalId]
      );
      if (fsCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Fournisseur non trouvé' });
      }
    }

    const numCommande = `CMD-${Date.now()}`;
    const { rows } = await client.query(`
      INSERT INTO commandes (hospital_id, fournisseur_id, numero_commande, statut, validee_par)
      VALUES ($1, $2, $3, 'en_cours', $4) RETURNING id
    `, [req.hospitalId, fournisseur_id, numCommande, req.user.id]);

    const commandeId = rows[0].id;
    for (const ligne of lignes) {
      const qteCmd = assertPositiveInt(ligne.quantite_commandee, 'quantite_commandee');
      const medCheck = await client.query(
        'SELECT id FROM medicaments WHERE id=$1 AND hospital_id=$2',
        [ligne.medicament_id, req.hospitalId]
      );
      if (medCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Médicament ${ligne.medicament_id} non trouvé` });
      }
      await client.query(`
        INSERT INTO commande_lignes (hospital_id, commande_id, medicament_id, quantite_commandee, prix_unitaire_ht)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.hospitalId, commandeId, ligne.medicament_id, qteCmd, ligne.prix_unitaire_ht]);
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

router.post('/commandes/:id/reception', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const commandeId = req.params.id;
  const { lots_recus } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const cmdCheck = await client.query(
      'SELECT id FROM commandes WHERE id=$1 AND hospital_id=$2',
      [commandeId, req.hospitalId]
    );
    if (cmdCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    await client.query(
      'UPDATE commandes SET statut = $1 WHERE id = $2 AND hospital_id = $3',
      ['recue', commandeId, req.hospitalId]
    );

    for (const lot of lots_recus) {
      const qte = assertPositiveInt(lot.quantite, 'quantite');
      const medCheck = await client.query(
        'SELECT id FROM medicaments WHERE id=$1 AND hospital_id=$2',
        [lot.medicament_id, req.hospitalId]
      );
      if (medCheck.rowCount === 0) throw new Error(`Médicament ${lot.medicament_id} non trouvé`);

      const { rows } = await client.query(`
        INSERT INTO lots (hospital_id, medicament_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
        VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING id
      `, [req.hospitalId, lot.medicament_id, lot.numero_lot, lot.date_peremption, qte, lot.prix_achat]);

      await client.query(
        'UPDATE medicaments SET stock = stock + $1 WHERE id = $2 AND hospital_id = $3',
        [qte, lot.medicament_id, req.hospitalId]
      );
      await client.query(`
        INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id)
        VALUES ($1, $2, $3, $4, 'entree', 'Réception commande', $5)
      `, [req.hospitalId, lot.medicament_id, rows[0].id, qte, req.user.id]);
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

// ==================================================================
// ========== DÉLIVRANCE (✅ PATCH P0 — multi-lots) =================
// ==================================================================
router.post('/delivrance', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, quantite, patient_id, posologie, prescripteur_nom, ligne_ordonnance_id, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const qte = assertPositiveInt(quantite, 'quantite');

    const user = await client.query(
      'SELECT password_hash FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
      [req.user.id, req.hospitalId]
    );
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
    if (!validPassword) throw new Error('Mot de passe incorrect');

    if (patient_id) {
      const patCheck = await client.query(
        'SELECT id FROM patients WHERE id=$1 AND hospital_id=$2',
        [patient_id, req.hospitalId]
      );
      if (patCheck.rowCount === 0) throw new Error('Patient non trouvé dans cet établissement');
    }

    const med = await client.query(
      'SELECT est_stupefiant FROM medicaments WHERE id=$1 AND hospital_id=$2',
      [medicament_id, req.hospitalId]
    );
    if (med.rows.length === 0) throw new Error('Médicament non trouvé dans cet établissement');

    if (med.rows[0].est_stupefiant && req.user.role !== 'pharmacien') {
      throw new Error('Seul un pharmacien peut délivrer un stupéfiant');
    }

    // ✅ PATCH P0 : getFifoLots (pluriel) avec req.hospitalId en 2e arg
    const allocations = await getFifoLots(client, req.hospitalId, medicament_id, qte);
    if (!allocations || allocations.length === 0) throw new Error('Stock insuffisant');

    // ✅ Décrément lot par lot
    for (const alloc of allocations) {
      await client.query(
        'UPDATE lots SET stock_actuel = stock_actuel - $1 WHERE id = $2 AND hospital_id = $3',
        [alloc.quantite, alloc.id, req.hospitalId]
      );
    }

    // ✅ Une seule décrément du stock global
    await client.query(
      'UPDATE medicaments SET stock = stock - $1 WHERE id = $2 AND hospital_id = $3',
      [qte, medicament_id, req.hospitalId]
    );

    const safeType = 'sortie';
    const safeMotif = 'Délivrance patient';
    const safePosologie = (posologie || '').substring(0, 500);
    const safeStatutPrepa = (req.user.role === 'pharmacien') ? 'validee' : 'en_attente_validation';
    const safePrescripteur = (prescripteur_nom || '').substring(0, 255);

    // ✅ Un mouvement par lot consommé (traçabilité)
    for (const alloc of allocations) {
      await client.query(`
        INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id, patient_id, ligne_ordonnance_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [req.hospitalId, medicament_id, alloc.id, alloc.quantite, safeType, safeMotif, req.user.id, patient_id, ligne_ordonnance_id || null]);
    }

    // ✅ La préparation est enregistrée sur le 1er lot consommé (traçabilité visuelle)
    const primaryLotId = allocations[0]?.id || null;
    const validationPar = (req.user.role === 'pharmacien') ? req.user.id : null;
    const { rows: prepRows } = await client.query(`
      INSERT INTO preparations (hospital_id, patient_id, medicament_id, lot_id, quantite, posologie, statut, validee_par, date_validation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [req.hospitalId, patient_id, medicament_id, primaryLotId, qte, safePosologie, safeStatutPrepa, validationPar, validationPar ? new Date() : null]);

    // ✅ Stupéfiants : une ligne par lot consommé (obligation légale)
    if (med.rows[0].est_stupefiant) {
      for (const alloc of allocations) {
        await client.query(`
          INSERT INTO registre_stupefiants (hospital_id, medicament_id, lot_id, patient_id, quantite_delivree, prescripteur_nom, pharmacien_nom)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [req.hospitalId, medicament_id, alloc.id, patient_id, alloc.quantite, safePrescripteur, (req.user.nom || '').substring(0, 255)]);
      }
    }

    if (ligne_ordonnance_id) {
      const ligne = await client.query(
        `SELECT lo.quantite_prescrit, lo.quantite_delivree, lo.medicament_id, lo.ordonnance_id
         FROM ligne_ordonnances lo
         JOIN ordonnances o ON lo.ordonnance_id = o.id
         WHERE lo.id = $1 AND o.hospital_id = $2`,
        [ligne_ordonnance_id, req.hospitalId]
      );
      if (ligne.rows.length === 0) throw new Error('Ligne d\'ordonnance introuvable');
      if (ligne.rows[0].medicament_id !== medicament_id) {
        throw new Error('Le médicament ne correspond pas à la ligne d\'ordonnance');
      }
      const nouvelleDelivree = (ligne.rows[0].quantite_delivree || 0) + qte;
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
        'UPDATE ordonnances SET statut = $1 WHERE id = $2 AND hospital_id = $3',
        [nouveauStatut, ligne.rows[0].ordonnance_id, req.hospitalId]
      );
    }

    await client.query('COMMIT');
    await audit(req, 'DELIVRANCE', 'preparations', prepRows[0].id, {
      medicament_id,
      quantite: qte,
      patient_id,
      lots_consommes: allocations.map(a => ({ lot_id: a.id, quantite: a.quantite })),
    });
    res.status(201).json({
      message: 'Délivrance enregistrée',
      statut: safeStatutPrepa,
      preparation_id: prepRows[0].id,
      lots_consommes: allocations.map(a => ({ lot_id: a.id, numero_lot: a.numero_lot, quantite: a.quantite })),
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur délivrance :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/preparations/:id/valider', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const prep = await client.query(
      'SELECT * FROM preparations WHERE id=$1 AND hospital_id=$2 AND statut=$3',
      [id, req.hospitalId, 'en_attente_validation']
    );
    if (prep.rows.length === 0) throw new Error('Préparation introuvable ou déjà validée');

    await client.query(`
      UPDATE preparations SET statut='validee', validee_par=$1, date_validation=NOW()
      WHERE id=$2 AND hospital_id=$3
    `, [req.user.id, id, req.hospitalId]);

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

// ==================================================================
// ========== DESTRUCTION ===========================================
// ==================================================================
router.post('/destruction', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { lot_id, quantite, motif, procede, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const qte = assertPositiveInt(quantite, 'quantite');

    const user = await client.query(
      'SELECT password_hash FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
      [req.user.id, req.hospitalId]
    );
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const lot = await client.query(
      'SELECT medicament_id, stock_actuel FROM lots WHERE id=$1 AND hospital_id=$2',
      [lot_id, req.hospitalId]
    );
    if (lot.rows.length === 0) throw new Error('Lot introuvable dans cet établissement');
    if (lot.rows[0].stock_actuel < qte) throw new Error('Quantité à détruire supérieure au stock');

    await client.query(
      'UPDATE lots SET stock_actuel = stock_actuel - $1 WHERE id=$2 AND hospital_id=$3',
      [qte, lot_id, req.hospitalId]
    );
    await client.query(
      'UPDATE medicaments SET stock = stock - $1 WHERE id=$2 AND hospital_id=$3',
      [qte, lot.rows[0].medicament_id, req.hospitalId]
    );
    await client.query(`
      INSERT INTO destructions (hospital_id, lot_id, quantite, motif, validee_par, procede)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.hospitalId, lot_id, qte, motif, req.user.id, procede]);
    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, $4, 'sortie', 'Destruction', $5)
    `, [req.hospitalId, lot.rows[0].medicament_id, lot_id, qte, req.user.id]);

    await client.query('COMMIT');
    await audit(req, 'DESTRUCTION', 'destructions', null, { lot_id, quantite: qte, motif });
    res.sendStatus(201);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /destruction :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================================================================
// ========== RETOUR PATIENT ========================================
// ==================================================================
router.post('/retour-patient', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { medicament_id, lot_id, quantite, motif, patient_id, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    const qte = assertPositiveInt(quantite, 'quantite');

    const user = await client.query(
      'SELECT password_hash FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
      [req.user.id, req.hospitalId]
    );
    if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
    if (!validPassword) throw new Error('Mot de passe incorrect');

    const lotCheck = await client.query(
      'SELECT stock_actuel FROM lots WHERE id=$1 AND hospital_id=$2',
      [lot_id, req.hospitalId]
    );
    if (lotCheck.rows.length === 0) throw new Error('Lot introuvable dans cet établissement');

    await client.query(
      'UPDATE lots SET stock_actuel = stock_actuel + $1 WHERE id = $2 AND hospital_id = $3',
      [qte, lot_id, req.hospitalId]
    );
    await client.query(
      'UPDATE medicaments SET stock = stock + $1 WHERE id = $2 AND hospital_id = $3',
      [qte, medicament_id, req.hospitalId]
    );

    await client.query(`
      INSERT INTO public.mouvements_stock (hospital_id, medicament_id, lot_id, quantite, type, motif, utilisateur_id, patient_id)
      VALUES ($1, $2, $3, $4, 'entree', $5, $6, $7)
    `, [req.hospitalId, medicament_id, lot_id, qte, motif || 'Retour patient', req.user.id, patient_id]);

    await client.query('COMMIT');
    await audit(req, 'RETOUR_PATIENT', 'mouvements_stock', null, { medicament_id, lot_id, quantite: qte, patient_id });
    res.sendStatus(201);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /retour-patient :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==================================================================
// ========== ALERTES ===============================================
// ==================================================================
router.get('/alertes', requireHospital, async (req, res) => {
  try {
    const stock = await pool.query(
      'SELECT * FROM medicaments WHERE hospital_id = $1 AND stock <= seuil_alerte',
      [req.hospitalId]
    );

    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 30);

    const peremption = await pool.query(`
      SELECT l.*, m.nom AS medicament_nom
      FROM lots l
      JOIN medicaments m ON l.medicament_id = m.id AND m.hospital_id = $1
      WHERE l.hospital_id = $1
        AND l.date_peremption <= $2
        AND COALESCE(l.stock_actuel, 0) > 0
    `, [req.hospitalId, threshold.toISOString().split('T')[0]]);

    const commandesRetard = await pool.query(`
      SELECT * FROM commandes
      WHERE hospital_id = $1
        AND statut = 'en_cours'
        AND date_commande < NOW() - INTERVAL '15 days'
    `, [req.hospitalId]);

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

// ==================================================================
// ========== AUDIT =================================================
// ==================================================================
router.get('/audit', requireHospital, requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.login AS utilisateur_login
      FROM audit_logs a
      LEFT JOIN utilisateurs u ON a.utilisateur_id = u.id AND u.hospital_id = $1
      WHERE a.hospital_id = $1
      ORDER BY a.created_at DESC
      LIMIT 100
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /audit :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== FOURNISSEURS ================================
// ==================================================================
router.get('/fournisseurs', requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM fournisseurs WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /fournisseurs:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/fournisseurs', requireHospital, requireRole(['admin']), async (req, res) => {
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

router.put('/fournisseurs/:id', requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom, contact_email, telephone, adresse, actif } = req.body;
  try {
    const result = await pool.query(`
      UPDATE fournisseurs SET nom=$1, contact_email=$2, telephone=$3, adresse=$4, actif=$5
      WHERE id=$6 AND hospital_id=$7
    `, [nom, contact_email, telephone, adresse, actif !== false, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
    await audit(req, 'UPDATE_FOURNISSEUR', 'fournisseurs', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /fournisseurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/fournisseurs/:id', requireHospital, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM fournisseurs WHERE id=$1 AND hospital_id=$2',
      [req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Fournisseur non trouvé' });
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
router.get('/dispositifs', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM dispositifs_medicaux WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /dispositifs :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositifs', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
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

router.put('/dispositifs/:id', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { code, nom, description, stock, seuil_alerte, prix_unitaire, categorie } = req.body;
  try {
    const result = await pool.query(`
      UPDATE dispositifs_medicaux
      SET code=$1, nom=$2, description=$3, stock=$4, seuil_alerte=$5, prix_unitaire=$6, categorie=$7
      WHERE id=$8 AND hospital_id=$9
    `, [code, nom, description, stock, seuil_alerte, prix_unitaire, categorie, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Dispositif non trouvé' });
    await audit(req, 'UPDATE_DISPOSITIF', 'dispositifs_medicaux', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /dispositifs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/dispositifs/:id', requireHospital, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const own = await client.query(
      'SELECT id FROM dispositifs_medicaux WHERE id=$1 AND hospital_id=$2',
      [req.params.id, req.hospitalId]
    );
    if (own.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispositif non trouvé' });
    }

    const lots = await client.query(
      'SELECT id FROM lots_dispositifs WHERE dispositif_id=$1 AND hospital_id=$2 LIMIT 1',
      [req.params.id, req.hospitalId]
    );
    if (lots.rows.length > 0) throw new Error('Impossible de supprimer : des lots existent');

    await client.query('DELETE FROM dispositifs_medicaux WHERE id=$1 AND hospital_id=$2', [req.params.id, req.hospitalId]);
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

router.get('/dispositifs/:id/lots', requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM lots_dispositifs
      WHERE dispositif_id = $1
        AND hospital_id = $2
        AND COALESCE(stock_actuel, 0) > 0
      ORDER BY date_peremption ASC
    `, [req.params.id, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /dispositifs/:id/lots :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispositifs/lots', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { dispositif_id, numero_lot, date_peremption, quantite, prix_achat } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);
    if (new Date(date_peremption) < new Date()) throw new Error('Date de péremption dépassée');
    const qte = assertPositiveInt(quantite, 'quantite');

    const dispCheck = await client.query(
      'SELECT id FROM dispositifs_medicaux WHERE id=$1 AND hospital_id=$2',
      [dispositif_id, req.hospitalId]
    );
    if (dispCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispositif non trouvé' });
    }

    const { rows } = await client.query(`
      INSERT INTO lots_dispositifs (hospital_id, dispositif_id, numero_lot, date_peremption, quantite, stock_actuel, prix_achat)
      VALUES ($1, $2, $3, $4, $5, $5, $6) RETURNING *
    `, [req.hospitalId, dispositif_id, numero_lot, date_peremption, qte, prix_achat]);

    await client.query(
      'UPDATE dispositifs_medicaux SET stock = stock + $1 WHERE id = $2 AND hospital_id = $3',
      [qte, dispositif_id, req.hospitalId]
    );
    await client.query(`
      INSERT INTO mouvements_stock_dispositifs (hospital_id, dispositif_id, lot_id, quantite, type, motif, utilisateur_id)
      VALUES ($1, $2, $3, $4, 'entree', 'Ajout lot', $5)
    `, [req.hospitalId, dispositif_id, rows[0].id, qte, req.user.id]);

    await client.query('COMMIT');
    await audit(req, 'ADD_LOT_DISPOSITIF', 'lots_dispositifs', rows[0].id, { numero_lot, quantite: qte });
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
router.post('/pharmacovigilance/effets-indesirables', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { patient_id, medicament_id, effet, description, severite, date_survenue } = req.body;
  try {
    if (patient_id) {
      const patCheck = await pool.query(
        'SELECT id FROM patients WHERE id=$1 AND hospital_id=$2',
        [patient_id, req.hospitalId]
      );
      if (patCheck.rowCount === 0) return res.status(404).json({ error: 'Patient non trouvé' });
    }
    if (medicament_id) {
      const medCheck = await pool.query(
        'SELECT id FROM medicaments WHERE id=$1 AND hospital_id=$2',
        [medicament_id, req.hospitalId]
      );
      if (medCheck.rowCount === 0) return res.status(404).json({ error: 'Médicament non trouvé' });
    }

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

router.get('/pharmacovigilance/effets-indesirables', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pv.*, u.login AS declare_par_login, m.nom AS medicament_nom
      FROM pharmacovigilance pv
      LEFT JOIN utilisateurs u ON pv.declare_par = u.id AND u.hospital_id = $1
      LEFT JOIN medicaments m ON pv.medicament_id = m.id AND m.hospital_id = $1
      WHERE pv.hospital_id = $1
      ORDER BY pv.date_declaration DESC
      LIMIT 100
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /pharmacovigilance/effets-indesirables :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ==================== PRÉPARATIONS MAGISTRALES ====================
// ==================================================================
router.get('/preparations/recettes', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM recettes_preparations WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /preparations/recettes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/preparations/recettes', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
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

router.put('/preparations/recettes/:id', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { nom, description, ingredients, etapes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE recettes_preparations SET nom=$1, description=$2, ingredients=$3, etapes=$4
      WHERE id=$5 AND hospital_id=$6
    `, [nom, description, ingredients, etapes, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Recette non trouvée' });
    await audit(req, 'UPDATE_RECETTE', 'recettes_preparations', req.params.id, req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /preparations/recettes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/preparations/recettes/:id', requireHospital, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM recettes_preparations WHERE id=$1 AND hospital_id=$2',
      [req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Recette non trouvée' });
    await audit(req, 'DELETE_RECETTE', 'recettes_preparations', req.params.id, {});
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Erreur DELETE /preparations/recettes/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/preparations/executer', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { recette_id, patient_id, quantite_finale, lot_id_medicament } = req.body;
  try {
    if (recette_id) {
      const r = await pool.query('SELECT id FROM recettes_preparations WHERE id=$1 AND hospital_id=$2', [recette_id, req.hospitalId]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Recette non trouvée' });
    }
    if (patient_id) {
      const p = await pool.query('SELECT id FROM patients WHERE id=$1 AND hospital_id=$2', [patient_id, req.hospitalId]);
      if (p.rowCount === 0) return res.status(404).json({ error: 'Patient non trouvé' });
    }

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
router.get('/ruptures', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, code, nom, stock, seuil_alerte
      FROM medicaments
      WHERE hospital_id = $1 AND stock = 0
      ORDER BY nom
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ruptures :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions-commandes', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.code, m.nom, m.stock, m.seuil_alerte,
             COALESCE(SUM(l.stock_actuel), 0) AS stock_lots
      FROM medicaments m
      LEFT JOIN lots l ON m.id = l.medicament_id
        AND l.hospital_id = $1
        AND l.date_peremption > NOW()
      WHERE m.hospital_id = $1
      GROUP BY m.id
      HAVING COALESCE(SUM(l.stock_actuel), 0) <= m.seuil_alerte
      ORDER BY m.nom
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /suggestions-commandes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/preparations/executions', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pe.*, r.nom AS recette_nom, u.login AS realise_par
      FROM preparations_executees pe
      LEFT JOIN recettes_preparations r ON pe.recette_id = r.id AND r.hospital_id = $1
      LEFT JOIN utilisateurs u ON pe.realise_par = u.id AND u.hospital_id = $1
      WHERE pe.hospital_id = $1
      ORDER BY pe.date_execution DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /preparations/executions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// ========== INFIRMIERS ============================================
// ==================================================================
router.get('/infirmiers', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
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
router.get('/ordonnances/historique', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.numero_ordonnance, o.date_creation, o.statut,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             u.nom AS retrieved_nom, u.prenom AS retrieved_prenom,
             (SELECT COUNT(*) FROM ligne_ordonnances lo WHERE lo.ordonnance_id = o.id) AS nb_medicaments
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id AND pat.hospital_id = $1
      LEFT JOIN medecins m ON o.medecin_id = m.id AND m.hospital_id = $1
      LEFT JOIN utilisateurs u ON o.retrieved_by = u.id AND u.hospital_id = $1
      WHERE o.hospital_id = $1
        AND o.statut IN ('delivree', 'servie', 'partiellement_delivree')
      ORDER BY o.date_creation DESC
      LIMIT 50
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /pharmacy/ordonnances/historique :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ordonnances/en-attente', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.patient_id, o.date_creation, o.statut, o.observations, o.numero_ordonnance,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id AND pat.hospital_id = $1
      LEFT JOIN medecins m ON o.medecin_id = m.id AND m.hospital_id = $1
      WHERE o.hospital_id = $1
        AND o.statut = 'en_attente'
      ORDER BY o.date_creation DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/en-attente :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ordonnances', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { statut, patient_id, date_debut, date_fin } = req.query;
    const conditions = ['o.hospital_id = $1'];
    const params = [req.hospitalId];
    let paramIndex = 2;

    if (statut) { conditions.push(`o.statut = $${paramIndex++}`); params.push(statut); }
    if (patient_id) { conditions.push(`o.patient_id = $${paramIndex++}`); params.push(patient_id); }
    if (date_debut) { conditions.push(`o.date_creation >= $${paramIndex++}`); params.push(date_debut); }
    if (date_fin) { conditions.push(`o.date_creation <= $${paramIndex++}`); params.push(date_fin); }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT o.id, o.patient_id, o.date_creation, o.statut, o.observations, o.numero_ordonnance, o.retrieved_by,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             u.nom AS retrieved_nom, u.prenom AS retrieved_prenom
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id AND pat.hospital_id = $1
      LEFT JOIN medecins m ON o.medecin_id = m.id AND m.hospital_id = $1
      LEFT JOIN utilisateurs u ON o.retrieved_by = u.id AND u.hospital_id = $1
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

router.get('/ordonnances/:id/lignes', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const ordCheck = await pool.query(
      'SELECT id FROM ordonnances WHERE id=$1 AND hospital_id=$2',
      [req.params.id, req.hospitalId]
    );
    if (ordCheck.rowCount === 0) return res.status(404).json({ error: 'Ordonnance non trouvée' });

    const { rows } = await pool.query(`
      SELECT lo.*, m.nom AS medicament_nom, m.code, m.stock, m.est_stupefiant
      FROM ligne_ordonnances lo
      JOIN medicaments m ON lo.medicament_id = m.id AND m.hospital_id = $2
      WHERE lo.ordonnance_id = $1
      ORDER BY lo.id
    `, [req.params.id, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/:id/lignes :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ordonnances/:id', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.id, o.patient_id, o.date_creation, o.statut, o.observations, o.numero_ordonnance, o.retrieved_by,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             u.nom AS retrieved_nom, u.prenom AS retrieved_prenom
      FROM ordonnances o
      JOIN patients pat ON o.patient_id = pat.id AND pat.hospital_id = $2
      LEFT JOIN medecins m ON o.medecin_id = m.id AND m.hospital_id = $2
      LEFT JOIN utilisateurs u ON o.retrieved_by = u.id AND u.hospital_id = $2
      WHERE o.id = $1 AND o.hospital_id = $2
    `, [req.params.id, req.hospitalId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur GET /ordonnances/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/ordonnances/:id/statut', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { statut } = req.body;
  try {
    const result = await pool.query(
      'UPDATE ordonnances SET statut = $1 WHERE id = $2 AND hospital_id = $3',
      [statut, req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    await audit(req, 'UPDATE_ORDONNANCE_STATUT', 'ordonnances', req.params.id, { statut });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur PUT /ordonnances/:id/statut :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/ordonnances/:id/serve', requireHospital, requirePermission('manage_pharmacy'), async (req, res) => {
  const { password, retrieved_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    if (req.user.role !== 'admin' && req.user.role !== 'pharmacien') {
      const user = await client.query(
        'SELECT password_hash FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
        [req.user.id, req.hospitalId]
      );
      if (user.rows.length === 0) throw new Error('Utilisateur non trouvé');
      const validPassword = await bcrypt.compare(password, user.rows[0].password_hash || '');
      if (!validPassword) throw new Error('Mot de passe incorrect');
    }

    const result = await client.query(
      'UPDATE ordonnances SET statut = $1, retrieved_by = $2 WHERE id = $3 AND hospital_id = $4',
      ['delivree', retrieved_by, req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordonnance non trouvée' });
    }

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
router.get('/stats', requireHospital, requirePermission('view_pharmacy'), async (req, res) => {
  try {
    const [attente, alertes, commandes, stock] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM ordonnances WHERE hospital_id = $1 AND statut = $2', [req.hospitalId, 'en_attente']),
      pool.query('SELECT COUNT(*) FROM medicaments WHERE hospital_id = $1 AND stock <= seuil_alerte', [req.hospitalId]),
      pool.query('SELECT COUNT(*) FROM commandes WHERE hospital_id = $1 AND statut = $2', [req.hospitalId, 'en_cours']),
      pool.query('SELECT COUNT(DISTINCT id) FROM medicaments WHERE hospital_id = $1 AND stock > 0', [req.hospitalId])
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