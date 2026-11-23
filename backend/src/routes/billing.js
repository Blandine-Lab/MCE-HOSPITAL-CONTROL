// src/routes/billing.js
// ============================================================
// 💰 BILLING – Facturation, prestations, paiements
// ------------------------------------------------------------
// ⚠️ Le pool patché pose `app.hospital_id` via ALS, MAIS le RLS
//    a été mis en NO FORCE + policy tenant_isolation supprimée.
//    On filtre donc explicitement TOUTES les routes sur
//    `req.hospitalId` (JWT) pour garantir l'isolation tenant.
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

// ================================================================
// Helpers
// ================================================================
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

// ================================================================
// ========== RECHERCHE DE PATIENTS ==============================
// ================================================================
router.get('/patients/search', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }
  try {
    const { rows } = await pool.query(`
      SELECT id, nom, prenom, ipp, date_naissance
      FROM patients
      WHERE hospital_id = $1
        AND (nom ILIKE $2 OR prenom ILIKE $2 OR ipp ILIKE $2)
      ORDER BY nom, prenom
      LIMIT 20
    `, [req.hospitalId, `%${q}%`]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ========== LISTE DES MÉDICAMENTS FACTURABLES ==================
// ================================================================
router.get('/medicaments/patient/:patientId', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  const { patientId } = req.params;
  try {
    // ✅ Vérifier que le patient appartient au tenant
    const patientCheck = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patientId, req.hospitalId]
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { rows } = await pool.query(`
      SELECT 
        lo.id AS mouvement_id,
        m.nom AS libelle,
        lo.quantite_prescrit AS quantite,
        m.prix_unitaire AS prix_unitaire,
        o.date_creation AS date_mouvement,
        'ordonnance' AS source
      FROM ligne_ordonnances lo
      JOIN ordonnances o ON lo.ordonnance_id = o.id
      JOIN medicaments m ON lo.medicament_id = m.id
      WHERE o.patient_id = $1
        AND o.hospital_id = $2
        AND o.statut IN ('delivree', 'partiellement_delivree')
        AND (lo.facture_id IS NULL OR lo.facture_id = 0)
      UNION ALL
      SELECT 
        ms.id AS mouvement_id,
        m.nom AS libelle,
        ms.quantite,
        m.prix_unitaire,
        ms.date_mouvement,
        'stock' AS source
      FROM mouvements_stock ms
      JOIN medicaments m ON ms.medicament_id = m.id
      WHERE ms.patient_id = $1
        AND ms.hospital_id = $2
        AND ms.type = 'sortie'
        AND (ms.facture_id IS NULL OR ms.facture_id = 0)
      ORDER BY date_mouvement DESC
    `, [patientId, req.hospitalId]);

    res.json(rows);
  } catch (err) {
    console.error('❌ GET /medicaments/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ========== PRESTATIONS D'UN SÉJOUR ============================
// ================================================================
router.get('/sejour/:sejourId/prestations', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  const { sejourId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const admission = await client.query(`
      SELECT a.id, a.patient_id, a.date_admission, a.date_sortie_prevue, a.service_id, s.nom AS service_nom
      FROM admissions a
      JOIN services s ON a.service_id = s.id
      WHERE a.id = $1 AND a.hospital_id = $2
    `, [sejourId, req.hospitalId]);
    if (admission.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Séjour non trouvé' });
    }
    const ad = admission.rows[0];
    const dateDebut = ad.date_admission;
    const dateFin = ad.date_sortie_reelle || ad.date_sortie_prevue || new Date();

    const prestations = [];

    const nbJours = Math.max(1, Math.ceil((new Date(dateFin) - new Date(dateDebut)) / (1000 * 60 * 60 * 24)));
    prestations.push({
      reference_id: ad.id,
      origine: 'admission',
      libelle: `Séjour en ${ad.service_nom}`,
      date: dateDebut,
      quantite: nbJours,
      prix_unitaire: 150.00,
      total: nbJours * 150.00,
    });

    if (ad.date_sortie_reelle) {
      prestations.push({
        reference_id: ad.id,
        origine: 'sortie',
        libelle: 'Jour de sortie (frais de dossier)',
        date: ad.date_sortie_reelle,
        quantite: 1,
        prix_unitaire: 50.00,
        total: 50.00,
      });
    }

    // ✅ examens filtrés par tenant
    const examens = await client.query(`
      SELECT e.id, e.date_demande, e.type_examen, e.categorie
      FROM examens e
      WHERE e.patient_id = $1
        AND e.hospital_id = $2
        AND e.date_demande >= $3::date
        AND e.date_demande <= $4::date
    `, [ad.patient_id, req.hospitalId, dateDebut, dateFin]);
    examens.rows.forEach(ex => {
      const prix = (ex.categorie === 'imagerie') ? 80 : 40;
      prestations.push({
        reference_id: ex.id,
        origine: 'examen',
        libelle: `${ex.categorie} - ${ex.type_examen}`,
        date: ex.date_demande,
        quantite: 1,
        prix_unitaire: prix,
        total: prix,
      });
    });

    try {
      const soins = await client.query(`
        SELECT s.id, s.type_soin, s.date_soin, s.prix, s.quantite
        FROM soins s
        WHERE s.patient_id = $1
          AND s.hospital_id = $2
          AND s.date_soin >= $3::date
          AND s.date_soin <= $4::date
      `, [ad.patient_id, req.hospitalId, dateDebut, dateFin]);
      soins.rows.forEach(soin => {
        const prix = parseFloat(soin.prix) || 0;
        const qte = parseInt(soin.quantite) || 1;
        prestations.push({
          reference_id: soin.id,
          origine: 'soin',
          libelle: soin.type_soin,
          date: soin.date_soin,
          quantite: qte,
          prix_unitaire: prix,
          total: qte * prix,
        });
      });
    } catch (err) {
      console.warn('⚠️ Table soins absente ou colonnes différentes :', err.message);
    }

    const meds = await client.query(`
      SELECT ms.id, ms.medicament_id, m.nom, ms.quantite, ms.date_mouvement, m.prix_unitaire
      FROM mouvements_stock ms
      JOIN medicaments m ON ms.medicament_id = m.id
      WHERE ms.patient_id = $1
        AND ms.hospital_id = $2
        AND ms.type = 'sortie'
        AND ms.date_mouvement >= $3::date
        AND ms.date_mouvement <= $4::date
    `, [ad.patient_id, req.hospitalId, dateDebut, dateFin]);
    meds.rows.forEach(med => {
      const prix = parseFloat(med.prix_unitaire) || 0;
      const qte = parseInt(med.quantite) || 1;
      prestations.push({
        reference_id: med.id,
        origine: 'medicament',
        libelle: med.nom,
        date: med.date_mouvement,
        quantite: qte,
        prix_unitaire: prix,
        total: qte * prix,
      });
    });

    const consultations = await client.query(`
      SELECT r.id, r.date_rdv, r.motif
      FROM rendez_vous r
      WHERE r.patient_id = $1
        AND r.hospital_id = $2
        AND r.date_rdv >= $3::date
        AND r.date_rdv <= $4::date
    `, [ad.patient_id, req.hospitalId, dateDebut, dateFin]);
    consultations.rows.forEach(cons => {
      prestations.push({
        reference_id: cons.id,
        origine: 'consultation',
        libelle: `Consultation${cons.motif ? ' - ' + cons.motif : ''}`,
        date: cons.date_rdv,
        quantite: 1,
        prix_unitaire: 50.00,
        total: 50.00,
      });
    });

    try {
      const interventions = await client.query(`
        SELECT i.id, i.date_intervention, i.nom, i.prix
        FROM interventions i
        WHERE i.sejour_id = $1 AND i.hospital_id = $2
      `, [sejourId, req.hospitalId]);
      interventions.rows.forEach(inter => {
        const prix = parseFloat(inter.prix) || 0;
        prestations.push({
          reference_id: inter.id,
          origine: 'intervention',
          libelle: inter.nom || 'Intervention chirurgicale',
          date: inter.date_intervention,
          quantite: 1,
          prix_unitaire: prix,
          total: prix,
        });
      });
    } catch {
      console.warn('⚠️ Table interventions absente ou colonne sejour_id manquante');
    }

    await client.query('COMMIT');
    res.json(prestations);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur GET /sejour/:sejourId/prestations:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ================================================================
// ========== PRESTATIONS D'UNE CONSULTATION (AMBULATOIRE) =======
// ================================================================
router.get('/consultation/:consultationId/prestations', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  const { consultationId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const cons = await client.query(`
      SELECT id, patient_id, date_rdv, motif
      FROM rendez_vous
      WHERE id = $1 AND hospital_id = $2
    `, [consultationId, req.hospitalId]);
    if (cons.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Consultation non trouvée' });
    }
    const c = cons.rows[0];
    const prestations = [];

    prestations.push({
      reference_id: c.id,
      origine: 'consultation',
      libelle: `Consultation${c.motif ? ' - ' + c.motif : ''}`,
      date: c.date_rdv,
      quantite: 1,
      prix_unitaire: 50.00,
      total: 50.00,
    });

    const examens = await client.query(`
      SELECT e.id, e.date_demande, e.type_examen, e.categorie
      FROM examens e
      WHERE e.patient_id = $1
        AND e.hospital_id = $2
        AND e.date_demande = $3::date
    `, [c.patient_id, req.hospitalId, c.date_rdv]);
    examens.rows.forEach(ex => {
      const prix = (ex.categorie === 'imagerie') ? 80 : 40;
      prestations.push({
        reference_id: ex.id,
        origine: 'examen',
        libelle: `${ex.categorie} - ${ex.type_examen}`,
        date: ex.date_demande,
        quantite: 1,
        prix_unitaire: prix,
        total: prix,
      });
    });

    try {
      const actes = await client.query(`
        SELECT a.id, a.nom, a.date_acte, a.prix
        FROM actes_paramedicaux a
        WHERE a.consultation_id = $1 AND a.hospital_id = $2
      `, [consultationId, req.hospitalId]);
      actes.rows.forEach(act => {
        const prix = parseFloat(act.prix) || 0;
        prestations.push({
          reference_id: act.id,
          origine: 'acte',
          libelle: act.nom || 'Acte paramédical',
          date: act.date_acte,
          quantite: 1,
          prix_unitaire: prix,
          total: prix,
        });
      });
    } catch {
      console.warn('⚠️ Table actes_paramedicaux absente ou colonne consultation_id manquante');
    }

    try {
      const prescriptions = await client.query(`
        SELECT p.id, p.date_creation, p.notes
        FROM prescriptions p
        WHERE p.consultation_id = $1 AND p.hospital_id = $2
      `, [consultationId, req.hospitalId]);
      for (const presc of prescriptions.rows) {
        const items = await client.query(`
          SELECT pi.medicament, pi.quantite, pi.posologie, pi.prix_unitaire
          FROM prescription_items pi
          WHERE pi.prescription_id = $1
        `, [presc.id]);
        items.rows.forEach(item => {
          const qte = parseInt(item.quantite) || 1;
          const prix = parseFloat(item.prix_unitaire) || 0;
          prestations.push({
            reference_id: presc.id,
            origine: 'prescription',
            libelle: `${item.medicament}${item.posologie ? ' ('+item.posologie+')' : ''}`,
            date: presc.date_creation,
            quantite: qte,
            prix_unitaire: prix,
            total: qte * prix,
          });
        });
      }
    } catch {
      console.warn('⚠️ Table prescriptions absente ou colonne consultation_id manquante');
    }

    await client.query('COMMIT');
    res.json(prestations);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur GET /consultation/:consultationId/prestations:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ================================================================
// ========== PRESTATIONS (CRUD) =================================
// ================================================================
router.get('/prestations', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM prestations WHERE hospital_id = $1 ORDER BY code',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/prestations', authenticate, requireHospital, requirePermission('manage_finance'), async (req, res) => {
  const { code, libelle, prix_unitaire, categorie } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO prestations (hospital_id, code, libelle, prix_unitaire, categorie)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.hospitalId, code, libelle, prix_unitaire, categorie]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/prestations/:id', authenticate, requireHospital, requirePermission('manage_finance'), async (req, res) => {
  const { code, libelle, prix_unitaire, categorie } = req.body;
  try {
    const result = await pool.query(
      'UPDATE prestations SET code=$1, libelle=$2, prix_unitaire=$3, categorie=$4 WHERE id=$5 AND hospital_id=$6',
      [code, libelle, prix_unitaire, categorie, req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Prestation non trouvée' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/prestations/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    // ✅ Vérifier que la prestation appartient au tenant
    const own = await pool.query(
      'SELECT id FROM prestations WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (own.rowCount === 0) return res.status(404).json({ error: 'Prestation non trouvée' });

    const used = await pool.query(
      'SELECT id FROM facture_lignes WHERE prestation_id = $1 AND hospital_id = $2 LIMIT 1',
      [req.params.id, req.hospitalId]
    );
    if (used.rowCount > 0) {
      return res.status(400).json({ error: 'Cette prestation est déjà utilisée dans des factures, suppression impossible.' });
    }
    await pool.query('DELETE FROM prestations WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ASSURANCES ==========
router.get('/assurances', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM assurances WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assurances', authenticate, requireHospital, requirePermission('manage_finance'), async (req, res) => {
  const { nom, code, taux_prise_en_charge, adresse, telephone, email } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO assurances (hospital_id, nom, code, taux_prise_en_charge, adresse, telephone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.hospitalId, nom, code, taux_prise_en_charge, adresse, telephone, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ========== FACTURES (CRUD enrichi) ============================
// ================================================================

router.get('/factures', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, p.nom AS patient_nom, p.prenom AS patient_prenom, p.ipp
      FROM factures f
      LEFT JOIN patients p ON f.patient_id = p.id
      WHERE f.hospital_id = $1
      ORDER BY f.date_facture DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/factures/:id', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  try {
    const facture = await pool.query(`
      SELECT f.*, p.nom AS patient_nom, p.prenom AS patient_prenom
      FROM factures f
      LEFT JOIN patients p ON f.patient_id = p.id
      WHERE f.id = $1 AND f.hospital_id = $2
    `, [req.params.id, req.hospitalId]);
    if (facture.rows.length === 0) return res.status(404).json({ error: 'Facture non trouvée' });

    const lignes = await pool.query(`
      SELECT fl.*, p.code, p.libelle AS prestation_libelle
      FROM facture_lignes fl
      LEFT JOIN prestations p ON fl.prestation_id = p.id
      WHERE fl.facture_id = $1 AND fl.hospital_id = $2
      ORDER BY fl.id
    `, [req.params.id, req.hospitalId]);
    res.json({ ...facture.rows[0], lignes: lignes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/factures', authenticate, requireHospital, requirePermission('manage_finance'), async (req, res) => {
  console.log('📥 Corps reçu :', JSON.stringify(req.body, null, 2));
  const {
    patient_id,
    assurance_id,
    date_emission,
    date_echeance,
    remise,
    statut,
    lignes,
    examens_ids,
    consultations_ids,
    medicament_ids,
    mode,
    sejour_id,
    consultation_id,
    notes,
    tiers_payant,
    type_facture,
  } = req.body;

  if (!patient_id || (!lignes?.length && !examens_ids?.length && !consultations_ids?.length && !medicament_ids?.length)) {
    return res.status(400).json({ error: 'Patient et au moins une prestation, un examen, une consultation ou un médicament requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    // ✅ Vérifier que le patient appartient au tenant
    const patCheck = await client.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patient_id, req.hospitalId]
    );
    if (patCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé dans cet établissement' });
    }

    // Récupération des examens (filtrés par tenant)
    let examensRows = [];
    if (examens_ids && examens_ids.length > 0) {
      const examensResult = await client.query(`
        SELECT id, type_examen, categorie, prix,
               COALESCE(prix,
                 CASE
                   WHEN categorie = 'imagerie' THEN 80
                   WHEN categorie = 'biologie' THEN 40
                   ELSE 50
                 END
               ) AS prix_calcule
        FROM examens
        WHERE id = ANY($1::int[]) AND patient_id = $2 AND hospital_id = $3
          AND statut NOT IN ('annulé')
      `, [examens_ids, patient_id, req.hospitalId]);
      examensRows = examensResult.rows;
      if (examensRows.length !== examens_ids.length) {
        throw new Error('Certains examens n\'existent pas ou n\'appartiennent pas à ce patient');
      }
    }

    // Récupération des consultations (filtrées par tenant)
    let consultationsRows = [];
    if (consultations_ids && consultations_ids.length > 0) {
      const consultationsResult = await client.query(`
        SELECT id, motif, type_consultation, categorie, prix,
               COALESCE(prix, 50.00) AS prix_calcule,
               date_rdv
        FROM rendez_vous
        WHERE id = ANY($1::int[]) AND patient_id = $2 AND hospital_id = $3
          AND statut NOT IN ('annulé')
      `, [consultations_ids, patient_id, req.hospitalId]);
      consultationsRows = consultationsResult.rows;
      if (consultationsRows.length !== consultations_ids.length) {
        throw new Error('Certaines consultations n\'existent pas ou n\'appartiennent pas à ce patient');
      }
    }

    // Récupération des médicaments (filtrés par tenant)
    let medicamentsRows = [];
    if (medicament_ids && medicament_ids.length > 0) {
      const medicamentsResult = await client.query(`
        SELECT 
          pi.id AS mouvement_id,
          pi.medicament AS libelle,
          pi.quantite,
          pi.prix_unitaire
        FROM prescription_items pi
        JOIN prescriptions p ON pi.prescription_id = p.id
        WHERE pi.id = ANY($1::int[]) AND p.patient_id = $2 AND p.hospital_id = $3
          AND p.status = 'served'
          AND (pi.facture_id IS NULL OR pi.facture_id = 0)
        UNION ALL
        SELECT 
          ms.id AS mouvement_id,
          m.nom AS libelle,
          ms.quantite,
          m.prix_unitaire
        FROM mouvements_stock ms
        JOIN medicaments m ON ms.medicament_id = m.id
        WHERE ms.id = ANY($1::int[]) AND ms.patient_id = $2 AND ms.hospital_id = $3
          AND ms.type = 'sortie'
          AND (ms.facture_id IS NULL OR ms.facture_id = 0)
      `, [medicament_ids, patient_id, req.hospitalId]);
      medicamentsRows = medicamentsResult.rows;
      if (medicamentsRows.length !== medicament_ids.length) {
        throw new Error('Certains médicaments n\'existent pas ou sont déjà facturés');
      }
    }

    // Construction des lignes
    const allLines = [];

    if (lignes && lignes.length > 0) {
      for (const ligne of lignes) {
        const prix = parseFloat(ligne.prix_unitaire) || 0;
        const qte = parseInt(ligne.quantite) || 1;
        allLines.push({
          prestation_id: ligne.prestation_id || null,
          libelle: ligne.libelle || 'Prestation',
          quantite: qte,
          prix_unitaire: prix,
          total_ligne: prix * qte
        });
      }
    }

    for (const ex of examensRows) {
      const prix = parseFloat(ex.prix_calcule) || 0;
      allLines.push({
        prestation_id: null,
        libelle: `Examen : ${ex.type_examen} (${ex.categorie})`,
        quantite: 1,
        prix_unitaire: prix,
        total_ligne: prix,
      });
    }

    for (const c of consultationsRows) {
      const prix = parseFloat(c.prix_calcule) || 50.00;
      const type = c.type_consultation || 'générale';
      const motif = c.motif ? ` - ${c.motif}` : '';
      allLines.push({
        prestation_id: null,
        libelle: `Consultation ${type}${motif}`,
        quantite: 1,
        prix_unitaire: prix,
        total_ligne: prix,
      });
    }

    for (const med of medicamentsRows) {
      const prix = parseFloat(med.prix_unitaire) || 0;
      const qte = parseInt(med.quantite) || 1;
      allLines.push({
        prestation_id: null,
        libelle: `Médicament : ${med.libelle}`,
        quantite: qte,
        prix_unitaire: prix,
        total_ligne: prix * qte,
      });
    }

    let total = allLines.reduce((acc, line) => acc + line.total_ligne, 0);
    const remiseValue = parseFloat(remise) || 0;
    if (remiseValue > 0) total -= total * remiseValue / 100;

    const timestamp = Date.now();
    const numeroFacture = `F${timestamp}`;

    const { rows } = await client.query(`
      INSERT INTO factures (
        hospital_id,
        patient_id, assurance_id, date_emission, date_echeance,
        remise, montant_total, statut, numero_facture,
        notes, tiers_payant, mode, sejour_id, consultation_id,
        type_facture
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      req.hospitalId,
      patient_id,
      assurance_id || null,
      date_emission || new Date().toISOString().split('T')[0],
      date_echeance || null,
      remiseValue,
      total,
      statut || 'impayee',
      numeroFacture,
      notes || null,
      tiers_payant || null,
      mode || 'hospitalisation',
      sejour_id || null,
      consultation_id || null,
      type_facture || 'mixte',
    ]);

    const factureId = rows[0].id;

    for (const line of allLines) {
      await client.query(`
        INSERT INTO facture_lignes (hospital_id, facture_id, prestation_id, quantite, prix_unitaire, total_ligne, libelle)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.hospitalId, factureId, line.prestation_id, line.quantite, line.prix_unitaire, line.total_ligne, line.libelle]);
    }

    // ✅ UPDATE scopés par tenant pour éviter les fuites
    if (medicament_ids && medicament_ids.length > 0) {
      await client.query(
        `UPDATE prescription_items SET facture_id = $1 WHERE id = ANY($2::int[])`,
        [factureId, medicament_ids]
      );
      await client.query(
        `UPDATE mouvements_stock SET facture_id = $1 WHERE id = ANY($2::int[]) AND hospital_id = $3`,
        [factureId, medicament_ids, req.hospitalId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur POST /factures:', err);
    res.status(500).json({ error: err.message, detail: err.detail });
  } finally {
    client.release();
  }
});

// ================================================================
// ========== PAIEMENTS ==========================================
// ================================================================
router.post('/paiements', authenticate, requireHospital, requirePermission('manage_finance'), async (req, res) => {
  const { facture_id, montant, mode, reference } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    // ✅ Vérifier que la facture appartient au tenant
    const factureCheck = await client.query(
      'SELECT id FROM factures WHERE id = $1 AND hospital_id = $2',
      [facture_id, req.hospitalId]
    );
    if (factureCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    await client.query(`
      INSERT INTO paiements (hospital_id, facture_id, montant, mode, reference)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.hospitalId, facture_id, montant, mode, reference]);

    await client.query(
      'UPDATE factures SET montant_paye = montant_paye + $1 WHERE id = $2 AND hospital_id = $3',
      [montant, facture_id, req.hospitalId]
    );

    const facture = await client.query(
      'SELECT montant_total, montant_paye FROM factures WHERE id = $1 AND hospital_id = $2',
      [facture_id, req.hospitalId]
    );
    if (facture.rows[0].montant_paye >= facture.rows[0].montant_total) {
      await client.query(
        'UPDATE factures SET statut = $1 WHERE id = $2 AND hospital_id = $3',
        ['payee', facture_id, req.hospitalId]
      );
    }
    await client.query('COMMIT');
    res.sendStatus(201);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ================================================================
// ========== RELANCES ===========================================
// ================================================================
router.post('/relances', authenticate, requireHospital, requirePermission('manage_finance'), async (req, res) => {
  const { facture_id, mode, commentaire } = req.body;
  try {
    // ✅ Vérifier que la facture appartient au tenant
    const factureCheck = await pool.query(
      'SELECT id FROM factures WHERE id = $1 AND hospital_id = $2',
      [facture_id, req.hospitalId]
    );
    if (factureCheck.rowCount === 0) return res.status(404).json({ error: 'Facture non trouvée' });

    await pool.query(`
      INSERT INTO relances (hospital_id, facture_id, mode, commentaire)
      VALUES ($1, $2, $3, $4)
    `, [req.hospitalId, facture_id, mode, commentaire]);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/relances/facture/:factureId', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  try {
    // ✅ Vérifier que la facture appartient au tenant
    const factureCheck = await pool.query(
      'SELECT id FROM factures WHERE id = $1 AND hospital_id = $2',
      [req.params.factureId, req.hospitalId]
    );
    if (factureCheck.rowCount === 0) return res.status(404).json({ error: 'Facture non trouvée' });

    const { rows } = await pool.query(
      'SELECT * FROM relances WHERE facture_id = $1 AND hospital_id = $2 ORDER BY date_relance DESC',
      [req.params.factureId, req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// ========== RÉCAPITULATIF DE FACTURES ==========================
// ================================================================
router.get('/recap', authenticate, requireHospital, requirePermission('view_finance'), async (req, res) => {
  try {
    const { facture_ids, patient_id } = req.query;
    let ids = [];
    if (facture_ids) {
      ids = facture_ids.split(',').map(Number);
    } else if (patient_id) {
      const result = await pool.query(
        'SELECT id FROM factures WHERE patient_id = $1 AND hospital_id = $2',
        [patient_id, req.hospitalId]
      );
      ids = result.rows.map(r => r.id);
    } else {
      return res.status(400).json({ error: 'Fournissez facture_ids ou patient_id' });
    }

    if (ids.length === 0) {
      return res.status(404).json({ error: 'Aucune facture trouvée' });
    }

    const factures = await pool.query(`
      SELECT f.*, p.nom AS patient_nom, p.prenom AS patient_prenom
      FROM factures f
      JOIN patients p ON f.patient_id = p.id
      WHERE f.id = ANY($1::int[]) AND f.hospital_id = $2
      ORDER BY f.date_facture DESC
    `, [ids, req.hospitalId]);

    if (factures.rows.length === 0) {
      return res.status(404).json({ error: 'Factures non trouvées' });
    }

    const lignes = await pool.query(`
      SELECT fl.*, f.id AS facture_id, f.type_facture
      FROM facture_lignes fl
      JOIN factures f ON fl.facture_id = f.id
      WHERE f.id = ANY($1::int[]) AND f.hospital_id = $2
      ORDER BY f.date_facture DESC, fl.id
    `, [ids, req.hospitalId]);

    const grouped = {};
    for (const ligne of lignes.rows) {
      const type = ligne.type_facture || 'mixte';
      if (!grouped[type]) grouped[type] = { total: 0, lignes: [] };
      grouped[type].total += parseFloat(ligne.total_ligne) || 0;
      grouped[type].lignes.push(ligne);
    }

    let totalGeneral = 0;
    for (const key in grouped) {
      totalGeneral += grouped[key].total;
    }

    const recap = {
      patient: {
        id: factures.rows[0].patient_id,
        nom: factures.rows[0].patient_nom,
        prenom: factures.rows[0].patient_prenom,
      },
      factures: factures.rows.map(f => ({
        id: f.id,
        numero: f.numero_facture,
        date: f.date_facture || f.date_emission,
        total: f.montant_total,
        type_facture: f.type_facture || 'mixte'
      })),
      par_type: grouped,
      total_general: totalGeneral,
      nombre_factures: factures.rows.length,
    };

    res.json(recap);
  } catch (err) {
    console.error('❌ Erreur GET /billing/recap :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;