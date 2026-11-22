// ============================================================
// 🌐 Routes PUBLIQUES (aucune authentification)
// ------------------------------------------------------------
// Utilisées par le frontend AVANT le login pour afficher le
// branding de l'hôpital demandé (nom, logo, couleur, statut).
//
// Mount : app.use('/api/public', publicRoutes) dans server.js
//
// Tant que la table `hospitals` n'existe pas → 503.
// Après Phase F → répond normalement.
// ============================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const SLUG_RE = /^[a-z0-9-]{2,40}$/;

router.get('/hospitals/:slug', async (req, res) => {
  const { slug } = req.params;

  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'Slug invalide', code: 'INVALID_SLUG' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT slug, nom, logo_url, couleur, statut
       FROM hospitals
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Hôpital introuvable', code: 'TENANT_NOT_FOUND' });
    }

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      slug: rows[0].slug,
      nom: rows[0].nom,
      logo_url: rows[0].logo_url,
      couleur: rows[0].couleur,
      statut: rows[0].statut,
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({
        error: 'Plateforme non encore initialisée',
        code: 'PLATFORM_NOT_READY',
      });
    }
    console.error('❌ public/hospitals/:slug :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;