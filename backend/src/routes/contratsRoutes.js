const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');
const PDFDocument = require('pdfkit'); // npm install pdfkit

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ RH - Contrats : connecté à PostgreSQL'));

// ============================================================
// ========== ROUTES EXISTANTES (conservées) ===================
// ============================================================

// GET /contrats - Liste de tous les contrats (avec infos employé)
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, 
             e.nom AS employe_nom, 
             e.prenom AS employe_prenom
      FROM contrats c
      LEFT JOIN employes e ON c.employe_id = e.id
      ORDER BY c.date_debut DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /contrats :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /contrats/:id - Détail d'un contrat (avec articles)
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Récupérer le contrat + infos employé
    const { rows: contratRows } = await pool.query(`
      SELECT c.*, 
             e.nom AS employe_nom, 
             e.prenom AS employe_prenom
      FROM contrats c
      LEFT JOIN employes e ON c.employe_id = e.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (contratRows.length === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    const contrat = contratRows[0];

    // Récupérer les articles du contrat
    const { rows: articlesRows } = await pool.query(`
      SELECT id, titre, contenu, ordre
      FROM articles_contrats
      WHERE contrat_id = $1
      ORDER BY ordre, id
    `, [req.params.id]);
    contrat.articles = articlesRows;

    res.json(contrat);
  } catch (err) {
    console.error('Erreur GET /contrats/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /contrats/employe/:employeId - Tous les contrats d'un employé
router.get('/employe/:employeId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM contrats WHERE employe_id = $1 ORDER BY date_debut DESC
    `, [req.params.employeId]);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /contrats/employe/:employeId :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /contrats - Créer un contrat
router.post('/', authenticate, async (req, res) => {
  const { employe_id, type, date_debut, date_fin, salaire, statut, commentaire } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO contrats (employe_id, type, date_debut, date_fin, salaire, statut, commentaire)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [employe_id, type, date_debut, date_fin, salaire, statut || 'actif', commentaire]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Erreur POST /contrats :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /contrats/:id - Modifier un contrat
router.put('/:id', authenticate, async (req, res) => {
  const { employe_id, type, date_debut, date_fin, salaire, statut, commentaire } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE contrats 
      SET employe_id = $1, type = $2, date_debut = $3, date_fin = $4, 
          salaire = $5, statut = $6, commentaire = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [employe_id, type, date_debut, date_fin, salaire, statut, commentaire, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur PUT /contrats/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /contrats/:id - Supprimer un contrat (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM contrats WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    console.error('Erreur DELETE /contrats/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ========== NOUVELLES ROUTES POUR MODÈLES ET GÉNÉRATION =====
// ============================================================

// GET /modeles-contrats - Liste des modèles de contrat
router.get('/modeles-contrats', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nom, description, actif, created_at
      FROM modeles_contrats
      WHERE actif = true
      ORDER BY nom
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur GET /modeles-contrats :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /contrats/generer - Générer un contrat à partir d'un modèle
router.post('/generer', authenticate, async (req, res) => {
  const { employe_id, modele_id, date_debut, date_fin, salaire } = req.body;

  if (!employe_id || !modele_id) {
    return res.status(400).json({ error: 'employe_id et modele_id sont requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Récupérer le modèle de contrat
    const modeleResult = await client.query(
      `SELECT id, nom FROM modeles_contrats WHERE id = $1 AND actif = true`,
      [modele_id]
    );
    if (modeleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Modèle de contrat non trouvé ou inactif' });
    }
    const modele = modeleResult.rows[0];

    // 2. Récupérer les articles du modèle
    const articlesResult = await client.query(
      `SELECT titre, contenu, ordre
       FROM articles_modeles
       WHERE modele_id = $1
       ORDER BY ordre, id`,
      [modele_id]
    );

    // 3. Générer une référence unique
    const reference = `CONTRAT-${Date.now().toString(36).toUpperCase()}`;

    // 4. Insérer le contrat
    const contratResult = await client.query(
      `INSERT INTO contrats
        (employe_id, type, date_debut, date_fin, salaire, statut, reference, modele_id)
       VALUES ($1, $2, $3, $4, $5, 'actif', $6, $7)
       RETURNING id, reference, employe_id, type, date_debut, date_fin, salaire, statut, modele_id`,
      [
        employe_id,
        modele.nom || 'CDI',
        date_debut || new Date().toISOString().split('T')[0],
        date_fin || null,
        salaire || null,
        reference,
        modele_id
      ]
    );
    const contrat = contratResult.rows[0];

    // 5. Copier les articles du modèle vers les articles du contrat
    for (const art of articlesResult.rows) {
      await client.query(
        `INSERT INTO articles_contrats (contrat_id, titre, contenu, ordre)
         VALUES ($1, $2, $3, $4)`,
        [contrat.id, art.titre, art.contenu, art.ordre]
      );
    }

    // 6. Récupérer les articles insérés
    const articlesInserts = await client.query(
      `SELECT id, titre, contenu, ordre
       FROM articles_contrats
       WHERE contrat_id = $1
       ORDER BY ordre, id`,
      [contrat.id]
    );
    contrat.articles = articlesInserts.rows;

    await client.query('COMMIT');
    res.status(201).json({ message: 'Contrat généré avec succès', contrat });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST /contrats/generer :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /contrats/:id/articles - Mettre à jour les articles d'un contrat (pour l'édition)
router.put('/:id/articles', authenticate, async (req, res) => {
  const { articles } = req.body; // articles est un tableau [{id, titre, contenu, ordre}]
  if (!articles || !Array.isArray(articles)) {
    return res.status(400).json({ error: 'Le tableau "articles" est requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vérifier que le contrat existe
    const contratCheck = await client.query('SELECT id FROM contrats WHERE id = $1', [req.params.id]);
    if (contratCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Mettre à jour chaque article (si id existe, on update, sinon on insert)
    for (const art of articles) {
      if (art.id) {
        await client.query(
          `UPDATE articles_contrats
           SET titre = $1, contenu = $2, ordre = $3
           WHERE id = $4 AND contrat_id = $5`,
          [art.titre, art.contenu, art.ordre, art.id, req.params.id]
        );
      } else {
        await client.query(
          `INSERT INTO articles_contrats (contrat_id, titre, contenu, ordre)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, art.titre, art.contenu, art.ordre]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Articles mis à jour avec succès' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur PUT /contrats/:id/articles :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// ========== GÉNÉRATION DE CONTRAT EN PDF (POST) =============
// ============================================================
router.post('/generate/:employeId', authenticate, async (req, res) => {
  try {
    const employeId = req.params.employeId;
    const { articles, salaire, type, employe: employeData } = req.body;

    // Récupérer l'employé (si non fourni dans le body)
    let employe = employeData;
    if (!employe) {
      const { rows } = await pool.query(`
        SELECT e.*, s.nom AS service_nom 
        FROM employes e
        LEFT JOIN services s ON e.service_id = s.id
        WHERE e.id = $1
      `, [employeId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Employé non trouvé' });
      }
      employe = rows[0];
    }

    const salaireFinal = salaire || employe.salaire || 2500;

    const articlesFinal = articles && articles.length > 0
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
    doc.fontSize(14).text(`Entre les soussignés :`, { underline: true });
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
    console.error('Erreur génération contrat personnalisé :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ========== GÉNÉRATION SIMPLE (GET) - pour compatibilité =====
// ============================================================
router.get('/generate/:employeId', authenticate, async (req, res) => {
  try {
    const employeId = req.params.employeId;

    const { rows: employeRows } = await pool.query(`
      SELECT e.*, s.nom AS service_nom 
      FROM employes e
      LEFT JOIN services s ON e.service_id = s.id
      WHERE e.id = $1
    `, [employeId]);

    if (employeRows.length === 0) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
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
    doc.fontSize(14).text(`Entre les soussignés :`, { underline: true });
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
    console.error('Erreur génération contrat :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;