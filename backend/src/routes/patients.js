const express = require('express');
const router = express.Router();
const { pool } = require('../../server'); // ✅ Utilisation du pool centralisé
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');

const toNull = (val) => (val === '' || val === undefined || val === null) ? null : val;

// ============================================================
//  PROTECTION : toutes les routes nécessitent un token
// ============================================================
router.use(authenticate);

// ============================================================
//  GET / – Liste des patients
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, ipp, nom, prenom, telephone, email, date_naissance, date_admission,
             statut, lit_id, date_sortie
      FROM patients
      ORDER BY nom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  GET /:id – Détail d'un patient
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Patient non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  POST / – Créer un patient (nécessite manage_patients)
// ============================================================
router.post('/', requirePermission('manage_patients'), async (req, res) => {
  const {
    nom, prenom, date_naissance, telephone, email, adresse, ipp,
    personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
    personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
    antecedents, allergies, traitements, consentements, date_admission
  } = req.body;

  const admissionDate = date_admission || new Date().toISOString().split('T')[0];

  try {
    const { rows } = await pool.query(`
      INSERT INTO patients (
        nom, prenom, date_naissance, telephone, email, adresse, ipp,
        personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
        personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
        antecedents, allergies, traitements, consentements, date_admission
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *
    `, [
      nom, prenom, date_naissance, toNull(telephone), toNull(email), toNull(adresse), toNull(ipp),
      toNull(personne_a_prevenir_nom1), toNull(personne_a_prevenir_tel1), toNull(personne_a_prevenir_adresse1),
      toNull(personne_a_prevenir_nom2), toNull(personne_a_prevenir_tel2), toNull(personne_a_prevenir_adresse2),
      toNull(antecedents), toNull(allergies), toNull(traitements), consentements === true,
      admissionDate
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("❌ Erreur POST patient:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  PUT /:id – Modifier un patient (nécessite manage_patients)
// ============================================================
router.put('/:id', requirePermission('manage_patients'), async (req, res) => {
  const {
    nom, prenom, date_naissance, telephone, email, adresse, ipp,
    personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
    personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
    antecedents, allergies, traitements, consentements, date_admission
  } = req.body;

  let dateNaissance = null;
  if (date_naissance && date_naissance !== '') {
    dateNaissance = new Date(date_naissance);
    if (isNaN(dateNaissance.getTime())) dateNaissance = null;
  }

  let admissionDate = null;
  if (date_admission && date_admission !== '') {
    admissionDate = new Date(date_admission);
    if (isNaN(admissionDate.getTime())) admissionDate = null;
  }

  try {
    const result = await pool.query(`
      UPDATE patients SET
        nom=$1, prenom=$2, date_naissance=$3, telephone=$4, email=$5, adresse=$6, ipp=$7,
        personne_a_prevenir_nom1=$8, personne_a_prevenir_tel1=$9, personne_a_prevenir_adresse1=$10,
        personne_a_prevenir_nom2=$11, personne_a_prevenir_tel2=$12, personne_a_prevenir_adresse2=$13,
        antecedents=$14, allergies=$15, traitements=$16, consentements=$17, date_admission=$18
      WHERE id=$19
    `, [
      nom, prenom, dateNaissance, toNull(telephone), toNull(email), toNull(adresse), toNull(ipp),
      toNull(personne_a_prevenir_nom1), toNull(personne_a_prevenir_tel1), toNull(personne_a_prevenir_adresse1),
      toNull(personne_a_prevenir_nom2), toNull(personne_a_prevenir_tel2), toNull(personne_a_prevenir_adresse2),
      toNull(antecedents), toNull(allergies), toNull(traitements), consentements === true, admissionDate,
      req.params.id
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Patient non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erreur PUT patient:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  DELETE /:id – Supprimer un patient (nécessite requireAdmin)
//  Seul un administrateur peut supprimer un patient
// ============================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  const patientId = req.params.id;

  try {
    // 1. Supprimer les relances, sorties, paiements
    await pool.query(`
      DELETE FROM relances WHERE facture_id IN (SELECT id FROM factures WHERE patient_id = $1)
    `, [patientId]).catch(() => {});

    await pool.query(`
      DELETE FROM sorties WHERE admission_id IN (SELECT id FROM admissions WHERE patient_id = $1)
    `, [patientId]).catch(() => {});

    await pool.query(`
      DELETE FROM paiements WHERE facture_id IN (SELECT id FROM factures WHERE patient_id = $1)
    `, [patientId]).catch(() => {});

    // 2. Supprimer les enregistrements dans les tables liées
    const tables = [
      'prescriptions',
      'admissions',
      'factures',
      'consultations',
      'soins',
      'examens',
      'interventions',
      'rendez_vous',
      'urgences',
      'sejours',
      'ordonnances',
      'signalements',
      'allergies',
      'lits',
      'mouvements_stock',
      'pharmacovigilance',
      'preparations',
      'preparations_executees',
      'registre_stupefiants',
      'dispositifs',
      'alertes_stock',
      'ruptures',
    ];

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table} WHERE patient_id = $1`, [patientId]);
      } catch (err) {
        console.warn(`⚠️ Ignoré : suppression dans ${table}`, err.message);
      }
    }

    // Enfin, supprimer le patient
    const result = await pool.query('DELETE FROM patients WHERE id = $1', [patientId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Erreur DELETE patient:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  GET /:id/visits – Historique des visites
// ============================================================
router.get('/:id/visits', async (req, res) => {
  const patientId = req.params.id;
  try {
    const query = `
      (SELECT a.date_admission AS date, 'Hospitalisation' AS type, a.motif AS motif, NULL AS medecin
       FROM admissions a WHERE a.patient_id = $1)
      UNION
      (SELECT i.date_prevue AS date, 'Intervention chirurgicale' AS type, NULL AS motif,
              m.nom || ' ' || m.prenom AS medecin
       FROM interventions i
       LEFT JOIN medecins m ON i.medecin_id = m.id
       WHERE i.patient_id = $1)
      UNION
      (SELECT u.heure_arrivee AS date, 'Urgence' AS type, u.motif, NULL AS medecin
       FROM urgences u WHERE u.patient_id = $1)
      ORDER BY date DESC
    `;
    const { rows } = await pool.query(query, [patientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;