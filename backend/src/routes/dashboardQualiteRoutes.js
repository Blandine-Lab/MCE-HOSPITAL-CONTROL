// backend/src/routes/dashboardQualiteRoutes.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Qualité - Dashboard : connecté à PostgreSQL'));

// Helper pour exécuter une requête et retourner 0 en cas d'erreur
const safeCount = async (query, params = []) => {
  try {
    const result = await pool.query(query, params);
    return result.rows[0]?.count || 0;
  } catch (err) {
    console.error('Erreur safeCount:', query, err.message);
    return 0;
  }
};

// ✅ Protéger la route avec authenticate
router.get('/', authenticate, async (req, res) => {
  try {
    const periode = req.query.periode || '30d';
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - parseInt(periode));

    // 1. Statistiques de base – adaptation PostgreSQL (guillemets simples pour les chaînes)
    const signalementsOuverts = await safeCount(`SELECT COUNT(*) as count FROM signalements WHERE statut = 'ouvert'`);
    const signalementsResolus = await safeCount(`SELECT COUNT(*) as count FROM signalements WHERE statut = 'resolu'`);
    const signalementsTotal = await safeCount(`SELECT COUNT(*) as count FROM signalements`);
    const auditsEnCours = await safeCount(`SELECT COUNT(*) as count FROM audits WHERE statut = 'en_cours'`);
    const capaEnCours = await safeCount(`SELECT COUNT(*) as count FROM actions_capa WHERE statut = 'en_cours'`);
    const nonConformites = await safeCount(`SELECT COUNT(*) as count FROM non_conformites WHERE statut = 'ouverte'`);
    const risquesCritiques = await safeCount(`SELECT COUNT(*) as count FROM evaluations_risques WHERE niveau_risque = 'critique'`);

    // 2. Évolution (requête PostgreSQL avec $1)
    let evolution = [];
    try {
      const result = await pool.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM signalements
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [dateDebut]
      );
      evolution = result.rows;
    } catch (err) {
      console.error('Erreur évolution:', err.message);
      // fallback : données vides
    }

    // 3. Répartition par service (si colonne 'service' n'existe pas, adaptez)
    let repartitionService = [];
    try {
      const result = await pool.query(
        `SELECT service, COUNT(*) as count
         FROM signalements
         WHERE created_at >= $1
         GROUP BY service
         ORDER BY count DESC`,
        [dateDebut]
      );
      repartitionService = result.rows;
    } catch (err) {
      console.error('Erreur répartition service:', err.message);
    }

    // 4. Risques par catégorie
    let risquesCategorie = [];
    try {
      const result = await pool.query(
        `SELECT categorie, COUNT(*) as count
         FROM evaluations_risques
         WHERE created_at >= $1
         GROUP BY categorie
         ORDER BY count DESC`,
        [dateDebut]
      );
      risquesCategorie = result.rows;
    } catch (err) {
      console.error('Erreur risques catégorie:', err.message);
    }

    // 5. Alertes (signalements ouverts depuis +72h) – adaptation PostgreSQL
    let alertes = [];
    try {
      const result = await pool.query(
        `SELECT id, CONCAT('Signalement #', id, ' non traité depuis 72h') as message, 'haute' as priorite
         FROM signalements
         WHERE statut = 'ouvert' AND created_at < (NOW() - INTERVAL '3 days')
         LIMIT 5`
      );
      alertes = result.rows;
    } catch (err) {
      console.error('Erreur alertes:', err.message);
    }

    // Réponse
    res.json({
      signalementsOuverts,
      signalementsResolus,
      signalementsTotal,
      auditsEnCours,
      capaEnCours,
      nonConformites,
      risquesCritiques,
      evolution,
      repartitionService,
      risquesCategorie,
      alertes
    });

  } catch (err) {
    console.error('Erreur globale dashboard:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des données du tableau de bord', detail: err.message });
  }
});

module.exports = router;