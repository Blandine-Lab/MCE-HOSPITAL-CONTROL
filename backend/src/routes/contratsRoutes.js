// src/routes/contratsRoutes.js
// ============================================================
// 🏥 RH – Contrats (CRUD + PDF + transactions)
// ------------------------------------------------------------
// ⚠️ FIX :
//   1. Pool patché de config/db.js (ALS + set_config auto)
//   2. set_config manuel dans CHAQUE transaction
//   3. hospital_id explicite dans TOUS les INSERT
//   4. ROLLBACK avant chaque return 404 dans une transaction
//   5. requireHospital + WHERE hospital_id = $1 sur TOUTES les routes
//   6. Vérification employe_id / modele_id / contrat appartenant au tenant
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

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
async function employeInTenant(employeId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM employes WHERE id = $1 AND hospital_id = $2',
    [employeId, hospitalId]
  );
  return rowCount > 0;
}

async function contratInTenant(contratId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM contrats WHERE id = $1 AND hospital_id = $2',
    [contratId, hospitalId]
  );
  return rowCount > 0;
}

// Vérifie si modeles_contrats porte une colonne hospital_id (templates par hôpital)
let _modelesHasHospitalCol = null;
async function modelesHasHospitalCol(client = pool) {
  if (_modelesHasHospitalCol !== null) return _modelesHasHospitalCol;
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'modeles_contrats' AND column_name = 'hospital_id'
    ) AS has
  `);
  _modelesHasHospitalCol = rows[0].has === true;
  return _modelesHasHospitalCol;
}

// ============================================================
// 1. GET /contrats — Liste des contrats (scopé au tenant)
// ============================================================
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, e.nom AS employe_nom, e.prenom AS employe_prenom
       FROM contrats c
       LEFT JOIN employes e ON c.employe_id = e.id
       WHERE c.hospital_id = $1
       ORDER BY c.date_debut DESC`,
      [req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /contrats :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 2. GET /contrats/modeles-contrats — Liste des modèles
// ============================================================
router.get('/modeles-contrats', authenticate, requireHospital, async (req, res) => {
  try {
    console.log('🔍 Récupération des modèles...');
    const hasHospitalCol = await modelesHasHospitalCol();
    let rows;
    if (hasHospitalCol) {
      ({ rows } = await pool.query(
        `SELECT * FROM modeles_contrats WHERE hospital_id = $1 ORDER BY nom`,
        [req.hospitalId]
      ));
    } else {
      // ⚠️ Table globale (templates partagés) — à confirmer métier
      ({ rows } = await pool.query(`SELECT * FROM modeles_contrats ORDER BY nom`));
    }
    console.log(`✅ ${rows.length} modèles trouvés`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur GET /modeles-contrats :', err);
    res.status(500).json({
      error: 'Erreur lors de la récupération des modèles',
      detail: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ============================================================
// 3. GET /contrats/employe/:employeId — Contrats d'un employé
// ============================================================
router.get('/employe/:employeId', authenticate, requireHospital, async (req, res) => {
  try {
    // ✅ FIX : employé du tenant
    if (!(await employeInTenant(req.params.employeId, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    const { rows } = await pool.query(
      `SELECT * FROM contrats
       WHERE employe_id = $1 AND hospital_id = $2
       ORDER BY date_debut DESC`,
      [req.params.employeId, req.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /contrats/employe/:employeId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 4. GET /contrats/generate/:employeId — PDF (simple)
// ============================================================
router.get('/generate/:employeId', authenticate, requireHospital, async (req, res) => {
  try {
    const employeId = req.params.employeId;
    // ✅ FIX : employé du tenant
    const { rows: employeRows } = await pool.query(`
      SELECT e.*, s.nom AS service_nom 
      FROM employes e
      LEFT JOIN services s ON e.service_id = s.id
      WHERE e.id = $1 AND e.hospital_id = $2
    `, [employeId, req.hospitalId]);

    if (employeRows.length === 0) return res.status(404).json({ error: 'Employé non trouvé' });
    const employe = employeRows[0];
    const salaire = employe.salaire || 2500;

    const articles = [
      "Le présent contrat est régi par le Code du travail.",
      "La période d'essai est de 2 mois renouvelable une fois.",
      `Le salaire mensuel brut est de ${salaire} €.`,
      "Les horaires de travail sont de 35 heures par semaine.",
      "Le lieu de travail est fixé à l'établissement de l'employeur.",
      "Le salarié bénéficie de 5 semaines de congés payés par an.",
    ];

    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contrat_${employe.nom}_${employe.prenom}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(20).text('CONTRAT DE TRAVAIL', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Entre les soussignés :', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`L'employeur : Hôpital MCE, représenté par Monsieur/Madame le Directeur,`);
    doc.text(`d'une part,`);
    doc.moveDown();
    doc.text(`Et le salarié : ${employe.prenom} ${employe.nom}, né(e) le ${new Date(employe.date_naissance).toLocaleDateString('fr-FR')},`);
    doc.text(`domicilié(e) à ${employe.adresse || 'non renseigné'},`);
    doc.text(`d'autre part,`);
    doc.moveDown();
    doc.text(`Il a été convenu ce qui suit :`, { underline: true });
    doc.moveDown();

    articles.forEach((art, index) => {
      doc.fontSize(12).text(`Article ${index+1} : ${art}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.text(`Fait à Kinshasa, le ${new Date().toLocaleDateString('fr-FR')}`);
    doc.moveDown();
    doc.text(`Signature de l'employeur : ___________________`);
    doc.text(`Signature du salarié : ___________________`);
    doc.end();
  } catch (err) {
    console.error('Erreur génération contrat (GET) :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 5. POST /contrats/generer — Génération à partir d'un modèle
// ============================================================
router.post('/generer', authenticate, requireHospital, async (req, res) => {
  const { employe_id, modele_id, date_debut, date_fin, salaire } = req.body;
  if (!employe_id || !modele_id) {
    return res.status(400).json({ error: 'employe_id et modele_id sont requis' });
  }

  // ✅ FIX : employé du tenant avant transaction
  if (!(await employeInTenant(employe_id, req.hospitalId))) {
    return res.status(404).json({ error: 'Employé non trouvé' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'modeles_contrats' AND column_name = 'actif'
    `);
    const hasActif = colCheck.rows.length > 0;
    const hasHosp = await modelesHasHospitalCol(client);

    let sqlModele = `SELECT id, nom FROM modeles_contrats WHERE id = $1`;
    const params = [modele_id];
    let pIdx = 2;
    if (hasActif) sqlModele += ` AND actif = true`;
    // ✅ FIX : modèle du tenant si la colonne existe
    if (hasHosp) {
      sqlModele += ` AND hospital_id = $${pIdx++}`;
      params.push(req.hospitalId);
    }

    const modeleResult = await client.query(sqlModele, params);
    if (modeleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Modèle non trouvé ou inactif' });
    }
    const modele = modeleResult.rows[0];

    const articlesResult = await client.query(
      `SELECT titre, contenu, ordre FROM articles_modeles WHERE modele_id = $1 ORDER BY ordre, id`,
      [modele_id]
    );

    const reference = `CONTRAT-${Date.now().toString(36).toUpperCase()}`;

    const contratResult = await client.query(
      `INSERT INTO contrats
        (hospital_id, employe_id, type, date_debut, date_fin, salaire, statut, reference, modele_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'actif', $7, $8)
       RETURNING id, reference, employe_id, type, date_debut, date_fin, salaire, statut, modele_id`,
      [
        req.hospitalId,
        employe_id,
        modele.nom || 'CDI',
        date_debut || new Date().toISOString().split('T')[0],
        date_fin || null,
        salaire || null,
        reference,
        modele_id,
      ]
    );
    const contrat = contratResult.rows[0];

    for (const art of articlesResult.rows) {
      await client.query(
        `INSERT INTO articles_contrats (hospital_id, contrat_id, titre, contenu, ordre)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.hospitalId, contrat.id, art.titre, art.contenu, art.ordre]
      );
    }

    const articlesInserts = await client.query(
      `SELECT id, titre, contenu, ordre
       FROM articles_contrats
       WHERE contrat_id = $1 AND hospital_id = $2
       ORDER BY ordre, id`,
      [contrat.id, req.hospitalId]
    );
    contrat.articles = articlesInserts.rows;

    await client.query('COMMIT');
    res.status(201).json({ message: 'Contrat généré avec succès', contrat });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Erreur POST /contrats/generer :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 6. GET /contrats/:id — Détail d'un contrat (avec articles)
// ============================================================
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { rows: contratRows } = await pool.query(`
      SELECT c.*, e.nom AS employe_nom, e.prenom AS employe_prenom
      FROM contrats c
      LEFT JOIN employes e ON c.employe_id = e.id
      WHERE c.id = $1 AND c.hospital_id = $2
    `, [req.params.id, req.hospitalId]);
    if (contratRows.length === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    const contrat = contratRows[0];

    const { rows: articlesRows } = await pool.query(
      `SELECT id, titre, contenu, ordre
       FROM articles_contrats
       WHERE contrat_id = $1 AND hospital_id = $2
       ORDER BY ordre, id`,
      [req.params.id, req.hospitalId]
    );
    contrat.articles = articlesRows;
    res.json(contrat);
  } catch (err) {
    console.error('Erreur GET /contrats/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 7. POST /contrats — Créer un contrat
// ============================================================
router.post('/', authenticate, requireHospital, async (req, res) => {
  const { employe_id, type, date_debut, date_fin, salaire, statut, commentaire } = req.body;
  try {
    if (!employe_id) {
      return res.status(400).json({ error: 'employe_id est requis' });
    }
    // ✅ FIX : employé du tenant
    if (!(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    const { rows } = await pool.query(`
      INSERT INTO contrats (hospital_id, employe_id, type, date_debut, date_fin, salaire, statut, commentaire)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.hospitalId, employe_id, type, date_debut, date_fin, salaire, statut || 'actif', commentaire]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /contrats :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 8. PUT /contrats/:id — Modifier un contrat
// ============================================================
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  const { employe_id, type, date_debut, date_fin, salaire, statut, commentaire } = req.body;
  try {
    // ✅ FIX : contrat du tenant
    if (!(await contratInTenant(req.params.id, req.hospitalId))) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }
    // ✅ FIX : employé cible du tenant
    if (employe_id && !(await employeInTenant(employe_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const { rows } = await pool.query(`
      UPDATE contrats 
      SET employe_id = $1, type = $2, date_debut = $3, date_fin = $4, 
          salaire = $5, statut = $6, commentaire = $7, updated_at = NOW()
      WHERE id = $8 AND hospital_id = $9
      RETURNING *
    `, [employe_id, type, date_debut, date_fin, salaire, statut, commentaire, req.params.id, req.hospitalId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /contrats/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 9. DELETE /contrats/:id — Supprimer un contrat (admin)
// ============================================================
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    // ✅ FIX : suppression scopée tenant (contrat + articles liés)
    const { rowCount } = await pool.query(
      'DELETE FROM contrats WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    // cascade articles (si pas de FK ON DELETE CASCADE)
    await pool.query(
      'DELETE FROM articles_contrats WHERE contrat_id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error('Erreur DELETE /contrats/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 10. PUT /contrats/:id/articles — Mise à jour des articles
// ============================================================
router.put('/:id/articles', authenticate, requireHospital, async (req, res) => {
  const { articles } = req.body;
  if (!articles || !Array.isArray(articles)) {
    return res.status(400).json({ error: 'Le tableau "articles" est requis' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    // ✅ FIX : contrat du tenant
    const contratCheck = await client.query(
      'SELECT id FROM contrats WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (contratCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }
    for (const art of articles) {
      if (art.id) {
        await client.query(
          `UPDATE articles_contrats
           SET titre = $1, contenu = $2, ordre = $3
           WHERE id = $4 AND contrat_id = $5 AND hospital_id = $6`,
          [art.titre, art.contenu, art.ordre, art.id, req.params.id, req.hospitalId]
        );
      } else {
        await client.query(
          `INSERT INTO articles_contrats (hospital_id, contrat_id, titre, contenu, ordre)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.hospitalId, req.params.id, art.titre, art.contenu, art.ordre]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Articles mis à jour avec succès' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Erreur PUT /contrats/:id/articles :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 11. POST /contrats/generate/:employeId — PDF personnalisé
// ============================================================
router.post('/generate/:employeId', authenticate, requireHospital, async (req, res) => {
  try {
    const employeId = req.params.employeId;
    const { articles, salaire, employe: employeData } = req.body;
    let employe = employeData;
    if (!employe) {
      // ✅ FIX : employé du tenant
      const { rows } = await pool.query(`
        SELECT e.*, s.nom AS service_nom 
        FROM employes e
        LEFT JOIN services s ON e.service_id = s.id
        WHERE e.id = $1 AND e.hospital_id = $2
      `, [employeId, req.hospitalId]);
      if (rows.length === 0) return res.status(404).json({ error: 'Employé non trouvé' });
      employe = rows[0];
    }
    const salaireFinal = salaire || employe.salaire || 2500;
    const articlesFinal = (articles && articles.length > 0)
      ? articles.map(a => a.texte)
      : [
          "Le présent contrat est régi par le Code du travail.",
          "La période d'essai est de 2 mois renouvelable une fois.",
          `Le salaire mensuel brut est de ${salaireFinal} €.`,
          "Les horaires de travail sont de 35 heures par semaine.",
          "Le lieu de travail est fixé à l'établissement de l'employeur.",
          "Le salarié bénéficie de 5 semaines de congés payés par an."
        ];

    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contrat_${employe.nom}_${employe.prenom}.pdf`);
      res.send(pdfData);
    });

    doc.fontSize(20).text('CONTRAT DE TRAVAIL', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Entre les soussignés :', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`L'employeur : Hôpital MCE, représenté par Monsieur/Madame le Directeur,`);
    doc.text(`d'une part,`);
    doc.moveDown();
    doc.text(`Et le salarié : ${employe.prenom} ${employe.nom}, né(e) le ${employe.date_naissance ? new Date(employe.date_naissance).toLocaleDateString('fr-FR') : 'non renseigné'},`);
    doc.text(`domicilié(e) à ${employe.adresse || 'non renseigné'},`);
    doc.text(`d'autre part,`);
    doc.moveDown();
    doc.text(`Il a été convenu ce qui suit :`, { underline: true });
    doc.moveDown();

    articlesFinal.forEach((art, index) => {
      doc.fontSize(12).text(`Article ${index+1} : ${art}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.text(`Fait à Kinshasa, le ${new Date().toLocaleDateString('fr-FR')}`);
    doc.moveDown();
    doc.text(`Signature de l'employeur : ___________________`);
    doc.text(`Signature du salarié : ___________________`);
    doc.end();
  } catch (err) {
    console.error('Erreur génération contrat personnalisé (POST) :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;