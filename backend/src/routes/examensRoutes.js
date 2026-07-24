const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { generateExamPDF } = require('../services/pdfService');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Laboratoire - Examens : connecté à PostgreSQL'));

// ============================================================
// ROUTES SPÉCIFIQUES (doivent être placées AVANT /:id)
// ============================================================

// GET /examens/counts - Compteurs pour le menu (badges)
router.get('/counts', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE statut = 'demandé' AND COALESCE(priorite, 'normal') = 'urgent') AS urgent,
        COUNT(*) FILTER (WHERE statut = 'demandé' OR statut = 'en_cours') AS aSaisir,
        COUNT(*) FILTER (WHERE statut = 'terminé') AS aValider
      FROM examens
    `);
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

// GET /examens/recent - Derniers examens pour notifications
router.get('/recent', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, e.type_examen, e.date_demande, COALESCE(e.priorite, 'normal') AS priorite, p.nom, p.prenom
      FROM examens e
      LEFT JOIN patients p ON e.patient_id = p.id
      WHERE e.statut IN ('demandé', 'en_cours')
      ORDER BY e.date_demande DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/recent :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NOUVELLE ROUTE : Liste des examens d'un patient pour facturation
// ============================================================
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { rows } = await pool.query(`
      SELECT e.id, e.type_examen, e.categorie, e.date_demande, e.statut,
             COALESCE(e.prix,
               CASE
                 WHEN e.categorie = 'imagerie' THEN 80
                 WHEN e.categorie = 'biologie' THEN 40
                 ELSE 50
               END
             ) AS prix,
             e.description,
             e.type_examen_id
      FROM examens e
      WHERE e.patient_id = $1
        AND e.statut NOT IN ('annulé')
      ORDER BY e.date_demande DESC
    `, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// NOUVELLE ROUTE : Création groupée d'examens
// ============================================================
router.post('/groupe', authenticate, async (req, res) => {
  const {
    patient_id,
    consultation_id,
    medecin_prescripteur,
    service_id,
    examens
  } = req.body;

  if (!patient_id || !examens || examens.length === 0) {
    return res.status(400).json({ error: 'Patient et au moins un examen sont requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const groupeResult = await client.query(
      `INSERT INTO groupes_examens (patient_id, consultation_id, medecin_prescripteur, service_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [patient_id, consultation_id || null, medecin_prescripteur || null, service_id || null]
    );
    const groupeId = groupeResult.rows[0].id;

    const insertedIds = [];
    for (const ex of examens) {
      let typeNom = ex.type_examen;
      if (ex.type_examen_id && !ex.type_examen) {
        const typeRes = await client.query('SELECT nom FROM types_examens WHERE id = $1', [ex.type_examen_id]);
        if (typeRes.rows.length > 0) typeNom = typeRes.rows[0].nom;
      }

      let categorie = ex.categorie;
      if (!categorie && ex.type_examen_id) {
        const catRes = await client.query('SELECT categorie FROM types_examens WHERE id = $1', [ex.type_examen_id]);
        if (catRes.rows.length > 0) categorie = catRes.rows[0].categorie;
      }

      const result = await client.query(
        `INSERT INTO examens 
         (patient_id, type_examen, type_examen_id, categorie, description, date_demande, date_prevue,
          medecin_prescripteur, statut, notes, priorite, service_id, consultation_id,
          instructions_preparation, groupe_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [
          patient_id,
          typeNom,
          ex.type_examen_id || null,
          categorie || null,
          ex.description || null,
          new Date().toISOString().split('T')[0],
          ex.date_prevue || null,
          medecin_prescripteur || null,
          'demandé',
          ex.notes || null,
          ex.priorite || 'normal',
          service_id || null,
          consultation_id || null,
          ex.instructions_preparation || null,
          groupeId
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
    await client.query('ROLLBACK');
    console.error('Erreur création groupe examens :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /examens - Liste des examens avec pagination, filtres et tri
// ============================================================
router.get('/', authenticate, async (req, res) => {
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
      service_id,
      search,
      date_debut,
      date_fin
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let idx = 1;
    let whereClauses = [];

    if (patient_id) {
      whereClauses.push(`e.patient_id = $${idx++}`);
      params.push(patient_id);
    }
    if (statut) {
      whereClauses.push(`e.statut = $${idx++}`);
      params.push(statut);
    }
    if (categorie) {
      whereClauses.push(`e.categorie = $${idx++}`);
      params.push(categorie);
    }
    if (priorite) {
      whereClauses.push(`COALESCE(e.priorite, 'normal') = $${idx++}`);
      params.push(priorite);
    }
    if (service_id) {
      whereClauses.push(`e.service_id = $${idx++}`);
      params.push(service_id);
    }
    if (search) {
      whereClauses.push(`(p.nom ILIKE $${idx} OR p.prenom ILIKE $${idx} OR e.type_examen ILIKE $${idx})`);
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

    const allowedSortFields = ['id', 'date_demande', 'date_prevue', 'statut', 'priorite', 'type_examen', 'patient_nom'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'date_demande';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT e.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom,
             s.nom AS service_nom,
             u.nom AS technicien_nom, u.prenom AS technicien_prenom
      FROM examens e
      LEFT JOIN patients p ON e.patient_id = p.id
      LEFT JOIN services s ON e.service_id = s.id
      LEFT JOIN utilisateurs u ON e.technicien_id = u.id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(parseInt(limit), offset);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM examens e
      LEFT JOIN patients p ON e.patient_id = p.id
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
// ROUTES AVEC PARAMÈTRE ID (doivent être APRÈS les routes fixes)
// ============================================================

// GET /examens/:id - Détail d'un examen
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT e.*, 
              p.nom AS patient_nom, p.prenom AS patient_prenom,
              s.nom AS service_nom,
              u.nom AS technicien_nom, u.prenom AS technicien_prenom,
              b.nom AS biologiste_nom, b.prenom AS biologiste_prenom
       FROM examens e
       LEFT JOIN patients p ON e.patient_id = p.id
       LEFT JOIN services s ON e.service_id = s.id
       LEFT JOIN utilisateurs u ON e.technicien_id = u.id
       LEFT JOIN utilisateurs b ON e.biologiste_id = b.id
       WHERE e.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    const resultats = await pool.query(
      `SELECT * FROM resultats_examens WHERE examen_id = $1 ORDER BY id`,
      [id]
    );
    const examen = rows[0];
    examen.parametres = resultats.rows;

    res.json(examen);
  } catch (err) {
    console.error('GET /examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /examens/:id/historique - Historique des modifications
router.get('/:id/historique', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM historique_examens WHERE examen_id = $1 ORDER BY date_modification DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /examens/:id/historique :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ROUTE PDF - CORRIGÉE AVEC LOGS ET BONNE CLÉ SECRÈTE
// ============================================================
router.get('/:id/pdf', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  
  console.log('📩 Token reçu (brut) :', token ? token.substring(0, 30) + '...' : 'aucun');
  if (!token) {
    console.error('❌ Token manquant');
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_secrete_tres_longue_et_difficile_a_deviner';
    console.log('🔑 JWT_SECRET utilisé :', JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token valide, utilisateur :', decoded);
    req.user = decoded;

    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT e.*, 
              p.nom AS patient_nom, p.prenom AS patient_prenom,
              s.nom AS service_nom,
              u.nom AS technicien_nom, u.prenom AS technicien_prenom,
              b.nom AS biologiste_nom, b.prenom AS biologiste_prenom
       FROM examens e
       LEFT JOIN patients p ON e.patient_id = p.id
       LEFT JOIN services s ON e.service_id = s.id
       LEFT JOIN utilisateurs u ON e.technicien_id = u.id
       LEFT JOIN utilisateurs b ON e.biologiste_id = b.id
       WHERE e.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    const examen = rows[0];

    const resultats = await pool.query(
      `SELECT * FROM resultats_examens WHERE examen_id = $1 ORDER BY id`,
      [id]
    );
    examen.parametres = resultats.rows;

    const pdfBuffer = await generateExamPDF(examen);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=examen_${id}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Erreur génération PDF :', err);
    return res.status(401).json({ error: 'Token invalide ou expiré', details: err.message });
  }
});

// POST /examens - Création d'un examen (unitaire)
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      patient_id,
      type_examen_id,
      type_examen,
      categorie,
      description,
      date_demande,
      date_prevue,
      medecin_prescripteur,
      statut,
      notes,
      priorite = 'normal',
      service_id,
      consultation_id,
      instructions_preparation,
      type_prelevement,
      date_prelevement,
      preleveur_id
    } = req.body;

    let finalTypeExamen = type_examen;
    if (type_examen_id && !type_examen) {
      const typeRes = await pool.query('SELECT nom FROM types_examens WHERE id = $1', [type_examen_id]);
      if (typeRes.rows.length > 0) {
        finalTypeExamen = typeRes.rows[0].nom;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO examens 
       (patient_id, type_examen, type_examen_id, categorie, description, date_demande, date_prevue,
        medecin_prescripteur, statut, notes, priorite, service_id, consultation_id,
        instructions_preparation, type_prelevement, date_prelevement, preleveur_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        patient_id,
        finalTypeExamen,
        type_examen_id || null,
        categorie,
        description,
        date_demande || new Date().toISOString().split('T')[0],
        date_prevue || null,
        medecin_prescripteur || null,
        statut || 'demandé',
        notes || null,
        priorite,
        service_id || null,
        consultation_id || null,
        instructions_preparation || null,
        type_prelevement || null,
        date_prelevement || null,
        preleveur_id || null
      ]
    );

    await pool.query(
      `INSERT INTO historique_examens (examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5)`,
      [rows[0].id, req.user.id, 'creation', '', 'Création de l\'examen']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /examens :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /examens/:id - Modification d'un examen
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id,
      type_examen,
      type_examen_id,
      categorie,
      description,
      date_demande,
      date_prevue,
      medecin_prescripteur,
      statut,
      notes,
      priorite,
      service_id,
      consultation_id,
      instructions_preparation,
      type_prelevement,
      date_prelevement,
      preleveur_id
    } = req.body;

    const old = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    if (old.rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    const oldData = old.rows[0];

    const { rows } = await pool.query(
      `UPDATE examens 
       SET patient_id = $1, type_examen = $2, type_examen_id = $3, categorie = $4,
           description = $5, date_demande = $6, date_prevue = $7,
           medecin_prescripteur = $8, statut = $9, notes = $10,
           priorite = $11, service_id = $12, consultation_id = $13,
           instructions_preparation = $14, type_prelevement = $15,
           date_prelevement = $16, preleveur_id = $17, updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        patient_id,
        type_examen,
        type_examen_id,
        categorie,
        description,
        date_demande,
        date_prevue,
        medecin_prescripteur,
        statut,
        notes,
        priorite,
        service_id,
        consultation_id,
        instructions_preparation,
        type_prelevement,
        date_prelevement,
        preleveur_id,
        id
      ]
    );

    const changes = [];
    const fields = ['patient_id', 'type_examen', 'categorie', 'description', 'date_demande', 'date_prevue',
      'medecin_prescripteur', 'statut', 'notes', 'priorite', 'service_id', 'consultation_id',
      'instructions_preparation', 'type_prelevement', 'date_prelevement', 'preleveur_id'];
    for (const field of fields) {
      if (oldData[field] !== rows[0][field]) {
        changes.push({
          champ: field,
          ancienne: oldData[field],
          nouvelle: rows[0][field]
        });
      }
    }
    for (const change of changes) {
      await pool.query(
        `INSERT INTO historique_examens (examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, req.user.id, change.champ, String(change.ancienne || ''), String(change.nouvelle || '')]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /examens/:id/resultats - Saisie des résultats (avec traçabilité)
// ============================================================
router.put('/:id/resultats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { parametres, statut, commentaire_global } = req.body;

    const examenCheck = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    if (examenCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    await pool.query(
      `UPDATE examens 
       SET statut = COALESCE($1, statut),
           commentaire_global = COALESCE($2, commentaire_global),
           date_resultats = NOW(),
           technicien_id = $3,
           date_saisie = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [statut || examenCheck.rows[0].statut, commentaire_global || null, req.user.id, id]
    );

    if (parametres && parametres.length > 0) {
      await pool.query('DELETE FROM resultats_examens WHERE examen_id = $1', [id]);
      for (const p of parametres) {
        await pool.query(
          `INSERT INTO resultats_examens 
           (examen_id, parametre_nom, valeur, unite, ref_min, ref_max, interpretation, commentaire)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, p.nom, p.valeur, p.unite, p.ref_min, p.ref_max, p.interpretation, p.commentaire || null]
        );
      }
    }

    await pool.query(
      `INSERT INTO historique_examens (examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, 'resultats', '', 'Saisie des résultats']
    );

    const { rows } = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/resultats :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /examens/:id/validation - Validation par le biologiste
router.put('/:id/validation', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire_validation } = req.body;

    const examenCheck = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    if (examenCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    await pool.query(
      `UPDATE examens 
       SET statut = 'valide',
           commentaire_validation = COALESCE($1, commentaire_validation),
           date_validation = NOW(),
           biologiste_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [commentaire_validation || null, req.user.id, id]
    );

    await pool.query(
      `INSERT INTO historique_examens (examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, 'validation', '', 'Validation de l\'examen']
    );

    const { rows } = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/validation :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /examens/:id/reopen - Réouverture d'un examen validé (admin)
router.put('/:id/reopen', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const examenCheck = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    if (examenCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    if (examenCheck.rows[0].statut !== 'valide') {
      return res.status(400).json({ error: 'Seul un examen validé peut être réouvert' });
    }

    await pool.query(
      `UPDATE examens 
       SET statut = 'terminé',
           date_validation = NULL,
           biologiste_id = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO historique_examens (examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, 'reopen', 'valide', 'Réouverture de l\'examen']
    );

    const { rows } = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/reopen :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /examens/:id/annuler - Annulation d'un examen (soft delete)
router.put('/:id/annuler', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const examenCheck = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    if (examenCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }

    await pool.query(
      `UPDATE examens 
       SET statut = 'annulé',
           motif_annulation = COALESCE($1, motif_annulation),
           date_annulation = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [motif || null, id]
    );

    await pool.query(
      `INSERT INTO historique_examens (examen_id, utilisateur_id, champ, ancienne_valeur, nouvelle_valeur)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, 'annulation', '', `Annulation - motif: ${motif || 'non précisé'}`]
    );

    const { rows } = await pool.query('SELECT * FROM examens WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /examens/:id/annuler :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /examens/:id - Suppression définitive (réservée aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM resultats_examens WHERE examen_id = $1', [id]);
    await pool.query('DELETE FROM historique_examens WHERE examen_id = $1', [id]);
    const { rowCount } = await pool.query('DELETE FROM examens WHERE id = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Examen non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('DELETE /examens/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;