const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ========== ROUTES MODÈLES ==========

// GET /modeles-contrats - Liste des modèles
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*, COUNT(a.id) AS nb_articles
      FROM modeles_contrats m
      LEFT JOIN articles_contrat a ON m.id = a.modele_id
      GROUP BY m.id
      ORDER BY m.nom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /modeles-contrats/:id - Détail d'un modèle avec ses articles
router.get('/:id', authenticate, async (req, res) => {
  try {
    const modele = await pool.query(
      'SELECT * FROM modeles_contrats WHERE id = $1',
      [req.params.id]
    );
    if (modele.rows.length === 0) return res.status(404).json({ error: 'Modèle non trouvé' });
    
    const articles = await pool.query(
      'SELECT * FROM articles_contrat WHERE modele_id = $1 ORDER BY ordre',
      [req.params.id]
    );
    
    res.json({ ...modele.rows[0], articles: articles.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /modeles-contrats - Créer un modèle
router.post('/', authenticate, async (req, res) => {
  const { nom, description, version } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO modeles_contrats (nom, description, version) VALUES ($1, $2, $3) RETURNING *',
      [nom, description, version || '1.0']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /modeles-contrats/:id - Modifier un modèle
router.put('/:id', authenticate, async (req, res) => {
  const { nom, description, version } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE modeles_contrats SET nom = $1, description = $2, version = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [nom, description, version, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Modèle non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /modeles-contrats/:id - Supprimer un modèle (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM modeles_contrats WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTES ARTICLES ==========

// GET /modeles-contrats/:modeleId/articles
router.get('/:modeleId/articles', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM articles_contrat WHERE modele_id = $1 ORDER BY ordre',
      [req.params.modeleId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /modeles-contrats/:modeleId/articles
router.post('/:modeleId/articles', authenticate, async (req, res) => {
  const { ordre, titre, contenu, variable } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO articles_contrat (modele_id, ordre, titre, contenu, variable)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.modeleId, ordre, titre, contenu, variable || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /articles/:id
router.put('/articles/:id', authenticate, async (req, res) => {
  const { ordre, titre, contenu, variable } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE articles_contrat SET ordre = $1, titre = $2, contenu = $3, variable = $4
       WHERE id = $5 RETURNING *`,
      [ordre, titre, contenu, variable, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Article non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /articles/:id - Supprimer un article (réservé aux administrateurs)
router.delete('/articles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM articles_contrat WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== GÉNÉRATION D'UN CONTRAT ==========

// POST /contrats/generer - Générer un contrat depuis un modèle
router.post('/contrats/generer', authenticate, async (req, res) => {
  const { employe_id, modele_id, date_debut, date_fin, salaire } = req.body;
  
  if (!employe_id || !modele_id) {
    return res.status(400).json({ error: 'employe_id et modele_id sont requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer le modèle et ses articles
    const modeleRes = await client.query(
      'SELECT * FROM modeles_contrats WHERE id = $1',
      [modele_id]
    );
    if (modeleRes.rows.length === 0) {
      throw new Error('Modèle non trouvé');
    }
    const modele = modeleRes.rows[0];

    const articlesRes = await client.query(
      'SELECT * FROM articles_contrat WHERE modele_id = $1 ORDER BY ordre',
      [modele_id]
    );

    // Générer une référence unique
    const ref = `CONTRAT-${Date.now()}`;

    // Insérer le contrat
    const contratRes = await client.query(
      `INSERT INTO contrats (employe_id, modele_id, reference, statut, date_creation)
       VALUES ($1, $2, $3, 'brouillon', NOW()) RETURNING *`,
      [employe_id, modele_id, ref]
    );
    const contrat = contratRes.rows[0];

    // Copier les articles dans contrats_articles
    for (const article of articlesRes.rows) {
      let contenu = article.contenu;
      // Remplacer les variables
      contenu = contenu.replace(/{{date_debut}}/g, date_debut || '[à définir]');
      contenu = contenu.replace(/{{date_fin}}/g, date_fin || '[à définir]');
      contenu = contenu.replace(/{{salaire}}/g, salaire || '[à définir]');
      
      await client.query(
        `INSERT INTO contrats_articles (contrat_id, ordre, titre, contenu)
         VALUES ($1, $2, $3, $4)`,
        [contrat.id, article.ordre, article.titre, contenu]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ contrat, modele });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur génération contrat :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /contrats - Liste des contrats générés
router.get('/contrats', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, e.nom AS employe_nom, e.prenom AS employe_prenom,
             m.nom AS modele_nom
      FROM contrats c
      LEFT JOIN employes e ON c.employe_id = e.id
      LEFT JOIN modeles_contrats m ON c.modele_id = m.id
      ORDER BY c.date_creation DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /contrats/:id - Détail d'un contrat avec ses articles
router.get('/contrats/:id', authenticate, async (req, res) => {
  try {
    const contratRes = await pool.query(`
      SELECT c.*, e.nom AS employe_nom, e.prenom AS employe_prenom,
             m.nom AS modele_nom
      FROM contrats c
      LEFT JOIN employes e ON c.employe_id = e.id
      LEFT JOIN modeles_contrats m ON c.modele_id = m.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (contratRes.rows.length === 0) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }
    const articles = await pool.query(
      'SELECT * FROM contrats_articles WHERE contrat_id = $1 ORDER BY ordre',
      [req.params.id]
    );
    res.json({ ...contratRes.rows[0], articles: articles.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /contrats/:id - Mettre à jour un contrat (statut, articles)
router.put('/contrats/:id', authenticate, async (req, res) => {
  const { statut, date_signature, pdf_url } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE contrats SET statut = COALESCE($1, statut),
                          date_signature = $2,
                          pdf_url = $3,
                          updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [statut, date_signature, pdf_url, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Contrat non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /contrats/:id/articles - Mettre à jour les articles d'un contrat
router.put('/contrats/:id/articles', authenticate, async (req, res) => {
  const { articles } = req.body; // tableau [{id, contenu}]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const art of articles) {
      await client.query(
        'UPDATE contrats_articles SET contenu = $1 WHERE id = $2 AND contrat_id = $3',
        [art.contenu, art.id, req.params.id]
      );
    }
    await client.query('COMMIT');
    res.sendStatus(200);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ✅ DELETE /contrats/:id - Supprimer un contrat (réservé aux administrateurs)
router.delete('/contrats/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM contrats_articles WHERE contrat_id = $1', [req.params.id]);
    await pool.query('DELETE FROM contrats WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;