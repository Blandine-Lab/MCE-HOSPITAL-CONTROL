const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireRole, requireAdmin } = require('../middleware/auth');

console.log('🔗 DATABASE_URL utilisée par le backend :', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => console.log('✅ Consultations : connecté à PostgreSQL'));

// ------------------------------------------------------------------
// CRÉATION AUTO DES TABLES (inchangé)
// ------------------------------------------------------------------
const ensureAdmissionTables = async () => {
  try {
    const checkBat = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'batiments')
    `);
    if (!checkBat.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.batiments (id SERIAL PRIMARY KEY, nom VARCHAR(100) NOT NULL)`);
    }
    const checkEtages = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'etages')
    `);
    if (!checkEtages.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.etages (id SERIAL PRIMARY KEY, batiment_id INTEGER REFERENCES batiments(id), numero INTEGER)`);
    }
    const checkChambres = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chambres')
    `);
    if (!checkChambres.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.chambres (id SERIAL PRIMARY KEY, nom VARCHAR(100), batiment_id INTEGER REFERENCES batiments(id), etage_id INTEGER REFERENCES etages(id), type VARCHAR(50), capacite INTEGER)`);
    }
    const checkLits = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lits')
    `);
    if (!checkLits.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.lits (id SERIAL PRIMARY KEY, numero VARCHAR(20) NOT NULL, chambre_id INTEGER REFERENCES chambres(id), service_id INTEGER REFERENCES services(id), statut VARCHAR(20) DEFAULT 'libre')`);
    }
    const checkAdmissions = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admissions')
    `);
    if (!checkAdmissions.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.admissions (id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), lit_id INTEGER REFERENCES lits(id), date_admission TIMESTAMP DEFAULT NOW(), motif TEXT, service_id INTEGER REFERENCES services(id), medecin_referent_id INTEGER REFERENCES medecins(id), type VARCHAR(50) DEFAULT 'admission', source_service_id INTEGER)`);
    }
    const checkSejours = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sejours')
    `);
    if (!checkSejours.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.sejours (id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id), admission_id INTEGER REFERENCES admissions(id), lit_id INTEGER REFERENCES lits(id), date_debut TIMESTAMP DEFAULT NOW(), date_fin TIMESTAMP, statut VARCHAR(20) DEFAULT 'en_cours')`);
    }
    const checkSorties = await pool.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sorties')
    `);
    if (!checkSorties.rows[0].exists) {
      await pool.query(`CREATE TABLE IF NOT EXISTS public.sorties (id SERIAL PRIMARY KEY, admission_id INTEGER REFERENCES admissions(id), date_sortie TIMESTAMP DEFAULT NOW(), mode_sortie VARCHAR(50), remarques TEXT)`);
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
router.get('/rendezvous', authenticate, async (req, res) => {
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
      ORDER BY rv.date_rdv DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /rendezvous :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/rendezvous', authenticate, async (req, res) => {
  const { patient_id, medecin_id, service_id, date_rdv, motif, type_consultation, categorie, prix } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO "public"."rendez_vous" (patient_id, medecin_id, service_id, date_rdv, motif, type_consultation, categorie, prix)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [patient_id, medecin_id, service_id, date_rdv, motif, type_consultation || 'générale', categorie || 'ambulatoire', prix || 50.00]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /rendezvous :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/rendezvous/:id', authenticate, async (req, res) => {
  const { statut, rappel_envoye, email_envoye, sms_envoye } = req.body;
  try {
    await pool.query(`
      UPDATE "public"."rendez_vous" SET statut=$1, rappel_envoye=$2, email_envoye=$3, sms_envoye=$4
      WHERE id=$5
    `, [statut, rappel_envoye, email_envoye, sms_envoye, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /rendezvous/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/rendezvous/patient/:patientId', authenticate, async (req, res) => {
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
        AND rv.statut != 'annule'
      ORDER BY rv.date_rdv DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /rendezvous/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- URGENCES ----------
router.get('/urgences', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*,
        (SELECT nom FROM patients WHERE id = u.patient_id) AS patient_nom,
        (SELECT prenom FROM patients WHERE id = u.patient_id) AS patient_prenom
      FROM "public"."urgences" u
      ORDER BY u.priorite ASC, u.heure_arrivee DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /urgences :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/urgences', authenticate, async (req, res) => {
  const { patient_id, niveau, priorite, motif } = req.body;

  const patientIdNum = Number(patient_id);
  if (!patientIdNum || isNaN(patientIdNum)) {
    return res.status(400).json({ error: 'patient_id doit être un nombre valide' });
  }

  try {
    const patientExists = await pool.query('SELECT id FROM patients WHERE id = $1', [patientIdNum]);
    if (patientExists.rows.length === 0) {
      return res.status(400).json({
        error: `Le patient avec l'ID ${patientIdNum} n'existe pas. Veuillez créer le patient d'abord.`
      });
    }

    const { rows } = await pool.query(`
      INSERT INTO "public"."urgences" (patient_id, niveau, priorite, motif, heure_arrivee, statut)
      VALUES ($1, $2, $3, $4, NOW(), 'en_attente') RETURNING *
    `, [patientIdNum, niveau, priorite, motif]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /urgences :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/urgences/:id', authenticate, async (req, res) => {
  const { statut, triage_effectue_par } = req.body;
  try {
    await pool.query(`
      UPDATE "public"."urgences" SET statut=$1, triage_effectue_par=$2 WHERE id=$3
    `, [statut, triage_effectue_par, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /urgences/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LITS DISPONIBLES ----------
router.get('/lits/disponibles', authenticate, async (req, res) => {
  const { service_id } = req.query;
  try {
    let query = `
      SELECT l.*, s.nom AS service_nom, c.nom AS chambre_nom, c.type AS chambre_type
      FROM "public"."lits" l
      LEFT JOIN "public"."services" s ON l.service_id = s.id
      LEFT JOIN "public"."chambres" c ON l.chambre_id = c.id
      WHERE l.statut = 'libre'
    `;
    const params = [];
    if (service_id) {
      query += ` AND l.service_id = $1`;
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
router.post('/admissions', authenticate, async (req, res) => {
  const { patient_id, lit_id, service_id, motif, medecin_referent_id } = req.body;
  if (!patient_id || !lit_id || !service_id || !motif) {
    return res.status(400).json({ error: 'patient_id, lit_id, service_id et motif sont requis' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO "public"."admissions" (patient_id, lit_id, date_admission, motif, service_id, medecin_referent_id, type)
      VALUES ($1, $2, NOW(), $3, $4, $5, 'admission') RETURNING *
    `, [patient_id, lit_id, motif, service_id, medecin_referent_id || null]);
    await client.query(`UPDATE "public"."lits" SET statut = 'occupe' WHERE id = $1`, [lit_id]);
    await client.query(`UPDATE "public"."patients" SET lit_id = $1, statut = 'hospitalise' WHERE id = $2`, [lit_id, patient_id]);
    await client.query(`
      INSERT INTO "public"."sejours" (patient_id, admission_id, lit_id, date_debut, statut)
      VALUES ($1, $2, $3, NOW(), 'en_cours')
    `, [patient_id, rows[0].id, lit_id]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ POST /admissions :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- LISTE COMPLÈTE DES ADMISSIONS ----------
router.get('/admissions', authenticate, async (req, res) => {
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
      ORDER BY a.date_admission DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admissions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LISTE DES PATIENTS HOSPITALISÉS ----------
router.get('/patients/hospitalises', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nom, p.prenom, p.ipp, l.id AS lit_id, l.numero AS lit_numero, c.nom AS chambre_nom
      FROM "public"."patients" p
      JOIN "public"."lits" l ON p.lit_id = l.id
      LEFT JOIN "public"."chambres" c ON l.chambre_id = c.id
      WHERE p.statut = 'hospitalise'
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /patients/hospitalises :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADMISSIONS EN COURS ----------
router.get('/admissions/en_cours', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.date_admission, s.nom AS service_nom
      FROM "public"."admissions" a
      JOIN "public"."services" s ON a.service_id = s.id
      WHERE a.type != 'sortie'
      ORDER BY a.date_admission DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admissions/en_cours :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ADMISSIONS D'UN PATIENT ----------
router.get('/admissions/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.date_admission, s.nom AS service_nom
      FROM "public"."admissions" a
      JOIN "public"."services" s ON a.service_id = s.id
      WHERE a.patient_id = $1
      ORDER BY a.date_admission DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admissions/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CONSULTATIONS D'UN PATIENT ----------
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { rows } = await pool.query(`
      SELECT c.*, 
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM "public"."consultations" c
      LEFT JOIN "public"."medecins" m ON c.medecin_id = m.id
      WHERE c.patient_id = $1
      ORDER BY c.date DESC
    `, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- PRESCRIPTIONS D'UN PATIENT ----------
router.get('/prescriptions/patient/:patientId', authenticate, async (req, res) => {
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
      WHERE p.patient_id = $1
      ORDER BY p.date_creation DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /prescriptions/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ORDONNANCES D'UN PATIENT ----------
router.get('/ordonnances/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, 
             u.nom AS medecin_nom, u.prenom AS medecin_prenom
      FROM "public"."ordonnances" o
      LEFT JOIN "public"."utilisateurs" u ON o.medecin_id = u.id
      WHERE o.patient_id = $1
      ORDER BY o.date_prescription DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /ordonnances/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- TRANSFERT ----------
router.post('/transferts', authenticate, async (req, res) => {
  const { patient_id, nouveau_lit_id, nouveau_service_id, motif } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ancienLitRes = await client.query('SELECT lit_id FROM "public"."patients" WHERE id = $1', [patient_id]);
    const ancienLitId = ancienLitRes.rows[0]?.lit_id;
    if (!ancienLitId) return res.status(400).json({ error: 'Patient non hospitalisé' });
    const ancienServiceRes = await client.query('SELECT service_id FROM "public"."lits" WHERE id = $1', [ancienLitId]);
    const ancienServiceId = ancienServiceRes.rows[0]?.service_id;
    const newAdmission = await client.query(`
      INSERT INTO "public"."admissions" (patient_id, lit_id, date_admission, motif, service_id, type, source_service_id)
      VALUES ($1, $2, NOW(), $3, $4, 'transfert', $5) RETURNING id
    `, [patient_id, nouveau_lit_id, motif, nouveau_service_id, ancienServiceId]);
    await client.query('UPDATE "public"."lits" SET statut = $1 WHERE id = $2', ['libre', ancienLitId]);
    await client.query('UPDATE "public"."lits" SET statut = $1 WHERE id = $2', ['occupe', nouveau_lit_id]);
    await client.query('UPDATE "public"."patients" SET lit_id = $1 WHERE id = $2', [nouveau_lit_id, patient_id]);
    await client.query(`UPDATE "public"."sejours" SET date_fin = NOW(), statut = 'termine' WHERE patient_id = $1 AND statut = 'en_cours'`, [patient_id]);
    await client.query(`
      INSERT INTO "public"."sejours" (patient_id, admission_id, lit_id, date_debut, statut)
      VALUES ($1, $2, $3, NOW(), 'en_cours')
    `, [patient_id, newAdmission.rows[0].id, nouveau_lit_id]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Transfert effectué' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ POST /transferts :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- SORTIE ----------
router.post('/sorties', authenticate, async (req, res) => {
  const { patient_id, admission_id, mode_sortie, remarques } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const litRes = await client.query('SELECT lit_id FROM "public"."patients" WHERE id = $1', [patient_id]);
    const litId = litRes.rows[0]?.lit_id;
    if (litId) {
      await client.query('UPDATE "public"."lits" SET statut = $1 WHERE id = $2', ['libre', litId]);
    }
    await client.query('UPDATE "public"."patients" SET date_sortie = NOW(), statut = $1, lit_id = NULL WHERE id = $2', ['sorti', patient_id]);
    await client.query(`UPDATE "public"."sejours" SET date_fin = NOW(), statut = 'termine' WHERE patient_id = $1 AND statut = 'en_cours'`, [patient_id]);
    await client.query(`
      INSERT INTO "public"."sorties" (admission_id, date_sortie, mode_sortie, remarques)
      VALUES ($1, NOW(), $2, $3)
    `, [admission_id, mode_sortie, remarques]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Sortie enregistrée' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ POST /sorties :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- LISTE COMPLÈTE DES SORTIES (HISTORIQUE) ----------
router.get('/sorties', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.id,
        s.admission_id,
        s.date_sortie,
        s.mode_sortie,
        s.remarques,
        p.nom || ' ' || p.prenom AS patient_nom,
        a.patient_id
      FROM "public"."sorties" s
      LEFT JOIN "public"."admissions" a ON s.admission_id = a.id
      LEFT JOIN "public"."patients" p ON a.patient_id = p.id
      ORDER BY s.date_sortie DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /sorties :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- SERVICES & MÉDECINS (public) ----------
router.get('/services', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom FROM "public"."services" ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /services :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/medecins', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom, prenom FROM "public"."medecins" ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /medecins :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD SERVICES ----------
router.get('/services/all', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom FROM "public"."services" ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /services/all :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/services', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  try {
    const { rows } = await pool.query('INSERT INTO "public"."services" (nom) VALUES ($1) RETURNING *', [nom]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /services :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/services/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  try {
    const result = await pool.query('UPDATE "public"."services" SET nom = $1 WHERE id = $2', [nom, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/services/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const lits = await pool.query('SELECT id FROM "public"."lits" WHERE service_id = $1', [req.params.id]);
    if (lits.rowCount > 0) return res.status(400).json({ error: 'Ce service est utilisé par des lits' });
    const result = await pool.query('DELETE FROM "public"."services" WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /services/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD MÉDECINS ----------
router.get('/medecins/all', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom, prenom, specialite, email FROM "public"."medecins" ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /medecins/all :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ROUTE RÉCUPÉRER UN MÉDECIN PAR USER_ID ----------
router.get('/medecins/by-user/:userId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, prenom, specialite, email FROM medecins WHERE user_id = $1',
      [req.params.userId]
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

router.post('/medecins', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email } = req.body;
  if (!nom || !prenom) return res.status(400).json({ error: 'Nom et prénom requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO "public"."medecins" (nom, prenom, specialite, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, prenom, specialite, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /medecins :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/medecins/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "public"."medecins" SET nom=$1, prenom=$2, specialite=$3, email=$4 WHERE id=$5',
      [nom, prenom, specialite, email, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médecin non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /medecins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/medecins/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const adm = await pool.query('SELECT id FROM "public"."admissions" WHERE medecin_referent_id = $1', [req.params.id]);
    if (adm.rowCount > 0) return res.status(400).json({ error: 'Ce médecin est référent dans des admissions' });
    const result = await pool.query('DELETE FROM "public"."medecins" WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médecin non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /medecins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD BÂTIMENTS ----------
router.get('/batiments', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM "public"."batiments" ORDER BY nom');
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /batiments :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/batiments', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  try {
    const { rows } = await pool.query('INSERT INTO "public"."batiments" (nom) VALUES ($1) RETURNING *', [nom]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /batiments :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batiments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM "public"."batiments" WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /batiments/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD ÉTAGES ----------
router.get('/etages', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, b.nom AS batiment_nom 
      FROM "public"."etages" e 
      LEFT JOIN "public"."batiments" b ON e.batiment_id = b.id 
      ORDER BY b.nom, e.numero
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /etages :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/etages', authenticate, requireRole(['admin']), async (req, res) => {
  const { batiment_id, numero } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO "public"."etages" (batiment_id, numero) VALUES ($1, $2) RETURNING *',
      [batiment_id, numero]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /etages :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/etages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM "public"."etages" WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /etages/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD CHAMBRES ----------
router.get('/chambres/list', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, b.nom AS batiment_nom, e.numero AS etage_numero
      FROM "public"."chambres" c
      LEFT JOIN "public"."batiments" b ON c.batiment_id = b.id
      LEFT JOIN "public"."etages" e ON c.etage_id = e.id
      ORDER BY b.nom, e.numero, c.nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /chambres/list :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/chambres', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, batiment_id, etage_id, type, capacite } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO "public"."chambres" (nom, batiment_id, etage_id, type, capacite)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [nom, batiment_id, etage_id, type, capacite]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /chambres :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/chambres/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const lits = await pool.query('SELECT id FROM "public"."lits" WHERE chambre_id = $1', [req.params.id]);
    if (lits.rowCount > 0) {
      return res.status(400).json({ error: 'Cette chambre contient des lits. Supprimez d’abord les lits.' });
    }
    await pool.query('DELETE FROM "public"."chambres" WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /chambres/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CRUD LITS ----------
router.get('/lits/all', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, c.nom AS chambre_nom 
      FROM "public"."lits" l 
      LEFT JOIN "public"."chambres" c ON l.chambre_id = c.id 
      ORDER BY c.nom, l.numero
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /lits/all :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/lits', authenticate, requireRole(['admin']), async (req, res) => {
  const { chambre_id, numero, statut } = req.body;
  if (!chambre_id || !numero) {
    return res.status(400).json({ error: 'chambre_id et numero sont requis' });
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO "public"."lits" (chambre_id, numero, statut)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [chambre_id, numero, statut || 'libre']);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /lits :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lits/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const patient = await pool.query('SELECT id FROM "public"."patients" WHERE lit_id = $1', [req.params.id]);
    if (patient.rowCount > 0) {
      return res.status(400).json({ error: 'Ce lit est actuellement occupé par un patient.' });
    }
    await pool.query('DELETE FROM "public"."lits" WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /lits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/lits/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const { statut } = req.body;
  try {
    await pool.query('UPDATE "public"."lits" SET statut=$1 WHERE id=$2', [statut, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /lits/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- INTERVENTIONS ----------
router.get('/interventions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, p.nom AS patient_nom, p.prenom AS patient_prenom,
             m.nom AS medecin_nom
      FROM "public"."interventions" i
      LEFT JOIN "public"."patients" p ON i.patient_id = p.id
      LEFT JOIN "public"."medecins" m ON i.medecin_id = m.id
      ORDER BY i.date_prevue DESC
    `);
    res.json(rows);
  } catch (err) {
    console.warn('⚠️ Table interventions absente ou requête erronée:', err.message);
    res.json([]);
  }
});

// ---------- ORDONNANCES (POST) ----------
router.post('/ordonnances', authenticate, requireRole(['medecin', 'admin']), async (req, res) => {
  const { patient_id, lignes, observations } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = `ORD-${Date.now()}`;
    const ordonnance = await client.query(`
      INSERT INTO "public"."ordonnances" (patient_id, medecin_id, numero_ordonnance, observations, created_by)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [patient_id, req.user.id, numero, observations, req.user.id]);
    const ordonnanceId = ordonnance.rows[0].id;
    for (const ligne of lignes) {
      await client.query(`
        INSERT INTO "public"."ligne_ordonnances" (ordonnance_id, medicament_id, quantite_prescrit, posologie)
        VALUES ($1, $2, $3, $4)
      `, [ordonnanceId, ligne.medicament_id, ligne.quantite_prescrit, ligne.posologie]);
    }
    await client.query('COMMIT');
    res.status(201).json(ordonnance.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ POST /ordonnances :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ---------- ADMISSIONS : GET/PUT/DELETE par ID ----------
router.get('/admissions/:id', authenticate, async (req, res) => {
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
      WHERE a.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/admissions/:id', authenticate, async (req, res) => {
  const { service_id, medecin_referent_id, lit_id, motif, date_admission } = req.body;
  try {
    const result = await pool.query(`
      UPDATE "public"."admissions" SET
        service_id = COALESCE($1, service_id),
        medecin_referent_id = COALESCE($2, medecin_referent_id),
        lit_id = COALESCE($3, lit_id),
        motif = COALESCE($4, motif),
        date_admission = COALESCE($5, date_admission)
      WHERE id = $6
    `, [service_id, medecin_referent_id, lit_id, motif, date_admission, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ PUT /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admissions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const sejour = await pool.query('SELECT id FROM "public"."sejours" WHERE admission_id = $1 AND statut = $2', [req.params.id, 'en_cours']);
    if (sejour.rowCount > 0) {
      return res.status(400).json({ error: 'Cette admission est associée à un séjour en cours. Impossible de la supprimer.' });
    }
    const result = await pool.query('DELETE FROM "public"."admissions" WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- HISTORIQUE COMPLET DES SORTIES ----------
router.get('/sorties', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.id,
        s.admission_id,
        s.date_sortie,
        s.mode_sortie,
        s.remarques,
        p.nom || ' ' || p.prenom AS patient_nom,
        a.patient_id
      FROM "public"."sorties" s
      LEFT JOIN "public"."admissions" a ON s.admission_id = a.id
      LEFT JOIN "public"."patients" p ON a.patient_id = p.id
      ORDER BY s.date_sortie DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /sorties :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- HISTORIQUE DES TRANSFERTS ----------
router.get('/transferts', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id AS admission_id,
        a.date_admission AS date_transfert,
        a.motif,
        a.service_id AS nouveau_service_id,
        a.source_service_id AS ancien_service_id,
        a.lit_id AS nouveau_lit_id,
        (SELECT lit_id FROM admissions WHERE patient_id = a.patient_id AND date_admission < a.date_admission ORDER BY date_admission DESC LIMIT 1) AS ancien_lit_id,
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
      LEFT JOIN lits l1 ON (SELECT lit_id FROM admissions WHERE patient_id = a.patient_id AND date_admission < a.date_admission ORDER BY date_admission DESC LIMIT 1) = l1.id
      LEFT JOIN lits l2 ON a.lit_id = l2.id
      WHERE a.type = 'transfert'
      ORDER BY a.date_admission DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /transferts :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ROUTE DE DÉBOGAGE ----------
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route consultations/test fonctionne !', user: req.user });
});

// ---------- COMPTER LES CONSULTATIONS D'UN PATIENT ----------
router.get('/count/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS total FROM consultations WHERE patient_id = $1',
      [req.params.patientId]
    );
    res.json(parseInt(rows[0]?.total || 0));
  } catch (err) {
    console.error('❌ GET /count/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- CONSULTATIONS (POST - Créer ou mettre à jour) ----------
router.post('/', authenticate, requireRole(['medecin', 'admin']), async (req, res) => {
  const {
    patient_id,
    medecin_id,
    numero_dossier,
    plainte_principale,
    historique,
    antecedents,
    complement_anamnese,
    examen_physique,
    ccl,
    bilan,
    cat,
    medecin_consultant
  } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id est requis' });
  }

  try {
    // Vérifier si une consultation existe déjà pour ce patient
    const existing = await pool.query(
      'SELECT id FROM consultations WHERE patient_id = $1 ORDER BY date DESC LIMIT 1',
      [patient_id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Mise à jour de la consultation existante
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
        WHERE id = $12
        RETURNING *
      `, [
        medecin_id || null,
        numero_dossier || null,
        plainte_principale || null,
        historique || null,
        antecedents || null,
        complement_anamnese || null,
        examen_physique || null,
        ccl || null,
        bilan || null,
        cat || null,
        medecin_consultant || null,
        existing.rows[0].id
      ]);
      result = rows[0];
    } else {
      // Nouvelle consultation
      const { rows } = await pool.query(`
        INSERT INTO consultations (
          patient_id,
          medecin_id,
          numero_dossier,
          plainte_principale,
          historique,
          antecedents,
          complement_anamnese,
          examen_physique,
          ccl,
          bilan,
          cat,
          medecin_consultant
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        patient_id,
        medecin_id || null,
        numero_dossier || null,
        plainte_principale || null,
        historique || null,
        antecedents || null,
        complement_anamnese || null,
        examen_physique || null,
        ccl || null,
        bilan || null,
        cat || null,
        medecin_consultant || null
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