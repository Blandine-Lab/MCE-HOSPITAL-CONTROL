const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireRole, requireAdmin } = require('../middleware/auth');

// ============================================================
// 1. DIAGNOSTIC : afficher l'URL de connexion
// ============================================================
console.log('🔗 DATABASE_URL (bloc) :', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Bloc : connecté à PostgreSQL'));

// ============================================================
// 2. VÉRIFICATION ET CRÉATION AUTOMATIQUE DES TABLES / COLONNES
// ============================================================
const ensureBlocTables = async () => {
  try {
    // ---- Création de la table employes si elle n'existe pas ----
    const checkEmployes = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'employes'
      )
    `);
    if (!checkEmployes.rows[0].exists) {
      console.log('📦 Création de la table employes...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.employes (
          id SERIAL PRIMARY KEY,
          nom VARCHAR(100),
          prenom VARCHAR(100)
        )
      `);
      console.log('✅ Table employes créée');
    }

    // ---- Création de salles_bloc si elle n'existe pas ----
    const checkSalles = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'salles_bloc'
      )
    `);
    if (!checkSalles.rows[0].exists) {
      console.log('📦 Création de la table salles_bloc...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.salles_bloc (
          id SERIAL PRIMARY KEY,
          nom VARCHAR(100) NOT NULL,
          numero VARCHAR(50),
          disponible BOOLEAN DEFAULT TRUE,
          localisation TEXT,
          notes TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Table salles_bloc créée');
    } else {
      // Ajout des colonnes manquantes si la table existe
      const checkCols = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'salles_bloc' AND column_name = 'numero'
      `);
      if (checkCols.rows.length === 0) {
        console.log('📦 Ajout des colonnes manquantes à salles_bloc...');
        await pool.query(`
          ALTER TABLE salles_bloc
            ADD COLUMN IF NOT EXISTS numero VARCHAR(50),
            ADD COLUMN IF NOT EXISTS localisation TEXT,
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        `);
        console.log('✅ Colonnes salles_bloc ajoutées');
      } else {
        console.log('✅ salles_bloc déjà à jour');
      }
    }

    // ---- Création de interventions si elle n'existe pas ----
    const checkInterv = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'interventions'
      )
    `);
    if (!checkInterv.rows[0].exists) {
      console.log('📦 Création de la table interventions...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.interventions (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id),
          salle_id INTEGER REFERENCES salles_bloc(id),
          type_intervention VARCHAR(200),
          date_prevue TIMESTAMP,
          duree_estimee INTEGER,
          statut VARCHAR(20) DEFAULT 'planifiee',
          priorite VARCHAR(20) DEFAULT 'normale',
          chirurgien_principal_id INTEGER REFERENCES employes(id),
          co_chirurgiens INTEGER[],
          infirmiere_scolper INTEGER REFERENCES employes(id),
          infirmiere_circulante INTEGER REFERENCES employes(id),
          anesthesiste_id INTEGER REFERENCES employes(id),
          notes_preoperatoires TEXT,
          notes_postoperatoires TEXT,
          motifs VARCHAR(500),
          created_by INTEGER REFERENCES utilisateurs(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Table interventions créée');
    } else {
      // Ajout des colonnes manquantes si la table existe
      const checkCols = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'interventions' AND column_name = 'type_intervention'
      `);
      if (checkCols.rows.length === 0) {
        console.log('📦 Ajout des colonnes manquantes à interventions...');
        await pool.query(`
          ALTER TABLE interventions
            ADD COLUMN IF NOT EXISTS type_intervention VARCHAR(200),
            ADD COLUMN IF NOT EXISTS priorite VARCHAR(20) DEFAULT 'normale',
            ADD COLUMN IF NOT EXISTS chirurgien_principal_id INTEGER,
            ADD COLUMN IF NOT EXISTS co_chirurgiens INTEGER[],
            ADD COLUMN IF NOT EXISTS infirmiere_scolper INTEGER,
            ADD COLUMN IF NOT EXISTS infirmiere_circulante INTEGER,
            ADD COLUMN IF NOT EXISTS anesthesiste_id INTEGER,
            ADD COLUMN IF NOT EXISTS notes_preoperatoires TEXT,
            ADD COLUMN IF NOT EXISTS notes_postoperatoires TEXT,
            ADD COLUMN IF NOT EXISTS motifs VARCHAR(500),
            ADD COLUMN IF NOT EXISTS created_by INTEGER,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        `);
        console.log('✅ Colonnes interventions ajoutées');
      } else {
        console.log('✅ interventions déjà à jour');
      }
    }
  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation des tables bloc :', err.message);
  }
};

ensureBlocTables();

// ============================================================
// 3. TOUTES LES ROUTES (authentification requise)
// ============================================================
router.use(authenticate);

// ---------- Gestion des salles ----------
router.get('/salles', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM interventions i WHERE i.salle_id = s.id AND i.statut = 'planifiee' AND i.date_prevue >= NOW()) AS interventions_prevues
      FROM salles_bloc s
      ORDER BY s.nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /salles :', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/salles', requireRole(['admin', 'medecin', 'Administrateur']), async (req, res) => {
  const { nom, numero, disponible, localisation, notes } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO salles_bloc (nom, numero, disponible, localisation, notes)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [nom, numero, disponible !== undefined ? disponible : true, localisation, notes]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /salles :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/salles/:id', requireRole(['admin', 'medecin', 'Administrateur']), async (req, res) => {
  const { nom, numero, disponible, localisation, notes } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE salles_bloc SET nom=$1, numero=$2, disponible=$3, localisation=$4, notes=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [nom, numero, disponible, localisation, notes, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Salle non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /salles/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/salles/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id FROM interventions WHERE salle_id = $1 AND statut = $2', [req.params.id, 'planifiee']);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'Cette salle a des interventions planifiées. Impossible de la supprimer.' });
    }
    await pool.query('DELETE FROM salles_bloc WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /salles/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Gestion des interventions ----------
router.get('/interventions', async (req, res) => {
  const { date_debut, date_fin, salle_id, statut, patient_id } = req.query;
  let query = `
    SELECT i.*,
      p.nom AS patient_nom, p.prenom AS patient_prenom,
      e.nom AS chirurgien_nom, e.prenom AS chirurgien_prenom,
      s.nom AS salle_nom
    FROM interventions i
    LEFT JOIN patients p ON i.patient_id = p.id
    LEFT JOIN employes e ON i.chirurgien_principal_id = e.id
    LEFT JOIN salles_bloc s ON i.salle_id = s.id
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (date_debut) {
    query += ` AND i.date_prevue >= $${paramIndex}`;
    params.push(date_debut);
    paramIndex++;
  }
  if (date_fin) {
    query += ` AND i.date_prevue <= $${paramIndex}`;
    params.push(date_fin);
    paramIndex++;
  }
  if (salle_id) {
    query += ` AND i.salle_id = $${paramIndex}`;
    params.push(salle_id);
    paramIndex++;
  }
  if (statut) {
    query += ` AND i.statut = $${paramIndex}`;
    params.push(statut);
    paramIndex++;
  }
  if (patient_id) {
    query += ` AND i.patient_id = $${paramIndex}`;
    params.push(patient_id);
    paramIndex++;
  }

  query += ` ORDER BY i.date_prevue ASC`;

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /interventions :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/interventions/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*,
        p.nom AS patient_nom, p.prenom AS patient_prenom,
        e.nom AS chirurgien_nom, e.prenom AS chirurgien_prenom,
        s.nom AS salle_nom,
        a.nom AS anesthesiste_nom, a.prenom AS anesthesiste_prenom
      FROM interventions i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN employes e ON i.chirurgien_principal_id = e.id
      LEFT JOIN employes a ON i.anesthesiste_id = a.id
      LEFT JOIN salles_bloc s ON i.salle_id = s.id
      WHERE i.id = $1
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Intervention non trouvée' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /interventions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

const sanitize = (val) => {
  if (val === '' || val === undefined || val === null) return null;
  return val;
};

router.post('/interventions', requireRole(['admin', 'medecin', 'Administrateur']), async (req, res) => {
  const {
    patient_id, salle_id, type_intervention, date_prevue, duree_estimee,
    priorite, chirurgien_principal_id, co_chirurgiens, infirmiere_scolper,
    infirmiere_circulante, anesthesiste_id, notes_preoperatoires, motifs
  } = req.body;

  if (!patient_id || !date_prevue) {
    return res.status(400).json({ error: 'patient_id et date_prevue sont requis' });
  }

  const sanitizedSalleId = sanitize(salle_id);
  const sanitizedChirurgien = sanitize(chirurgien_principal_id);
  const sanitizedInfirmiereSc = sanitize(infirmiere_scolper);
  const sanitizedInfirmiereCi = sanitize(infirmiere_circulante);
  const sanitizedAnesthesiste = sanitize(anesthesiste_id);
  const sanitizedCoChirurgiens = (co_chirurgiens && Array.isArray(co_chirurgiens)) ? co_chirurgiens : [];

  const dureeMinutes = parseInt(duree_estimee) || 60;
  const startTime = new Date(date_prevue);
  const endTime = new Date(startTime.getTime() + dureeMinutes * 60000);

  if (sanitizedSalleId) {
    try {
      const conflictCheck = await pool.query(`
        SELECT id FROM interventions 
        WHERE salle_id = $1 
          AND date_prevue < $2
          AND date_prevue + (duree_estimee * INTERVAL '1 minute') > $3
          AND statut != 'annulee'
      `, [sanitizedSalleId, endTime, startTime]);
      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: 'Conflit de planning : une autre intervention est déjà programmée dans cette salle à cette heure.',
          conflict: conflictCheck.rows[0]
        });
      }
    } catch (err) {
      console.error('Erreur lors du contrôle de conflit :', err);
      return res.status(500).json({ error: 'Erreur interne lors du contrôle de planning' });
    }
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO interventions (
        patient_id, salle_id, type_intervention, date_prevue, duree_estimee,
        priorite, chirurgien_principal_id, co_chirurgiens, infirmiere_scolper,
        infirmiere_circulante, anesthesiste_id, notes_preoperatoires, motifs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      patient_id, 
      sanitizedSalleId,
      type_intervention, 
      date_prevue, 
      dureeMinutes,
      priorite || 'normale', 
      sanitizedChirurgien, 
      sanitizedCoChirurgiens,
      sanitizedInfirmiereSc,
      sanitizedInfirmiereCi,
      sanitizedAnesthesiste,
      notes_preoperatoires, 
      motifs
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /interventions :', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/interventions/:id', requireRole(['admin', 'medecin', 'Administrateur']), async (req, res) => {
  const {
    patient_id, salle_id, type_intervention, date_prevue, duree_estimee,
    statut, priorite, chirurgien_principal_id, co_chirurgiens, infirmiere_scolper,
    infirmiere_circulante, anesthesiste_id, notes_preoperatoires, notes_postoperatoires, motifs
  } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM interventions WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Intervention non trouvée' });

    const sanitizedSalleId = sanitize(salle_id);
    const sanitizedChirurgien = sanitize(chirurgien_principal_id);
    const sanitizedInfirmiereSc = sanitize(infirmiere_scolper);
    const sanitizedInfirmiereCi = sanitize(infirmiere_circulante);
    const sanitizedAnesthesiste = sanitize(anesthesiste_id);
    const sanitizedCoChirurgiens = (co_chirurgiens && Array.isArray(co_chirurgiens)) ? co_chirurgiens : [];

    if (date_prevue && sanitizedSalleId) {
      const duree = parseInt(duree_estimee) || 60;
      const startTime = new Date(date_prevue);
      const endTime = new Date(startTime.getTime() + duree * 60000);
      const conflictCheck = await pool.query(`
        SELECT id FROM interventions 
        WHERE salle_id = $1 
          AND id != $2
          AND date_prevue < $3
          AND date_prevue + (duree_estimee * INTERVAL '1 minute') > $4
          AND statut != 'annulee'
      `, [sanitizedSalleId, req.params.id, endTime, startTime]);
      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Conflit de planning avec une autre intervention.' });
      }
    }

    const { rows } = await pool.query(`
      UPDATE interventions SET
        patient_id = COALESCE($1, patient_id),
        salle_id = COALESCE($2, salle_id),
        type_intervention = COALESCE($3, type_intervention),
        date_prevue = COALESCE($4, date_prevue),
        duree_estimee = COALESCE($5, duree_estimee),
        statut = COALESCE($6, statut),
        priorite = COALESCE($7, priorite),
        chirurgien_principal_id = COALESCE($8, chirurgien_principal_id),
        co_chirurgiens = COALESCE($9, co_chirurgiens),
        infirmiere_scolper = COALESCE($10, infirmiere_scolper),
        infirmiere_circulante = COALESCE($11, infirmiere_circulante),
        anesthesiste_id = COALESCE($12, anesthesiste_id),
        notes_preoperatoires = COALESCE($13, notes_preoperatoires),
        notes_postoperatoires = COALESCE($14, notes_postoperatoires),
        motifs = COALESCE($15, motifs),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      patient_id, sanitizedSalleId, type_intervention, date_prevue, duree_estimee,
      statut, priorite, sanitizedChirurgien, sanitizedCoChirurgiens,
      sanitizedInfirmiereSc, sanitizedInfirmiereCi, sanitizedAnesthesiste,
      notes_preoperatoires, notes_postoperatoires, motifs,
      req.params.id
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /interventions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/interventions/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE interventions SET statut = $1, updated_at = NOW() WHERE id = $2', ['annulee', req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /interventions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Planning hebdomadaire ----------
router.get('/planning', async (req, res) => {
  const { semaine } = req.query;
  const startDate = semaine ? new Date(semaine) : new Date();
  const day = startDate.getDay();
  const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(startDate);
  monday.setDate(diff);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);

  try {
    const { rows } = await pool.query(`
      SELECT i.*, 
        p.nom AS patient_nom, p.prenom AS patient_prenom,
        e.nom AS chirurgien_nom, e.prenom AS chirurgien_prenom,
        s.nom AS salle_nom
      FROM interventions i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN employes e ON i.chirurgien_principal_id = e.id
      LEFT JOIN salles_bloc s ON i.salle_id = s.id
      WHERE i.date_prevue BETWEEN $1 AND $2
        AND i.statut != 'annulee'
      ORDER BY i.date_prevue, i.salle_id
    `, [monday, sunday]);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /planning :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- Statistiques ----------
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { rows } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM interventions WHERE date_prevue BETWEEN $1 AND $2 AND statut = 'planifiee') AS aujourdhui,
        (SELECT COUNT(*) FROM interventions WHERE date_prevue BETWEEN $1 AND $2 AND statut = 'en_cours') AS en_cours,
        (SELECT COUNT(*) FROM interventions WHERE statut = 'planifiee') AS total_prevues,
        (SELECT COUNT(*) FROM interventions WHERE statut = 'terminee' AND date_prevue >= NOW() - INTERVAL '7 days') AS sept_derniers_jours
    `, [today, tomorrow]);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /stats :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;