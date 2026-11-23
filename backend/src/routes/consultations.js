// src/routes/consultations.js
// ============================================================
// 🩺 CONSULTATIONS – RDV, urgences, admissions, lits, médecins, etc.
// ------------------------------------------------------------
// ⚠️ Le pool patché pose `app.hospital_id` via ALS, MAIS le RLS
//    a été mis en NO FORCE + policy tenant_isolation supprimée.
//    On filtre donc explicitement TOUTES les routes sur
//    `req.hospitalId` (JWT) pour garantir l'isolation tenant.
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireRole, requireAdmin } = require('../middleware/auth');

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

// ------------------------------------------------------------------
// CRÉATION AUTO DES TABLES (ajout hospital_id pour nouvelles installs)
// ------------------------------------------------------------------
const ensureAdmissionTables = async () => {
  try {
    const checkBat = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batiments')
    `);
    if (!checkBat.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.batiments (id SERIAL PRIMARY KEY, hospital_id UUID, nom VARCHAR(100) NOT NULL)`);
    }
    const checkEtages = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'etages')
    `);
    if (!checkEtages.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.etages (id SERIAL PRIMARY KEY, hospital_id UUID, batiment_id INTEGER REFERENCES batiments(id), numero INTEGER)`);
    }
    const checkChambres = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chambres')
    `);
    if (!checkChambres.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.chambres (id SERIAL PRIMARY KEY, hospital_id UUID, nom VARCHAR(100), batiment_id INTEGER REFERENCES batiments(id), etage_id INTEGER REFERENCES etages(id), type VARCHAR(50), capacite INTEGER)`);
    }
    const checkLits = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lits')
    `);
    if (!checkLits.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.lits (id SERIAL PRIMARY KEY, hospital_id UUID, numero VARCHAR(20) NOT NULL, chambre_id INTEGER REFERENCES chambres(id), service_id INTEGER REFERENCES services(id), statut VARCHAR(20) DEFAULT 'libre')`);
    }
    const checkAdmissions = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admissions')
    `);
    if (!checkAdmissions.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.admissions (id SERIAL PRIMARY KEY, hospital_id UUID, patient_id INTEGER NOT NULL REFERENCES patients(id), lit_id INTEGER REFERENCES lits(id), date_admission TIMESTAMP DEFAULT NOW(), motif TEXT, service_id INTEGER REFERENCES services(id), medecin_referent_id INTEGER REFERENCES medecins(id), type VARCHAR(50) DEFAULT 'admission', source_service_id INTEGER)`);
    }
    const checkSejours = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sejours')
    `);
    if (!checkSejours.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.sejours (id SERIAL PRIMARY KEY, hospital_id UUID, patient_id INTEGER NOT NULL REFERENCES patients(id), admission_id INTEGER REFERENCES admissions(id), lit_id INTEGER REFERENCES lits(id), date_debut TIMESTAMP DEFAULT NOW(), date_fin TIMESTAMP, statut VARCHAR(20) DEFAULT 'en_cours')`);
    }
    const checkSorties = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sorties')
    `);
    if (!checkSorties.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.sorties (id SERIAL PRIMARY KEY, hospital_id UUID, admission_id INTEGER REFERENCES admissions(id), date_sortie TIMESTAMP DEFAULT NOW(), mode_sortie VARCHAR(50), remarques TEXT)`);
    }
  } catch (err) {
    console.error('❌ Erreur init tables admission :', err.message);
  }
};

const ensureColumns = async () => {
  try {
    const checkLitId = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'lit_id')
    `);
    if (!checkLitId.rows[0].exists) {
      await pool.query('ALTER TABLE patients ADD COLUMN lit_id INTEGER');
    }
    const checkStatut = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'statut')
    `);
    if (!checkStatut.rows[0].exists) {
      await pool.query("ALTER TABLE patients ADD COLUMN statut VARCHAR(20) DEFAULT 'actif'");
    }
    const checkServiceId = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lits' AND column_name = 'service_id')
    `);
    if (!checkServiceId.rows[0].exists) {
      await pool.query('ALTER TABLE lits ADD COLUMN service_id INTEGER');
    }
    const checkType = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admissions' AND column_name = 'type')
    `);
    if (!checkType.rows[0].exists) {
      await pool.query("ALTER TABLE admissions ADD COLUMN type VARCHAR(50) DEFAULT 'admission'");
    }
  } catch (err) {
    console.error('❌ Erreur vérif colonnes :', err.message);
  }
};

const initializeRendezVous = async () => {
  try {
    const checkRdv = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rendez_vous')
    `);
    if (!checkRdv.rows[0].exists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.rendez_vous (
          id SERIAL PRIMARY KEY,
          hospital_id UUID,
          patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          medecin_id INTEGER REFERENCES medecins(id),
          service_id INTEGER REFERENCES services(id),
          date_rdv TIMESTAMP NOT NULL,
          motif TEXT,
          statut VARCHAR(20) DEFAULT 'planifie',
          rappel_envoye BOOLEAN DEFAULT FALSE,
          email_envoye BOOLEAN DEFAULT FALSE,
          sms_envoye BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          type_consultation VARCHAR(50) DEFAULT 'générale',
          categorie VARCHAR(50) DEFAULT 'ambulatoire',
          prix NUMERIC(10,2) DEFAULT 50.00
        )
      `);
    }
    const checkUrg = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'urgences')
    `);
    if (!checkUrg.rows[0].exists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.urgences (
          id SERIAL PRIMARY KEY,
          hospital_id UUID,
          patient_id INTEGER REFERENCES patients(id),
          niveau VARCHAR(50),
          priorite INTEGER,
          motif TEXT,
          heure_arrivee TIMESTAMP DEFAULT NOW(),
          statut VARCHAR(50) DEFAULT 'en_attente',
          triage_effectue_par INTEGER
        )
      `);
    }
  } catch (err) {
    console.error('❌ Erreur init rendez-vous :', err);
  }
};

(async () => {
  await ensureAdmissionTables();
  await ensureColumns();
  await initializeRendezVous();
})();

// ============================================================
// ROUTES
// ============================================================

// ---------- RENDEZ-VOUS ----------
router.get('/rendezvous', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT rv.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom, 
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             s.nom AS service_nom,
             rv.type_consultation, rv.categorie, rv.prix
      FROM "public"."rendez_vous" rv
      JOIN "public"."patients" p ON rv.patient_id = p.id
      LEFT JOIN "public"."medecins" m ON rv.medecin_id = m.id
      LEFT JOIN "public"."services" s ON rv.service_id = s.id
      WHERE rv.hospital_id = $1
      ORDER BY rv.date_rdv DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /rendezvous :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/rendezvous', authenticate, requireHospital, async (req, res) => {
  const { patient_id, medecin_id, service_id, date_rdv, motif, type_consultation, categorie, prix } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO "public"."rendez_vous" (hospital_id, patient_id, medecin_id, service_id, date_rdv, motif, type_consultation, categorie, prix)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [req.hospitalId, patient_id, medecin_id, service_id, date_rdv, motif, type_consultation || 'générale', categorie || 'ambulatoire', prix || 50.00]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /rendezvous :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/rendezvous/:id', authenticate, requireHospital, async (req, res) => {
  const { statut, rappel_envoye, email_envoye, sms_envoye } = req.body;
  try {
    const result = await pool.query(`
      UPDATE "public"."rendez_vous"
      SET statut=$1, rappel_envoye=$2, email_envoye=$3, sms_envoye=$4
      WHERE id=$5 AND hospital_id=$6
    `, [statut, rappel_envoye, email_envoye, sms_envoye, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /rendezvous/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/rendezvous/patient/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT rv.id, rv.date_rdv, rv.motif, rv.medecin_id, rv.service_id,
             p.nom AS patient_nom, p.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             rv.type_consultation, rv.categorie, rv.prix,
             rv.statut
      FROM "public"."rendez_vous" rv
      JOIN "public"."patients" p ON rv.patient_id = p.id
      LEFT JOIN "public"."medecins" m ON rv.medecin_id = m.id
      WHERE rv.patient_id = $1
        AND rv.hospital_id = $2
        AND rv.statut != 'annule'
      ORDER BY rv.date_rdv DESC
    `, [req.params.patientId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /rendezvous/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- URGENCES ----------
router.get('/urgences', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*,
        (SELECT nom FROM patients WHERE id = u.patient_id) AS patient_nom,
        (SELECT prenom FROM patients WHERE id = u.patient_id) AS patient_prenom
      FROM "public"."urgences" u
      WHERE u.hospital_id = $1
      ORDER BY u.priorite ASC, u.heure_arrivee DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /urgences :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/urgences', authenticate, requireHospital, async (req, res) => {
  const { patient_id, niveau, priorite, motif } = req.body;

  const patientIdNum = Number(patient_id);
  if (!patientIdNum || isNaN(patientIdNum)) {
    return res.status(400).json({ error: 'patient_id doit être un nombre valide' });
  }

  try {
    const patientExists = await pool.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patientIdNum, req.hospitalId]
    );
    if (patientExists.rows.length === 0) {
      return res.status(400).json({
        error: `Le patient avec l'ID ${patientIdNum} n'existe pas dans votre établissement.`
      });
    }

    const { rows } = await pool.query(`
      INSERT INTO "public"."urgences" (hospital_id, patient_id, niveau, priorite, motif, heure_arrivee, statut)
      VALUES ($1, $2, $3, $4, $5, NOW(), 'en_attente') RETURNING *
    `, [req.hospitalId, patientIdNum, niveau, priorite, motif]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /urgences :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/urgences/:id', authenticate, requireHospital, async (req, res) => {
  const { statut, triage_effectue_par } = req.body;
  try {
    const result = await pool.query(`
      UPDATE "public"."urgences"
      SET statut=$1, triage_effectue_par=$2
      WHERE id=$3 AND hospital_id=$4
    `, [statut, triage_effectue_par, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Urgence non trouvée' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /urgences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LITS DISPONIBLES ----------
router.get('/lits/disponibles', authenticate, requireHospital, async (req, res) => {
  const { service_id } = req.query;
  try {
    let query = `
      SELECT l.*, s.nom AS service_nom, c.nom AS chambre_nom, c.type AS chambre_type
      FROM "public"."lits" l
      LEFT JOIN "public"."services" s ON l.service_id = s.id
      LEFT JOIN "public"."chambres" c ON l.chambre_id = c.id
      WHERE l.hospital_id = $1 AND l.statut = 'libre'
    `;
    const params = [req.hospitalId];
    if (service_id) {
      query += ` AND l.service_id = $2`;
      params.push(service_id);
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /lits/disponibles :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADMISSIONS (POST) ----------
router.post('/admissions', authenticate, requireHospital, async (req, res) => {
  const { patient_id, lit_id, service_id, motif, medecin_referent_id } = req.body;
  if (!patient_id || !lit_id || !service_id || !motif) {
    return res.status(400).json({ error: 'patient_id, lit_id, service_id et motif sont requis' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    // ✅ Vérifier patient + lit appartiennent au tenant
    const patCheck = await client.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patient_id, req.hospitalId]
    );
    if (patCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé dans cet établissement' });
    }
    const litCheck = await client.query(
      'SELECT id FROM lits WHERE id = $1 AND hospital_id = $2',
      [lit_id, req.hospitalId]
    );
    if (litCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lit non trouvé dans cet établissement' });
    }

    const { rows } = await client.query(`
      INSERT INTO "public"."admissions" (hospital_id, patient_id, lit_id, date_admission, motif, service_id, medecin_referent_id, type)
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, 'admission') RETURNING *
    `, [req.hospitalId, patient_id, lit_id, motif, service_id, medecin_referent_id || null]);

    await client.query(`UPDATE "public"."lits" SET statut = 'occupe' WHERE id = $1 AND hospital_id = $2`, [lit_id, req.hospitalId]);
    await client.query(`UPDATE "public"."patients" SET lit_id = $1, statut = 'hospitalise' WHERE id = $2 AND hospital_id = $3`, [lit_id, patient_id, req.hospitalId]);

    await client.query(`
      INSERT INTO "public"."sejours" (hospital_id, patient_id, admission_id, lit_id, date_debut, statut)
      VALUES ($1, $2, $3, $4, NOW(), 'en_cours')
    `, [req.hospitalId, patient_id, rows[0].id, lit_id]);

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ POST /admissions :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- LISTE COMPLÈTE DES ADMISSIONS ----------
router.get('/admissions', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom, p.ipp,
             s.nom AS service_nom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM "public"."admissions" a
      JOIN "public"."patients" p ON a.patient_id = p.id
      LEFT JOIN "public"."services" s ON a.service_id = s.id
      LEFT JOIN "public"."medecins" m ON a.medecin_referent_id = m.id
      WHERE a.hospital_id = $1
      ORDER BY a.date_admission DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admissions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LISTE DES PATIENTS HOSPITALISÉS ----------
router.get('/patients/hospitalises', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nom, p.prenom, p.ipp, l.id AS lit_id, l.numero AS lit_numero, c.nom AS chambre_nom
      FROM "public"."patients" p
      JOIN "public"."lits" l ON p.lit_id = l.id
      LEFT JOIN "public"."chambres" c ON l.chambre_id = c.id
      WHERE p.hospital_id = $1 AND p.statut = 'hospitalise'
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /patients/hospitalises :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADMISSIONS EN COURS ----------
router.get('/admissions/en_cours', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.date_admission, s.nom AS service_nom
      FROM "public"."admissions" a
      JOIN "public"."services" s ON a.service_id = s.id
      WHERE a.hospital_id = $1 AND a.type != 'sortie'
      ORDER BY a.date_admission DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admissions/en_cours :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADMISSIONS D'UN PATIENT ----------
router.get('/admissions/patient/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.date_admission, s.nom AS service_nom
      FROM "public"."admissions" a
      JOIN "public"."services" s ON a.service_id = s.id
      WHERE a.patient_id = $1 AND a.hospital_id = $2
      ORDER BY a.date_admission DESC
    `, [req.params.patientId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admissions/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CONSULTATIONS D'UN PATIENT ----------
router.get('/patient/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { rows } = await pool.query(`
      SELECT c.*, 
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM "public"."consultations" c
      LEFT JOIN "public"."medecins" m ON c.medecin_id = m.id
      WHERE c.patient_id = $1 AND c.hospital_id = $2
      ORDER BY c.date DESC
    `, [patientId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- PRESCRIPTIONS D'UN PATIENT ----------
router.get('/prescriptions/patient/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, 
             u.nom AS medecin_nom, u.prenom AS medecin_prenom,
             COALESCE(
               (SELECT json_agg(row_to_json(pi)) FROM "public"."prescription_items" pi WHERE pi.prescription_id = p.id),
               '[]'::json
             ) AS items
      FROM "public"."prescriptions" p
      LEFT JOIN "public"."utilisateurs" u ON p.doctor_id = u.id
      WHERE p.patient_id = $1 AND p.hospital_id = $2
      ORDER BY p.date_creation DESC
    `, [req.params.patientId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /prescriptions/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ORDONNANCES D'UN PATIENT ----------
router.get('/ordonnances/patient/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, 
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM "public"."ordonnances" o
      LEFT JOIN "public"."medecins" m ON o.medecin_id = m.id
      WHERE o.patient_id = $1 AND o.hospital_id = $2
      ORDER BY o.created_at DESC
    `, [req.params.patientId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /ordonnances/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- TRANSFERT ----------
router.post('/transferts', authenticate, requireHospital, async (req, res) => {
  const { patient_id, nouveau_lit_id, nouveau_service_id, motif } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const patientRes = await client.query(
      'SELECT lit_id FROM "public"."patients" WHERE id = $1 AND hospital_id = $2',
      [patient_id, req.hospitalId]
    );
    if (patientRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé' });
    }
    const ancienLitId = patientRes.rows[0]?.lit_id;
    if (!ancienLitId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Patient non hospitalisé' });
    }

    // ✅ Vérifier le nouveau lit appartient au tenant
    const newLitRes = await client.query(
      'SELECT id FROM "public"."lits" WHERE id = $1 AND hospital_id = $2',
      [nouveau_lit_id, req.hospitalId]
    );
    if (newLitRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nouveau lit non trouvé dans cet établissement' });
    }

    const ancienServiceRes = await client.query('SELECT service_id FROM "public"."lits" WHERE id = $1 AND hospital_id = $2', [ancienLitId, req.hospitalId]);
    const ancienServiceId = ancienServiceRes.rows[0]?.service_id;

    const newAdmission = await client.query(`
      INSERT INTO "public"."admissions" (hospital_id, patient_id, lit_id, date_admission, motif, service_id, type, source_service_id)
      VALUES ($1, $2, $3, NOW(), $4, $5, 'transfert', $6) RETURNING id
    `, [req.hospitalId, patient_id, nouveau_lit_id, motif, nouveau_service_id, ancienServiceId]);

    await client.query('UPDATE "public"."lits" SET statut = $1 WHERE id = $2 AND hospital_id = $3', ['libre', ancienLitId, req.hospitalId]);
    await client.query('UPDATE "public"."lits" SET statut = $1 WHERE id = $2 AND hospital_id = $3', ['occupe', nouveau_lit_id, req.hospitalId]);
    await client.query('UPDATE "public"."patients" SET lit_id = $1 WHERE id = $2 AND hospital_id = $3', [nouveau_lit_id, patient_id, req.hospitalId]);
    await client.query(`UPDATE "public"."sejours" SET date_fin = NOW(), statut = 'termine' WHERE patient_id = $1 AND hospital_id = $2 AND statut = 'en_cours'`, [patient_id, req.hospitalId]);

    await client.query(`
      INSERT INTO "public"."sejours" (hospital_id, patient_id, admission_id, lit_id, date_debut, statut)
      VALUES ($1, $2, $3, $4, NOW(), 'en_cours')
    `, [req.hospitalId, patient_id, newAdmission.rows[0].id, nouveau_lit_id]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Transfert effectué' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ POST /transferts :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- SORTIE ----------
router.post('/sorties', authenticate, requireHospital, async (req, res) => {
  const { patient_id, admission_id, mode_sortie, remarques } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const litRes = await client.query(
      'SELECT lit_id FROM "public"."patients" WHERE id = $1 AND hospital_id = $2',
      [patient_id, req.hospitalId]
    );
    if (litRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé' });
    }
    const litId = litRes.rows[0]?.lit_id;
    if (litId) {
      await client.query('UPDATE "public"."lits" SET statut = $1 WHERE id = $2 AND hospital_id = $3', ['libre', litId, req.hospitalId]);
    }
    await client.query('UPDATE "public"."patients" SET date_sortie = NOW(), statut = $1, lit_id = NULL WHERE id = $2 AND hospital_id = $3', ['sorti', patient_id, req.hospitalId]);
    await client.query(`UPDATE "public"."sejours" SET date_fin = NOW(), statut = 'termine' WHERE patient_id = $1 AND hospital_id = $2 AND statut = 'en_cours'`, [patient_id, req.hospitalId]);

    await client.query(`
      INSERT INTO "public"."sorties" (hospital_id, admission_id, date_sortie, mode_sortie, remarques)
      VALUES ($1, $2, NOW(), $3, $4)
    `, [req.hospitalId, admission_id, mode_sortie, remarques]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Sortie enregistrée' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ POST /sorties :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- LISTE COMPLÈTE DES SORTIES (HISTORIQUE) ----------
router.get('/sorties', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.id, s.admission_id, s.date_sortie, s.mode_sortie, s.remarques,
        p.nom || ' ' || p.prenom AS patient_nom,
        a.patient_id
      FROM "public"."sorties" s
      LEFT JOIN "public"."admissions" a ON s.admission_id = a.id
      LEFT JOIN "public"."patients" p ON a.patient_id = p.id
      WHERE s.hospital_id = $1
      ORDER BY s.date_sortie DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /sorties :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- SERVICES & MÉDECINS (anciennement "public", désormais authentifiés) ----------
router.get('/services', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom FROM "public"."services" WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /services :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/medecins', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, prenom FROM "public"."medecins" WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /medecins :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD SERVICES ----------
router.get('/services/all', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom FROM "public"."services" WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /services/all :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/services', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO "public"."services" (hospital_id, nom) VALUES ($1, $2) RETURNING *',
      [req.hospitalId, nom]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /services :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/services/:id', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "public"."services" SET nom = $1 WHERE id = $2 AND hospital_id = $3',
      [nom, req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/services/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const svc = await pool.query(
      'SELECT id FROM "public"."services" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (svc.rowCount === 0) return res.status(404).json({ error: 'Service non trouvé' });

    const lits = await pool.query(
      'SELECT id FROM "public"."lits" WHERE service_id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (lits.rowCount > 0) return res.status(400).json({ error: 'Ce service est utilisé par des lits' });

    await pool.query('DELETE FROM "public"."services" WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD MÉDECINS ----------
router.get('/medecins/all', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, prenom, specialite, email FROM "public"."medecins" WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /medecins/all :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/medecins/by-user/:userId', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, prenom, specialite, email FROM medecins WHERE user_id = $1 AND hospital_id = $2',
      [req.params.userId, req.hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Médecin non trouvé' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /medecins/by-user/:userId :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/medecins', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email } = req.body;
  if (!nom || !prenom) return res.status(400).json({ error: 'Nom et prénom requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO "public"."medecins" (hospital_id, nom, prenom, specialite, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.hospitalId, nom, prenom, specialite, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /medecins :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/medecins/:id', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "public"."medecins" SET nom=$1, prenom=$2, specialite=$3, email=$4 WHERE id=$5 AND hospital_id=$6',
      [nom, prenom, specialite, email, req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médecin non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /medecins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/medecins/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const med = await pool.query(
      'SELECT id FROM "public"."medecins" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (med.rowCount === 0) return res.status(404).json({ error: 'Médecin non trouvé' });

    const adm = await pool.query(
      'SELECT id FROM "public"."admissions" WHERE medecin_referent_id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (adm.rowCount > 0) return res.status(400).json({ error: 'Ce médecin est référent dans des admissions' });

    await pool.query('DELETE FROM "public"."medecins" WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /medecins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD BÂTIMENTS ----------
router.get('/batiments', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "public"."batiments" WHERE hospital_id = $1 ORDER BY nom',
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /batiments :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/batiments', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO "public"."batiments" (hospital_id, nom) VALUES ($1, $2) RETURNING *',
      [req.hospitalId, nom]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /batiments :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batiments/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM "public"."batiments" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Bâtiment non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /batiments/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD ÉTAGES ----------
router.get('/etages', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, b.nom AS batiment_nom 
      FROM "public"."etages" e 
      LEFT JOIN "public"."batiments" b ON e.batiment_id = b.id 
      WHERE e.hospital_id = $1
      ORDER BY b.nom, e.numero
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /etages :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/etages', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { batiment_id, numero } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO "public"."etages" (hospital_id, batiment_id, numero) VALUES ($1, $2, $3) RETURNING *',
      [req.hospitalId, batiment_id, numero]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /etages :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/etages/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM "public"."etages" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Étage non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /etages/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD CHAMBRES ----------
router.get('/chambres/list', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, b.nom AS batiment_nom, e.numero AS etage_numero
      FROM "public"."chambres" c
      LEFT JOIN "public"."batiments" b ON c.batiment_id = b.id
      LEFT JOIN "public"."etages" e ON c.etage_id = e.id
      WHERE c.hospital_id = $1
      ORDER BY b.nom, e.numero, c.nom
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /chambres/list :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/chambres', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { nom, batiment_id, etage_id, type, capacite } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO "public"."chambres" (hospital_id, nom, batiment_id, etage_id, type, capacite)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.hospitalId, nom, batiment_id, etage_id, type, capacite]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /chambres :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chambres/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const ch = await pool.query(
      'SELECT id FROM "public"."chambres" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (ch.rowCount === 0) return res.status(404).json({ error: 'Chambre non trouvée' });

    const lits = await pool.query(
      'SELECT id FROM "public"."lits" WHERE chambre_id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (lits.rowCount > 0) {
      return res.status(400).json({ error: 'Cette chambre contient des lits. Supprimez d’abord les lits.' });
    }
    await pool.query('DELETE FROM "public"."chambres" WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /chambres/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD LITS ----------
router.get('/lits/all', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, c.nom AS chambre_nom 
      FROM "public"."lits" l 
      LEFT JOIN "public"."chambres" c ON l.chambre_id = c.id 
      WHERE l.hospital_id = $1
      ORDER BY c.nom, l.numero
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /lits/all :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/lits', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { chambre_id, numero, statut } = req.body;
  if (!chambre_id || !numero) {
    return res.status(400).json({ error: 'chambre_id et numero sont requis' });
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO "public"."lits" (hospital_id, chambre_id, numero, statut)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.hospitalId, chambre_id, numero, statut || 'libre']);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /lits :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lits/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const lit = await pool.query(
      'SELECT id FROM "public"."lits" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (lit.rowCount === 0) return res.status(404).json({ error: 'Lit non trouvé' });

    const patient = await pool.query(
      'SELECT id FROM "public"."patients" WHERE lit_id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (patient.rowCount > 0) {
      return res.status(400).json({ error: 'Ce lit est actuellement occupé par un patient.' });
    }
    await pool.query('DELETE FROM "public"."lits" WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /lits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/lits/:id', authenticate, requireHospital, requireRole(['admin']), async (req, res) => {
  const { statut } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "public"."lits" SET statut=$1 WHERE id=$2 AND hospital_id=$3',
      [statut, req.params.id, req.hospitalId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Lit non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /lits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- INTERVENTIONS ----------
router.get('/interventions', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, p.nom AS patient_nom, p.prenom AS patient_prenom,
             m.nom AS medecin_nom
      FROM "public"."interventions" i
      LEFT JOIN "public"."patients" p ON i.patient_id = p.id
      LEFT JOIN "public"."medecins" m ON i.medecin_id = m.id
      WHERE i.hospital_id = $1
      ORDER BY i.date_prevue DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.warn('⚠️ Table interventions absente ou requête erronée:', err.message);
    res.json([]);
  }
});

// ---------- ORDONNANCES (POST) ----------
router.post('/ordonnances', authenticate, requireHospital, requireRole(['medecin', 'admin']), async (req, res) => {
  const { patient_id, medecin_id, lignes, observations } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    let finalMedecinId = medecin_id;
    if (!finalMedecinId) {
      const medecinRes = await client.query(
        'SELECT id FROM medecins WHERE user_id = $1 AND hospital_id = $2',
        [req.user.id, req.hospitalId]
      );
      if (medecinRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Aucun médecin sélectionné et profil médecin introuvable pour cet utilisateur.' 
        });
      }
      finalMedecinId = medecinRes.rows[0].id;
    }

    const numero = `ORD-${Date.now()}`;
    const ordonnance = await client.query(`
      INSERT INTO "public"."ordonnances" (hospital_id, patient_id, medecin_id, numero_ordonnance, observations, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.hospitalId, patient_id, finalMedecinId, numero, observations, req.user.id]);

    const ordonnanceId = ordonnance.rows[0].id;

    for (const ligne of lignes) {
      await client.query(`
        INSERT INTO "public"."ligne_ordonnances" (hospital_id, ordonnance_id, medicament_id, quantite_prescrit, posologie)
        VALUES ($1, $2, $3, $4, $5)
      `, [req.hospitalId, ordonnanceId, ligne.medicament_id, ligne.quantite_prescrit, ligne.posologie]);
    }

    await client.query('COMMIT');
    res.status(201).json(ordonnance.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ POST /ordonnances :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- ADMISSIONS : GET/PUT/DELETE par ID ----------
router.get('/admissions/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom, p.ipp,
             s.nom AS service_nom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             l.numero AS lit_numero
      FROM "public"."admissions" a
      JOIN "public"."patients" p ON a.patient_id = p.id
      LEFT JOIN "public"."services" s ON a.service_id = s.id
      LEFT JOIN "public"."medecins" m ON a.medecin_referent_id = m.id
      LEFT JOIN "public"."lits" l ON a.lit_id = l.id
      WHERE a.id = $1 AND a.hospital_id = $2
    `, [req.params.id, req.hospitalId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/admissions/:id', authenticate, requireHospital, async (req, res) => {
  const { service_id, medecin_referent_id, lit_id, motif, date_admission } = req.body;
  try {
    const result = await pool.query(`
      UPDATE "public"."admissions" SET
        service_id = COALESCE($1, service_id),
        medecin_referent_id = COALESCE($2, medecin_referent_id),
        lit_id = COALESCE($3, lit_id),
        motif = COALESCE($4, motif),
        date_admission = COALESCE($5, date_admission)
      WHERE id = $6 AND hospital_id = $7
    `, [service_id, medecin_referent_id, lit_id, motif, date_admission, req.params.id, req.hospitalId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admissions/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const adm = await pool.query(
      'SELECT id FROM "public"."admissions" WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (adm.rowCount === 0) return res.status(404).json({ error: 'Admission non trouvée' });

    const sejour = await pool.query(
      'SELECT id FROM "public"."sejours" WHERE admission_id = $1 AND hospital_id = $2 AND statut = $3',
      [req.params.id, req.hospitalId, 'en_cours']
    );
    if (sejour.rowCount > 0) {
      return res.status(400).json({ error: 'Cette admission est associée à un séjour en cours. Impossible de la supprimer.' });
    }
    await pool.query('DELETE FROM "public"."admissions" WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- HISTORIQUE DES TRANSFERTS ----------
router.get('/transferts', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id AS admission_id,
        a.date_admission AS date_transfert,
        a.motif,
        a.service_id AS nouveau_service_id,
        a.source_service_id AS ancien_service_id,
        a.lit_id AS nouveau_lit_id,
        (SELECT lit_id FROM admissions WHERE patient_id = a.patient_id AND hospital_id = $1 AND date_admission < a.date_admission ORDER BY date_admission DESC LIMIT 1) AS ancien_lit_id,
        p.id AS patient_id,
        p.nom || ' ' || p.prenom AS patient_nom,
        s1.nom AS ancien_service_nom,
        s2.nom AS nouveau_service_nom,
        l1.numero AS ancien_lit_numero,
        l2.numero AS nouveau_lit_numero
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN services s1 ON a.source_service_id = s1.id
      LEFT JOIN services s2 ON a.service_id = s2.id
      LEFT JOIN lits l1 ON (SELECT lit_id FROM admissions WHERE patient_id = a.patient_id AND hospital_id = $1 AND date_admission < a.date_admission ORDER BY date_admission DESC LIMIT 1) = l1.id
      LEFT JOIN lits l2 ON a.lit_id = l2.id
      WHERE a.hospital_id = $1 AND a.type = 'transfert'
      ORDER BY a.date_admission DESC
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /transferts :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ROUTE DE DÉBOGAGE ----------
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route consultations/test fonctionne !', user: req.user, hospitalId: req.hospitalId });
});

// ---------- COMPTER LES CONSULTATIONS D'UN PATIENT ----------
router.get('/count/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS total FROM consultations WHERE patient_id = $1 AND hospital_id = $2',
      [req.params.patientId, req.hospitalId]
    );
    res.json(parseInt(rows[0]?.total || 0));
  } catch (err) {
    console.error('❌ GET /count/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CONSULTATIONS (POST - Créer ou mettre à jour) ----------
router.post('/', authenticate, requireHospital, requireRole(['medecin', 'admin']), async (req, res) => {
  const {
    patient_id, medecin_id, numero_dossier, plainte_principale, historique,
    antecedents, complement_anamnese, examen_physique, ccl, bilan, cat, medecin_consultant
  } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id est requis' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM consultations WHERE patient_id = $1 AND hospital_id = $2 ORDER BY date DESC LIMIT 1',
      [patient_id, req.hospitalId]
    );

    let result;
    if (existing.rows.length > 0) {
      const { rows } = await pool.query(`
        UPDATE consultations SET
          medecin_id = COALESCE($1, medecin_id),
          numero_dossier = COALESCE($2, numero_dossier),
          plainte_principale = COALESCE($3, plainte_principale),
          historique = COALESCE($4, historique),
          antecedents = COALESCE($5, antecedents),
          complement_anamnese = COALESCE($6, complement_anamnese),
          examen_physique = COALESCE($7, examen_physique),
          ccl = COALESCE($8, ccl),
          bilan = COALESCE($9, bilan),
          cat = COALESCE($10, cat),
          medecin_consultant = COALESCE($11, medecin_consultant),
          updated_at = NOW()
        WHERE id = $12 AND hospital_id = $13
        RETURNING *
      `, [
        medecin_id || null, numero_dossier || null, plainte_principale || null,
        historique || null, antecedents || null, complement_anamnese || null,
        examen_physique || null, ccl || null, bilan || null, cat || null,
        medecin_consultant || null, existing.rows[0].id, req.hospitalId
      ]);
      result = rows[0];
    } else {
      const { rows } = await pool.query(`
        INSERT INTO consultations (
          hospital_id, patient_id, medecin_id, numero_dossier,
          plainte_principale, historique, antecedents, complement_anamnese,
          examen_physique, ccl, bilan, cat, medecin_consultant
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        req.hospitalId, patient_id, medecin_id || null, numero_dossier || null,
        plainte_principale || null, historique || null, antecedents || null,
        complement_anamnese || null, examen_physique || null, ccl || null,
        bilan || null, cat || null, medecin_consultant || null
      ]);
      result = rows[0];
    }
    res.status(201).json(result);
  } catch (err) {
    console.error('❌ POST /consultations :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;