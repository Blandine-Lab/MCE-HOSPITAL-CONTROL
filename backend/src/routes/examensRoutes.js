// backend/src/routes/examensRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { generateExamPDF } = require('../services/pdfService');

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
// Helpers – vérification d'appartenance au tenant
// ============================================================
async function patientInTenant(patientId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM patients WHERE id = $1 AND hospital_id = $2',
    [patientId, hospitalId]
  );
  return rowCount > 0;
}

async function typeExamenInTenant(typeId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM types_examens WHERE id = $1 AND hospital_id = $2',
    [typeId, hospitalId]
  );
  return rowCount > 0;
}

async function serviceInTenant(serviceId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM services WHERE id = $1 AND hospital_id = $2',
    [serviceId, hospitalId]
  );
  return rowCount > 0;
}

async function utilisateurInTenant(userId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
    [userId, hospitalId]
  );
  return rowCount > 0;
}

async function examenInTenant(examenId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM examens WHERE id = $1 AND hospital_id = $2',
    [examenId, hospitalId]
  );
  return rowCount > 0;
}

// ============================================================
//  VÉRIFICATION / AJOUT DES COLONNES MANQUANTES
// ============================================================
const ensureGroupesExamensTable = async () => {
  try {
    await pool.query(`ALTER TABLE groupes_examens DROP COLUMN IF EXISTS nom CASCADE`);
    console.log('✅ Colonne nom supprimée de groupes_examens');
  } catch (err) {
    console.warn('⚠️ Suppression de nom ignorée :', err.message);
  }

  try {
    // ✅ FIX : hospital_id ajouté au CREATE
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groupes_examens (
        id SERIAL PRIMARY KEY,
        hospital_id UUID,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        medecin_prescripteur VARCHAR(255),
        date_creation TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table groupes_examens vérifiée/créée');

    const checkPatient = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'groupes_examens' AND column_name = 'patient_id'
      )
    `);
    if (!checkPatient.rows[0].exists) {
      await pool.query(`
        ALTER TABLE groupes_examens ADD COLUMN patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE
      `);
      console.log('✅ Colonne patient_id ajoutée');
    }

    const checkMed = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'groupes_examens' AND column_name = 'medecin_prescripteur'
      )
    `);
    if (!checkMed.rows[0].exists) {
      await pool.query(`
        ALTER TABLE groupes_examens ADD COLUMN medecin_prescripteur VARCHAR(255)
      `);
      console.log('✅ Colonne medecin_prescripteur ajoutée');
    }

    // ✅ FIX : ajout hospital_id si la table existait déjà sans cette colonne
    const checkHospital = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'groupes_examens' AND column_name = 'hospital_id'
      )
    `);
    if (!checkHospital.rows[0].exists) {
      await pool.query(`ALTER TABLE groupes_examens ADD COLUMN hospital_id UUID`);
      console.log('✅ Colonne hospital_id ajoutée à groupes_examens (à backfiller via patient_id)');
    }
  } catch (err) {
    console.error('❌ Erreur lors de la vérification de groupes_examens :', err);
  }
};

const ensureExamensGroupeId = async () => {
  try {
    const checkGroupe = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'examens' AND column_name = 'groupe_id'
      )
    `);
    if (!checkGroupe.rows[0].exists) {
      await pool.query(`
        ALTER TABLE examens ADD COLUMN groupe_id INTEGER REFERENCES groupes_examens(id) ON DELETE SET NULL
      `);
      console.log('✅ Colonne groupe_id ajoutée à examens');
    }
  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout de groupe_id :', err);
  }
};

const ensureExamensParametres = async () => {
  try {
    const checkParam = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'examens' AND column_name = 'parametres'
      )
    `);
    if (!checkParam.rows[0].exists) {
      await pool.query(`ALTER TABLE examens ADD COLUMN parametres JSONB`);
      console.log('✅ Colonne parametres ajoutée à examens');
    }
  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout de parametres :', err);
  }
};

const ensureExamensPreleveur = async () => {
  try {
    const checkCol = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'examens' AND column_name = 'preleveur_id'
      )
    `);
    if (!checkCol.rows[0].exists) {
      await pool.query(`
        ALTER TABLE examens ADD COLUMN preleveur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL
      `);
      console.log('✅ Colonne preleveur_id ajoutée avec contrainte');
    } else {
      const checkConstraint = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'examens' AND constraint_name = 'examens_preleveur_id_fkey'
        )
      `);
      if (!checkConstraint.rows[0].exists) {
        await pool.query(`
          ALTER TABLE examens ADD CONSTRAINT examens_preleveur_id_fkey
          FOREIGN KEY (preleveur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
        `);
        console.log('✅ Contrainte examens_preleveur_id_fkey ajoutée');
      }
    }
  } catch (err) {
    console.error('❌ Erreur lors de la vérification de preleveur_id :', err);
  }
};

(async () => {
  await ensureGroupesExamensTable();
  await ensureExamensGroupeId();
  await ensureExamensParametres();
  await ensureExamensPreleveur();
})();

// ============================================================
//  NORMALISATION DU STATUT
// ============================================================
const normalizeStatut = (statut) => {
  if (!statut) return 'en_attente';
  const validStatuses = ['en_attente', 'en_cours', 'realise', 'annule'];
  if (validStatuses.includes(statut)) return statut;
  const mapping = {
    'demandé': 'en_attente',
    'en_cours': 'en_cours',
    'terminé': 'realise',
    'valide': 'realise',
    'annulé': 'annule'
  };
  return mapping[statut] || 'en_attente';
};

// ============================================================
// COUNTS
// ============================================================
router.get('/counts', authenticate, requireHospital, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE statut = 'en_attente' AND COALESCE(priorite, 'normal') = 'urgent') AS urgent,
        COUNT(*) FILTER (WHERE statut = 'en_attente' OR statut = 'en_cours') AS aSaisir,
        COUNT(*) FILTER (WHERE statut = 'realise') AS aValider
      FROM examens
      WHERE hospital_id = $1
    `, [req.hospitalId]);
    const { total, urgent, asaisir, avalider } = result.rows[0];
    res.json({
      total: parseInt(total),
      urgent: parseInt(urgent),
      aSaisir: parseInt(asaisir),
      aValider: parseInt(avalider)
    });
  } catch (err) {
    console.error('GET /examens/counts :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// RECENT
// ============================================================
router.get('/recent', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, e.type_examen_id, e.date_demande, COALESCE(e.priorite, 'normal') AS priorite, 
             p.nom, p.prenom, t.nom AS type_nom
      FROM examens e
      LEFT JOIN patients p ON e.patient_id = p.id
      LEFT JOIN types_examens t ON e.type_examen_id = t.id
      WHERE e.statut IN ('en_attente', 'en_cours')
        AND e.hospital_id = $1
      ORDER BY e.date_demande DESC
      LIMIT 5
    `, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/recent :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATIENT LIST
// ============================================================
router.get('/patient/:patientId', authenticate, requireHospital, async (req, res) => {
  try {
    const { patientId } = req.params;

    // ✅ FIX : vérifier que le patient appartient au tenant AVANT de lire
    if (!(await patientInTenant(patientId, req.hospitalId))) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { rows } = await pool.query(`
      SELECT e.id, e.type_examen_id, e.categorie, e.date_demande, e.statut,
             COALESCE(e.prix, 50) AS prix,
             e.description,
             t.nom AS type_nom
      FROM examens e
      LEFT JOIN types_examens t ON e.type_examen_id = t.id
      WHERE e.patient_id = $1
        AND e.hospital_id = $2
        AND e.statut NOT IN ('annule')
      ORDER BY e.date_demande DESC
    `, [patientId, req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GROUPE
// ============================================================
router.post('/groupe', authenticate, requireHospital, async (req, res) => {
  const { patient_id, medecin_prescripteur, examens, service_id } = req.body;
  if (!patient_id || !examens || examens.length === 0) {
    return res.status(400).json({ error: 'Patient et au moins un examen sont requis' });
  }

  const parsedPatientId = parseInt(patient_id);
  if (isNaN(parsedPatientId)) {
    return res.status(400).json({ error: 'Le patient_id doit être un nombre valide.' });
  }
  const parsedServiceId = service_id ? parseInt(service_id) : null;
  if (service_id && isNaN(parsedServiceId)) {
    return res.status(400).json({ error: 'Le service_id doit être un nombre valide.' });
  }

  try {
    // ✅ FIX : vérifications d'appartenance avant transaction
    if (!(await patientInTenant(parsedPatientId, req.hospitalId))) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }
    if (parsedServiceId !== null && !(await serviceInTenant(parsedServiceId, req.hospitalId))) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
  } catch (err) {
    console.error('POST /examens/groupe pré-check :', err);
    return res.status(500).json({ error: err.message });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const groupeResult = await client.query(
      `INSERT INTO groupes_examens (hospital_id, patient_id, medecin_prescripteur)
       VALUES ($1, $2, $3) RETURNING id`,
      [req.hospitalId, parsedPatientId, medecin_prescripteur || null]
    );
    const groupeId = groupeResult.rows[0].id;

    const insertedIds = [];
    for (const ex of examens) {
      const typeExamenId = ex.type_examen_id ? parseInt(ex.type_examen_id) : null;
      if (ex.type_examen_id && isNaN(typeExamenId)) {
        throw new Error(`Le type_examen_id "${ex.type_examen_id}" n'est pas un nombre valide.`);
      }

      // ✅ FIX : préleveur filtré par tenant
      let preleveurId = null;
      if (ex.preleveur_id && ex.preleveur_id !== '0' && ex.preleveur_id !== 0) {
        const parsed = parseInt(ex.preleveur_id);
        if (!isNaN(parsed) && parsed > 0 && (await utilisateurInTenant(parsed, req.hospitalId))) {
          preleveurId = parsed;
        } else {
          console.log(`⚠️ Préleveur ID ${ex.preleveur_id} inexistant ou hors tenant, mis à NULL.`);
        }
      }

      let typeNom = ex.type_examen || 'Examen non spécifié';
      if (typeExamenId) {
        // ✅ FIX : type filtré par tenant
        const typeRes = await client.query(
          'SELECT nom FROM types_examens WHERE id = $1 AND hospital_id = $2',
          [typeExamenId, req.hospitalId]
        );
        if (typeRes.rows.length > 0) {
          typeNom = typeRes.rows[0].nom;
        } else {
          throw new Error(`Type d'examen ${typeExamenId} introuvable dans cet hôpital.`);
        }
      }

      let categorie = ex.categorie;
      if (!categorie && typeExamenId) {
        const catRes = await client.query(
          'SELECT categorie FROM types_examens WHERE id = $1 AND hospital_id = $2',
          [typeExamenId, req.hospitalId]
        );
        if (catRes.rows.length > 0) categorie = catRes.rows[0].categorie;
      }

      const type_prelevement = ex.type_prelevement || null;
      const date_prelevement = ex.date_prelevement || null;
      const date_demande = new Date().toISOString().split('T')[0];

      const result = await client.query(
        `INSERT INTO examens 
         (hospital_id, patient_id, type_examen_id, type_examen, categorie, description, date_demande, date_prevue,
          medecin_prescripteur, statut, notes, priorite, instructions_preparation, groupe_id,
          parametres, type_prelevement, date_prelevement, preleveur_id, service_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING id`,
        [
          req.hospitalId,
          parsedPatientId,
          typeExamenId,
          typeNom,
          categorie || null,
          ex.description || null,
          date_demande,
          ex.date_prevue || null,
          medecin_prescripteur || null,
          normalizeStatut('demandé'),
          ex.notes || null,
          ex.priorite || 'normal',
          ex.instructions_preparation || null,
          groupeId,
          JSON.stringify(ex.parametres || []),
          type_prelevement,
          date_prelevement,
          preleveurId,
          parsedServiceId
        ]
      );
      insertedIds.push(result.rows[0].id);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `${insertedIds.length} examen(s) créé(s) avec succès`,
      groupeId,
      examensIds: insertedIds
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Erreur création groupe examens :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// LISTE AVEC PAGINATION
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'date_demande',
      order = 'DESC',
      patient_id,
      statut,
      categorie,
      priorite,
      search,
      date_debut,
      date_fin
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let idx = 1;
    const whereClauses = [];

    // ✅ FIX : filtre tenant toujours en premier
    whereClauses.push(`e.hospital_id = $${idx++}`);
    params.push(req.hospitalId);

    if (patient_id) {
      whereClauses.push(`e.patient_id = $${idx++}`);
      params.push(patient_id);
    }
    if (statut) {
      whereClauses.push(`e.statut = $${idx++}`);
      params.push(normalizeStatut(statut));
    }
    if (categorie) {
      whereClauses.push(`e.categorie = $${idx++}`);
      params.push(categorie);
    }
    if (priorite) {
      whereClauses.push(`COALESCE(e.priorite, 'normal') = $${idx++}`);
      params.push(priorite);
    }
    if (search) {
      whereClauses.push(`(p.nom ILIKE $${idx} OR p.prenom ILIKE $${idx} OR t.nom ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (date_debut) {
      whereClauses.push(`e.date_demande >= $${idx++}`);
      params.push(date_debut);
    }
    if (date_fin) {
      whereClauses.push(`e.date_demande <= $${idx++}`);
      params.push(date_fin);
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const allowedSortFields = ['id', 'date_demande', 'date_prevue', 'statut', 'priorite'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'date_demande';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT e.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom,
             t.nom AS type_examen_nom
      FROM examens e
      LEFT JOIN patients p ON e.patient_id = p.id
      LEFT JOIN types_examens t ON e.type_examen_id = t.id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), offset);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM examens e
      LEFT JOIN patients p ON e.patient_id = p.id
      LEFT JOIN types_examens t ON e.type_examen_id = t.id
      ${whereClause}
    `;
    const countParams = params.slice(0, -2);
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const { rows } = await pool.query(query, params);

    res.json({
      rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('GET /examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DÉTAIL
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT e.*, 
              p.nom AS patient_nom, p.prenom AS patient_prenom,
              t.nom AS type_examen_nom,
              u.nom AS technicien_nom, u.prenom AS technicien_prenom,
              b.nom AS biologiste_nom, b.prenom AS biologiste_prenom,
              s.nom AS service_nom
       FROM examens e
       LEFT JOIN patients p ON e.patient_id = p.id
       LEFT JOIN types_examens t ON e.type_examen_id = t.id
       LEFT JOIN utilisateurs u ON e.technicien_id = u.id
       LEFT JOIN utilisateurs b ON e.biologiste_id = b.id
       LEFT JOIN services s ON e.service_id = s.id
       WHERE e.id = $1 AND e.hospital_id = $2`,
      [id, req.hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    const examen = rows[0];

    const resultats = await pool.query(
      `SELECT * FROM resultats_examens WHERE examen_id = $1 AND hospital_id = $2 ORDER BY id`,
      [id, req.hospitalId]
    );

    if (resultats.rows.length > 0) {
      examen.parametres = resultats.rows;
    } else {
      let params = examen.parametres;
      if (typeof params === 'string') {
        try { params = JSON.parse(params); } catch { params = []; }
      }
      examen.parametres = params || [];
    }

    res.json(examen);
  } catch (err) {
    console.error('GET /examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// HISTORIQUE
// ============================================================
router.get('/:id/historique', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await examenInTenant(id, req.hospitalId))) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    const { rows } = await pool.query(
      `SELECT * FROM historique_examens
       WHERE examen_id = $1 AND hospital_id = $2
       ORDER BY date_modification DESC`,
      [id, req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/:id/historique :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PDF
// ============================================================
router.get('/:id/pdf', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_secrete_tres_longue_et_difficile_a_deviner';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // ✅ FIX : récupérer le tenant depuis le token
    req.hospitalId = decoded.hospital_id || decoded.hospitalId;
    if (!req.hospitalId) {
      return res.status(403).json({ error: 'TENANT_MISSING', message: 'Token sans hospital_id' });
    }

    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT e.*, 
              p.nom AS patient_nom, p.prenom AS patient_prenom,
              t.nom AS type_examen_nom,
              u.nom AS technicien_nom, u.prenom AS technicien_prenom,
              b.nom AS biologiste_nom, b.prenom AS biologiste_prenom,
              s.nom AS service_nom
       FROM examens e
       LEFT JOIN patients p ON e.patient_id = p.id
       LEFT JOIN types_examens t ON e.type_examen_id = t.id
       LEFT JOIN utilisateurs u ON e.technicien_id = u.id
       LEFT JOIN utilisateurs b ON e.biologiste_id = b.id
       LEFT JOIN services s ON e.service_id = s.id
       WHERE e.id = $1 AND e.hospital_id = $2`,
      [id, req.hospitalId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    const examen = rows[0];

    const resultats = await pool.query(
      `SELECT * FROM resultats_examens WHERE examen_id = $1 AND hospital_id = $2 ORDER BY id`,
      [id, req.hospitalId]
    );
    examen.parametres = resultats.rows;

    let pdfBuffer;
    try {
      pdfBuffer = await generateExamPDF(examen);
    } catch (pdfErr) {
      console.error('❌ Erreur dans generateExamPDF :', pdfErr);
      return res.status(500).json({
        error: 'Erreur lors de la génération du PDF',
        details: pdfErr.message
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=examen_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('❌ Erreur génération PDF :', err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
  }
});

// ============================================================
// POST /examens (individuel)
// ============================================================
router.post('/', authenticate, requireHospital, async (req, res) => {
  try {
    const {
      patient_id,
      type_examen_id,
      categorie,
      description,
      date_demande,
      date_prevue,
      medecin_prescripteur,
      statut,
      notes,
      priorite = 'normal',
      instructions_preparation,
      type_prelevement,
      date_prelevement,
      preleveur_id,
      parametres,
      service_id
    } = req.body;

    // ✅ FIX : patient obligatoire et vérifié dans le tenant
    if (!patient_id) {
      return res.status(400).json({ error: 'Le patient est requis' });
    }
    if (!(await patientInTenant(patient_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    if (type_examen_id && !(await typeExamenInTenant(type_examen_id, req.hospitalId))) {
      return res.status(404).json({ error: "Type d'examen non trouvé" });
    }
    if (service_id && !(await serviceInTenant(service_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    let parsedPreleveurId = null;
    if (preleveur_id && preleveur_id !== '0' && preleveur_id !== 0) {
      const parsed = parseInt(preleveur_id);
      if (!isNaN(parsed) && parsed > 0 && (await utilisateurInTenant(parsed, req.hospitalId))) {
        parsedPreleveurId = parsed;
      } else {
        console.log(`⚠️ Préleveur ID ${preleveur_id} inexistant ou hors tenant, mis à NULL.`);
      }
    }

    let typeNom = 'Examen non spécifié';
    if (type_examen_id) {
      const typeRes = await pool.query(
        'SELECT nom FROM types_examens WHERE id = $1 AND hospital_id = $2',
        [type_examen_id, req.hospitalId]
      );
      if (typeRes.rows.length > 0) typeNom = typeRes.rows[0].nom;
    } else if (req.body.type_examen) {
      typeNom = req.body.type_examen;
    }

    const statutNormalized = normalizeStatut(statut || 'demandé');

    const { rows } = await pool.query(
      `INSERT INTO examens 
       (hospital_id, patient_id, type_examen_id, type_examen, categorie, description, date_demande, date_prevue,
        medecin_prescripteur, statut, notes, priorite,
        instructions_preparation, type_prelevement, date_prelevement, preleveur_id,
        parametres, service_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        req.hospitalId,
        patient_id,
        type_examen_id || null,
        typeNom,
        categorie,
        description,
        date_demande || new Date().toISOString().split('T')[0],
        date_prevue || null,
        medecin_prescripteur || null,
        statutNormalized,
        notes || null,
        priorite,
        instructions_preparation || null,
        type_prelevement || null,
        date_prelevement || null,
        parsedPreleveurId,
        JSON.stringify(parametres || []),
        service_id || null
      ]
    );

    await pool.query(
      `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.hospitalId, rows[0].id, req.user.id, 'creation', '', 'Création de l\'examen']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /examens error:', err);
    console.error('📦 Données reçues :', req.body);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /examens/:id
// ============================================================
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id,
      type_examen_id,
      categorie,
      description,
      date_demande,
      date_prevue,
      medecin_prescripteur,
      statut,
      notes,
      priorite,
      instructions_preparation,
      type_prelevement,
      date_prelevement,
      preleveur_id,
      parametres,
      service_id
    } = req.body;

    // ✅ FIX : old scopé tenant
    const old = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (old.rows.length === 0) return res.status(404).json({ error: 'Examen non trouvé' });
    const oldData = old.rows[0];

    // ✅ FIX : vérifier patient / type / service / préleveur dans le tenant
    if (patient_id && !(await patientInTenant(patient_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }
    if (type_examen_id && !(await typeExamenInTenant(type_examen_id, req.hospitalId))) {
      return res.status(404).json({ error: "Type d'examen non trouvé" });
    }
    if (service_id && !(await serviceInTenant(service_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }
    if (preleveur_id && !(await utilisateurInTenant(preleveur_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Préleveur non trouvé' });
    }

    const statutNormalized = statut ? normalizeStatut(statut) : oldData.statut;

    // ✅ FIX : UPDATE scopé tenant
    const { rows } = await pool.query(
      `UPDATE examens 
       SET patient_id = $1, type_examen_id = $2, categorie = $3,
           description = $4, date_demande = $5, date_prevue = $6,
           medecin_prescripteur = $7, statut = $8, notes = $9,
           priorite = $10, instructions_preparation = $11,
           type_prelevement = $12, date_prelevement = $13, preleveur_id = $14,
           parametres = $15, service_id = $16,
           updated_at = NOW()
       WHERE id = $17 AND hospital_id = $18
       RETURNING *`,
      [
        patient_id,
        type_examen_id,
        categorie,
        description,
        date_demande,
        date_prevue,
        medecin_prescripteur,
        statutNormalized,
        notes,
        priorite,
        instructions_preparation,
        type_prelevement,
        date_prelevement,
        preleveur_id,
        JSON.stringify(parametres || []),
        service_id,
        id,
        req.hospitalId
      ]
    );

    const fields = ['patient_id', 'type_examen_id', 'categorie', 'description', 'date_demande', 'date_prevue',
      'medecin_prescripteur', 'statut', 'notes', 'priorite', 'instructions_preparation',
      'type_prelevement', 'date_prelevement', 'preleveur_id', 'parametres', 'service_id'];
    for (const field of fields) {
      const oldVal = oldData[field];
      const newVal = rows[0][field];
      if (field === 'parametres') {
        const oldStr = JSON.stringify(oldVal || []);
        const newStr = JSON.stringify(newVal || []);
        if (oldStr !== newStr) {
          await pool.query(
            `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.hospitalId, id, req.user.id, field, oldStr, newStr]
          );
        }
      } else if (oldVal !== newVal) {
        await pool.query(
          `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.hospitalId, id, req.user.id, field, String(oldVal || ''), String(newVal || '')]
        );
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /examens/:id/resultats
// ============================================================
router.put('/:id/resultats', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { parametres, statut, commentaire_global } = req.body;

    const examenCheck = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (examenCheck.rows.length === 0) return res.status(404).json({ error: 'Examen non trouvé' });

    const statutNormalized = normalizeStatut(statut || examenCheck.rows[0].statut);

    await pool.query(
      `UPDATE examens 
       SET statut = $1,
           commentaire_global = COALESCE($2, commentaire_global),
           date_resultats = NOW(),
           technicien_id = $3,
           date_saisie = NOW(),
           updated_at = NOW()
       WHERE id = $4 AND hospital_id = $5`,
      [statutNormalized, commentaire_global || null, req.user.id, id, req.hospitalId]
    );

    if (parametres && parametres.length > 0) {
      // ✅ FIX : DELETE scopé tenant
      await pool.query(
        'DELETE FROM resultats_examens WHERE examen_id = $1 AND hospital_id = $2',
        [id, req.hospitalId]
      );
      for (const p of parametres) {
        await pool.query(
          `INSERT INTO resultats_examens 
           (hospital_id, examen_id, parametre_nom, valeur, unite, ref_min, ref_max, interpretation, commentaire)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [req.hospitalId, id, p.nom || p.parametre_nom, p.valeur, p.unite, p.ref_min, p.ref_max, p.interpretation, p.commentaire || null]
        );
      }
    }

    await pool.query(
      `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.hospitalId, id, req.user.id, 'resultats', '', 'Saisie des résultats']
    );

    const { rows } = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/resultats :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /examens/:id/validation
// ============================================================
router.put('/:id/validation', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire_validation } = req.body;

    const examenCheck = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (examenCheck.rows.length === 0) return res.status(404).json({ error: 'Examen non trouvé' });

    await pool.query(
      `UPDATE examens 
       SET statut = 'realise',
           commentaire_validation = COALESCE($1, commentaire_validation),
           date_validation = NOW(),
           biologiste_id = $2,
           updated_at = NOW()
       WHERE id = $3 AND hospital_id = $4`,
      [commentaire_validation || null, req.user.id, id, req.hospitalId]
    );

    await pool.query(
      `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.hospitalId, id, req.user.id, 'validation', '', 'Validation de l\'examen']
    );

    const { rows } = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/validation :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /examens/:id/reopen
// ============================================================
router.put('/:id/reopen', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const examenCheck = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (examenCheck.rows.length === 0) return res.status(404).json({ error: 'Examen non trouvé' });
    if (examenCheck.rows[0].statut !== 'realise') {
      return res.status(400).json({ error: 'Seul un examen réalisé peut être réouvert' });
    }

    await pool.query(
      `UPDATE examens 
       SET statut = 'en_cours',
           date_validation = NULL,
           biologiste_id = NULL,
           updated_at = NOW()
       WHERE id = $1 AND hospital_id = $2`,
      [id, req.hospitalId]
    );

    await pool.query(
      `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.hospitalId, id, req.user.id, 'reopen', 'realise', 'Réouverture de l\'examen']
    );

    const { rows } = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/reopen :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /examens/:id/annuler
// ============================================================
router.put('/:id/annuler', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const examenCheck = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (examenCheck.rows.length === 0) return res.status(404).json({ error: 'Examen non trouvé' });

    await pool.query(
      `UPDATE examens 
       SET statut = 'annule',
           motif_annulation = COALESCE($1, motif_annulation),
           date_annulation = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND hospital_id = $3`,
      [motif || null, id, req.hospitalId]
    );

    await pool.query(
      `INSERT INTO historique_examens (hospital_id, examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.hospitalId, id, req.user.id, 'annulation', '', `Annulation - motif: ${motif || 'non précisé'}`]
    );

    const { rows } = await pool.query(
      'SELECT * FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/annuler :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /examens/:id
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIX : vérifier l'appartenance AVANT suppression en cascade
    const check = await pool.query(
      'SELECT id FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (check.rowCount === 0) return res.status(404).json({ error: 'Examen non trouvé' });

    await pool.query(
      'DELETE FROM resultats_examens WHERE examen_id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    await pool.query(
      'DELETE FROM historique_examens WHERE examen_id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    await pool.query(
      'DELETE FROM examens WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  STATISTIQUES
// ============================================================

router.get('/stats/mensuelles', authenticate, requireHospital, async (req, res) => {
  try {
    const period = parseInt(req.query.period) || 12;
    const query = `
      SELECT 
        TO_CHAR(date_demande, 'YYYY-MM') AS mois,
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(priorite, 'normal') = 'urgent' THEN 1 ELSE 0 END) AS urgents,
        SUM(CASE WHEN statut = 'realise' THEN 1 ELSE 0 END) AS realizes
      FROM examens
      WHERE date_demande >= CURRENT_DATE - INTERVAL '${period} months'
        AND hospital_id = $1
      GROUP BY mois
      ORDER BY mois ASC
    `;
    const { rows } = await pool.query(query, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/stats/mensuelles :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/globales', authenticate, requireHospital, async (req, res) => {
  try {
    const h = req.hospitalId;
    const total = await pool.query('SELECT COUNT(*) FROM examens WHERE hospital_id = $1', [h]);
    const en_attente = await pool.query('SELECT COUNT(*) FROM examens WHERE statut = $1 AND hospital_id = $2', ['en_attente', h]);
    const en_cours = await pool.query('SELECT COUNT(*) FROM examens WHERE statut = $1 AND hospital_id = $2', ['en_cours', h]);
    const realise = await pool.query('SELECT COUNT(*) FROM examens WHERE statut = $1 AND hospital_id = $2', ['realise', h]);
    const annule = await pool.query('SELECT COUNT(*) FROM examens WHERE statut = $1 AND hospital_id = $2', ['annule', h]);
    const valide = await pool.query('SELECT COUNT(*) FROM examens WHERE date_validation IS NOT NULL AND hospital_id = $1', [h]);

    const parCategorie = await pool.query(`
      SELECT categorie, COUNT(*) AS total
      FROM examens
      WHERE categorie IS NOT NULL AND hospital_id = $1
      GROUP BY categorie
    `, [h]);

    const result = {
      total: parseInt(total.rows[0].count),
      en_attente: parseInt(en_attente.rows[0].count),
      en_cours: parseInt(en_cours.rows[0].count),
      realise: parseInt(realise.rows[0].count),
      annule: parseInt(annule.rows[0].count),
      valide: parseInt(valide.rows[0].count),
      par_categorie: parCategorie.rows.reduce((acc, row) => {
        acc[row.categorie] = parseInt(row.total);
        return acc;
      }, {})
    };

    res.json(result);
  } catch (err) {
    console.error('GET /examens/stats/globales :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/par-service', authenticate, requireHospital, async (req, res) => {
  try {
    const query = `
      SELECT s.nom AS service, COUNT(e.id) AS total
      FROM examens e
      LEFT JOIN services s ON e.service_id = s.id
      WHERE e.service_id IS NOT NULL AND e.hospital_id = $1
      GROUP BY s.nom
      ORDER BY total DESC
      LIMIT 10
    `;
    const { rows } = await pool.query(query, [req.hospitalId]);

    const sansService = await pool.query(
      'SELECT COUNT(*) FROM examens WHERE service_id IS NULL AND hospital_id = $1',
      [req.hospitalId]
    );
    if (parseInt(sansService.rows[0].count) > 0) {
      rows.push({ service: 'Non spécifié', total: parseInt(sansService.rows[0].count) });
    }

    res.json(rows);
  } catch (err) {
    console.error('GET /examens/stats/par-service :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats/par-medecin', authenticate, requireHospital, async (req, res) => {
  try {
    const query = `
      SELECT medecin_prescripteur AS medecin, COUNT(*) AS total
      FROM examens
      WHERE medecin_prescripteur IS NOT NULL AND hospital_id = $1
      GROUP BY medecin_prescripteur
      ORDER BY total DESC
      LIMIT 10
    `;
    const { rows } = await pool.query(query, [req.hospitalId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/stats/par-medecin :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;