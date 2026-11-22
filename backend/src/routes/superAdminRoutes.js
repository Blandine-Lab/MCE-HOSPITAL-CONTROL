const express = require('express');
const router = express.Router();

// ✅ CORRIGÉ : '../config/db' (src/config/db.js) — évite le double chargement
//    AVANT : '../../config/db' (= backend/config/db.js, fichier fantôme)
const pool = require('../config/db');

// ✅ CORRIGÉ : chemins simplifiés depuis src/routes/
const { authenticate } = require('../middleware/auth');
const { superAdmin } = require('../middleware/superAdmin');

// ✅ CORRIGÉ : '../utils/audit' (src/utils/audit.js)
//    AVANT : '../../utils/audit' (= backend/utils/audit.js, INEXISTANT)
const { logAudit } = require('../utils/audit');

router.use(authenticate, superAdmin);

function isTableMissing(err) { return err.code === '42P01'; }

// ============================================================
// GET /api/platform/hospitals — Liste tous les hôpitaux
// ============================================================
router.get('/hospitals', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, nom, email_admin, telephone, statut, plan, logo_url, couleur, created_at
       FROM hospitals ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    if (isTableMissing(err)) return res.status(503).json({ error: 'Phase F requise', code: 'PLATFORM_NOT_READY' });
    console.error('❌ platform/hospitals :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/platform/hospitals/:id — Détails d'un hôpital
// ============================================================
router.get('/hospitals/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM hospitals WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Hôpital introuvable' });
    res.json(rows[0]);
  } catch (err) {
    if (isTableMissing(err)) return res.status(503).json({ error: 'Phase F requise' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/platform/hospitals/:id/statut — Suspendre/activer
// ============================================================
router.patch('/hospitals/:id/statut', async (req, res) => {
  const { statut } = req.body || {};
  if (!['actif', 'suspendu', 'essai'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE hospitals SET statut = $1 WHERE id = $2 RETURNING id, slug, nom, statut',
      [statut, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Hôpital introuvable' });

    // ✅ CORRIGÉ : 'ressource' et 'ressourceId' (au lieu de 'tableCible'/'recordId')
    //    pour matcher audit.js (qui mappe vers table_cible / enregistrement_id)
    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_HOSPITAL_STATUS',
      ressource: 'hospitals',
      ressourceId: null,
      details: {
        hospital_id: rows[0].id,
        slug: rows[0].slug,
        nouveau_statut: statut,
      },
      ip: req.ip,
      hospitalId: rows[0].id,
    });

    console.log(`👑 Hôpital ${rows[0].slug} → ${statut}`);
    res.json(rows[0]);
  } catch (err) {
    if (isTableMissing(err)) return res.status(503).json({ error: 'Phase F requise' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/platform/stats — Stats plateforme
// ============================================================
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE statut = 'actif')::int AS actifs,
         COUNT(*) FILTER (WHERE statut = 'essai')::int AS essai,
         COUNT(*) FILTER (WHERE statut = 'suspendu')::int AS suspendus
       FROM hospitals`
    );
    res.json(rows[0]);
  } catch (err) {
    if (isTableMissing(err)) return res.status(503).json({ error: 'Phase F requise' });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/platform/audit-logs — LES LOGS D'AUDIT
// ============================================================
router.get('/audit-logs', async (req, res) => {
  try {
    const { hospital_id, action, utilisateur_id, limit = 200, offset = 0 } = req.query;
    const where = [];
    const params = [];
    let i = 1;
    if (hospital_id) { where.push(`hospital_id = $${i++}`); params.push(hospital_id); }
    if (action) { where.push(`action = $${i++}`); params.push(action); }
    if (utilisateur_id) { where.push(`utilisateur_id = $${i++}`); params.push(parseInt(utilisateur_id, 10)); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const { rows } = await pool.query(
      `SELECT id, utilisateur_id, action, table_cible, enregistrement_id,
              details, ip_address, hospital_id, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ audit-logs :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;