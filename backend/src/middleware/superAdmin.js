// ============================================================
// 👑 Middleware super-admin plateforme
// ------------------------------------------------------------
// Réservé aux admins de la PLATEFORME (toi), PAS aux admins
// d'un hôpital. Deux mécanismes, dans l'ordre :
//
// 1. PLATFORM_ADMIN_LOGINS (env) : liste de logins séparés par
//    virgule, e.g. "root,superadmin". Marche immédiatement,
//    sans toucher à la DB. ✅ UTILISER CECI MAINTENANT.
//
// 2. Colonne `is_super_admin` sur `utilisateurs` (prévue
//    Phase F). Si elle existe et vaut true → OK. Sinon ignoré.
//
// Doit être monté APRÈS `authenticate` (req.user existe).
//
// ⚠️ Préparation RLS étape 3 :
//    - Le check DB utilise authPool (BYPASS RLS via OWNER),
//      pas pool (ALS/tenant). Un super admin plateforme peut
//      ne pas avoir de hospital_id : sous tenant_isolation,
//      pool.query ne poserait pas set_config et renverrait 0
//      ligne → 403 inexplicable. authPool évite ce piège.
// ============================================================

const { authPool } = require('../config/db');

const PLATFORM_ADMIN_LOGINS = (process.env.PLATFORM_ADMIN_LOGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

async function superAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Check 1 : whitelist env (immédiat, pas de DB)
  const login = (req.user.login || '').trim();
  if (login && PLATFORM_ADMIN_LOGINS.includes(login)) {
    req.isSuperAdmin = true;
    return next();
  }

  // Check 2 : flag DB (à partir de la Phase F)
  // ✅ authPool : lecture plateforme, hors isolation tenant
  if (authPool) {
    try {
      const { rows } = await authPool.query(
        'SELECT is_super_admin FROM utilisateurs WHERE id = $1',
        [req.user.id]
      );
      if (rows[0]?.is_super_admin === true) {
        req.isSuperAdmin = true;
        return next();
      }
    } catch (err) {
      // 42703 = undefined_column → la colonne n'existe pas encore, c'est normal
      if (err.code !== '42703') {
        console.error('❌ superAdmin check DB :', err.message);
      }
    }
  } else {
    console.error(
      '❌ superAdmin : authPool absent de config/db.js — ' +
      'check DB ignoré, seul PLATFORM_ADMIN_LOGINS est actif.'
    );
  }

  return res.status(403).json({
    error: 'Accès plateforme refusé',
    code: 'NOT_SUPER_ADMIN',
  });
}

module.exports = { superAdmin, PLATFORM_ADMIN_LOGINS };