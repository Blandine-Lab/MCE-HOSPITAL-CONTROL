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

// GET /contrats/:id - Détail d'un contrat
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, 
             e.nom AS employe_nom, 
             e.prenom AS employe_prenom
      FROM contrats c
      LEFT JOIN employes e ON c.employe_id = e.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    res.json(rows[0]);
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

// ✅ DELETE /contrats/:id - Supprimer un contrat (réservé aux administrateurs)
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
// ========== GÉNÉRATION DE CONTRAT EN PDF ====================
// ========== Version personnalisée (POST) ====================
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

    // Utiliser le salaire fourni ou celui de l'employé
    const salaireFinal = salaire || employe.salaire || 2500;

    // Définir les articles par défaut si non fournis
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

    // Créer le PDF
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contrat_${employe.nom}_${employe.prenom}.pdf`);
      res.send(pdfData);
    });

    // En-tête
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

    // Articles
    articlesFinal.forEach((art, index) => {
      doc.fontSize(12).text(`Article ${index+1} : ${art}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    // Date et signature
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

    // Récupérer les infos de l'employé
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

    // Articles par défaut
    const articles = [
      "Le présent contrat est régi par le Code du travail.",
      "La période d'essai est de 2 mois renouvelable une fois.",
      `Le salaire mensuel brut est de ${salaire} €.`,
      "Les horaires de travail sont de 35 heures par semaine.",
      "Le lieu de travail est fixé à l'établissement de l'employeur.",
      "Le salarié bénéficie de 5 semaines de congés payés par an.",
    ];

    // Créer le PDF
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=contrat_${employe.nom}_${employe.prenom}.pdf`);
      res.send(pdfData);
    });

    // En-tête
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

    // Articles
    articles.forEach((art, index) => {
      doc.fontSize(12).text(`Article ${index+1} : ${art}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    // Date et signature
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