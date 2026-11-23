// backend/src/routes/patients.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // pool patché
const { authenticate, requirePermission, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const toNull = (val) => (val === '' || val === undefined || val === null) ? null : val;

router.use(authenticate);

// ============================================================
//  Middleware local : vérifier que req.hospitalId existe
// ============================================================
function requireHospital(req, res, next) {
  if (!req.hospitalId) {
    return res.status(403).json({
      error: 'Contexte hôpital manquant',
      code: 'TENANT_MISSING',
    });
  }
  next();
}

// ============================================================
// ---------- GET / – Liste des patients du tenant ----------
// ============================================================
router.get('/', requireHospital, async (req, res) => {
  try {
    const { actif } = req.query;
    const params = [req.hospitalId];           // $1 = hospital_id
    let query = `
      SELECT 
        id, ipp, nom, prenom, telephone, email, adresse,
        date_naissance, date_admission,
        personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
        personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
        antecedents, allergies, traitements, consentements, genre,
        actif
      FROM patients
      WHERE hospital_id = $1
    `;
    if (actif !== undefined) {
      params.push(actif === 'true');           // $2
      query += ` AND actif = $2`;
    }
    query += ` ORDER BY nom`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET patients:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ---------- GET /:id – Détail d'un patient du tenant ----------
// ============================================================
router.get('/:id', requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, ipp, nom, prenom, telephone, email, adresse,
        date_naissance, date_admission,
        personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
        personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
        antecedents, allergies, traitements, consentements, genre,
        actif
      FROM patients
      WHERE id = $1 AND hospital_id = $2
    `, [req.params.id, req.hospitalId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Patient non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur GET patient/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ---------- POST / – Créer un patient ----------
// ============================================================
router.post('/', requireHospital, requirePermission('manage_patients'), async (req, res) => {
  const {
    nom, prenom, date_naissance, telephone, email, adresse, ipp,
    personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
    personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
    antecedents, allergies, traitements, consentements, date_admission,
    genre
  } = req.body;

  const admissionDate = date_admission || new Date().toISOString().split('T')[0];

  try {
    // ✅ Vérification email SCOPÉE au tenant (deux hôpitaux peuvent partager un email)
    if (email) {
      const existing = await pool.query(
        'SELECT id FROM patients WHERE email = $1 AND hospital_id = $2',
        [email, req.hospitalId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Un patient avec cet email existe déjà dans votre établissement.' });
      }
    }

    const { rows } = await pool.query(`
      INSERT INTO patients (
        hospital_id,
        nom, prenom, date_naissance, telephone, email, adresse, ipp,
        personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
        personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
        antecedents, allergies, traitements, consentements, date_admission,
        genre, password, actif
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,true)
      RETURNING *
    `, [
      req.hospitalId,
      nom, prenom, date_naissance, toNull(telephone), toNull(email), toNull(adresse), toNull(ipp),
      toNull(personne_a_prevenir_nom1), toNull(personne_a_prevenir_tel1), toNull(personne_a_prevenir_adresse1),
      toNull(personne_a_prevenir_nom2), toNull(personne_a_prevenir_tel2), toNull(personne_a_prevenir_adresse2),
      toNull(antecedents), toNull(allergies), toNull(traitements), consentements === true,
      admissionDate,
      genre || null,
      '',
    ]);
    const result = rows[0];

    // 🪵 Audit
    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      tableCible: 'patients',
      recordId: result.id,
      details: { nom: result.nom, prenom: result.prenom, ipp: result.ipp },
      ip: req.ip,
      hospitalId: req.hospitalId,
    });

    res.status(201).json({
      id: result.id,
      ipp: result.ipp,
      nom: result.nom,
      prenom: result.prenom,
      telephone: result.telephone,
      email: result.email,
      adresse: result.adresse,
      date_naissance: result.date_naissance,
      date_admission: result.date_admission,
      personne_a_prevenir_nom1: result.personne_a_prevenir_nom1,
      personne_a_prevenir_tel1: result.personne_a_prevenir_tel1,
      personne_a_prevenir_adresse1: result.personne_a_prevenir_adresse1,
      personne_a_prevenir_nom2: result.personne_a_prevenir_nom2,
      personne_a_prevenir_tel2: result.personne_a_prevenir_tel2,
      personne_a_prevenir_adresse2: result.personne_a_prevenir_adresse2,
      antecedents: result.antecedents,
      allergies: result.allergies,
      traitements: result.traitements,
      consentements: result.consentements,
      genre: result.genre,
      actif: result.actif
    });
  } catch (err) {
    console.error("❌ Erreur POST patient:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ---------- PUT /:id – Modifier un patient du tenant ----------
// ============================================================
router.put('/:id', requireHospital, requirePermission('manage_patients'), async (req, res) => {
  const {
    nom, prenom, date_naissance, telephone, email, adresse, ipp,
    personne_a_prevenir_nom1, personne_a_prevenir_tel1, personne_a_prevenir_adresse1,
    personne_a_prevenir_nom2, personne_a_prevenir_tel2, personne_a_prevenir_adresse2,
    antecedents, allergies, traitements, consentements, date_admission,
    genre
  } = req.body;

  try {
    // ✅ Lecture scopée au tenant
    const { rows: [oldPatient] } = await pool.query(
      'SELECT * FROM patients WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (!oldPatient) return res.status(404).json({ error: 'Patient non trouvé' });

    const result = await pool.query(`
      UPDATE patients SET
        nom = $1, prenom = $2, date_naissance = $3,
        telephone = $4, email = $5, adresse = $6, ipp = $7,
        personne_a_prevenir_nom1 = $8, personne_a_prevenir_tel1 = $9, personne_a_prevenir_adresse1 = $10,
        personne_a_prevenir_nom2 = $11, personne_a_prevenir_tel2 = $12, personne_a_prevenir_adresse2 = $13,
        antecedents = $14, allergies = $15, traitements = $16,
        consentements = $17, date_admission = $18, genre = $19
      WHERE id = $20 AND hospital_id = $21
    `, [
      nom, prenom, date_naissance, toNull(telephone), toNull(email), toNull(adresse), toNull(ipp),
      toNull(personne_a_prevenir_nom1), toNull(personne_a_prevenir_tel1), toNull(personne_a_prevenir_adresse1),
      toNull(personne_a_prevenir_nom2), toNull(personne_a_prevenir_tel2), toNull(personne_a_prevenir_adresse2),
      toNull(antecedents), toNull(allergies), toNull(traitements), consentements === true,
      date_admission || null,
      genre || null,
      req.params.id,
      req.hospitalId,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Patient non trouvé' });

    const { rows: [newPatient] } = await pool.query(
      'SELECT * FROM patients WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    await logAudit({
      userId: req.user.id,
      action: 'UPDATE',
      tableCible: 'patients',
      recordId: parseInt(req.params.id, 10),
      details: { old: oldPatient, new: newPatient },
      ip: req.ip,
      hospitalId: req.hospitalId,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erreur PUT patient:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ---------- PUT /:id/toggle-actif ----------
// ============================================================
router.put('/:id/toggle-actif', requireHospital, requirePermission('manage_patients'), async (req, res) => {
  const patientId = req.params.id;
  const { actif } = req.body;
  try {
    const result = await pool.query(`
      UPDATE patients SET actif = $1
      WHERE id = $2 AND hospital_id = $3
      RETURNING id, actif
    `, [actif, patientId, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Patient non trouvé' });

    await logAudit({
      userId: req.user.id,
      action: actif ? 'ACTIVATE' : 'DEACTIVATE',
      tableCible: 'patients',
      recordId: result.rows[0].id,
      details: { actif },
      ip: req.ip,
      hospitalId: req.hospitalId,
    });

    res.json({ id: result.rows[0].id, actif: result.rows[0].actif });
  } catch (err) {
    console.error('❌ Erreur toggle-actif:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ---------- DELETE /:id ----------
// ⚠️ Vérification d'appartenance AVANT toute suppression cascade
// ============================================================
router.delete('/:id', requireHospital, requireAdmin, async (req, res) => {
  const patientId = req.params.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.hospital_id', $1, true)`, [String(req.hospitalId)]);

    // ✅ ÉTAPE CRITIQUE : vérifier que le patient appartient au tenant
    const patient = await client.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patientId, req.hospitalId]
    );
    if (patient.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    // Suppressions en cascade (toutes scopées par patient_id, déjà validé)
    await client.query(`
      DELETE FROM paiements
      WHERE facture_id IN (SELECT id FROM factures WHERE patient_id = $1)
    `, [patientId]);
    await client.query('DELETE FROM factures WHERE patient_id = $1', [patientId]);

    const tables = [
      'urgences', 'rendez_vous', 'admissions', 'soins', 'interventions',
      'ordonnances', 'prescriptions', 'sejours', 'sorties', 'examens',
      'groupes_examens', 'consultations'
    ];

    for (const table of tables) {
      const check = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'patient_id'
        )
      `, [table]);
      if (check.rows[0].exists) {
        await client.query(`DELETE FROM ${table} WHERE patient_id = $1`, [patientId]);
      }
    }

    // ✅ Delete scopée au tenant (double sécurité)
    await client.query(
      'DELETE FROM patients WHERE id = $1 AND hospital_id = $2',
      [patientId, req.hospitalId]
    );

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      action: 'DELETE',
      tableCible: 'patients',
      recordId: parseInt(patientId, 10),
      details: { deleted_patient_id: patientId },
      ip: req.ip,
      hospitalId: req.hospitalId,
    });

    res.sendStatus(204);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Erreur DELETE patient:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// ---------- GET /:id/visits ----------
// ⚠️ Vérification d'appartenance AVANT la lecture des visites
// ============================================================
router.get('/:id/visits', requireHospital, async (req, res) => {
  const patientId = req.params.id;
  try {
    // ✅ Vérifier d'abord que le patient appartient au tenant
    const patient = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patientId, req.hospitalId]
    );
    if (patient.rowCount === 0) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { rows } = await pool.query(`
      (SELECT a.date_admission AS date, 'Hospitalisation' AS type, a.motif AS motif, NULL AS medecin
       FROM admissions a WHERE a.patient_id = $1)
      UNION
      (SELECT i.date_prevue AS date, 'Intervention chirurgicale' AS type, NULL AS motif,
              m.nom || ' ' || m.prenom AS medecin
       FROM interventions i LEFT JOIN medecins m ON i.medecin_id = m.id
       WHERE i.patient_id = $1)
      UNION
      (SELECT u.heure_arrivee AS date, 'Urgence' AS type, u.motif, NULL AS medecin
       FROM urgences u WHERE u.patient_id = $1)
      ORDER BY date DESC
    `, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /:id/visits:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;