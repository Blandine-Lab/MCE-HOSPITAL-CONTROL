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
// ============================================================

const pool = require('../config/db');

const PLATFORM_ADMIN_LOGINS = (process.env.PLATFORM_ADMIN_LOGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

async function superAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Check 1 : whitelist env (immédiat, pas de DB)
  if (PLATFORM_ADMIN_LOGINS.includes(req.user.login)) {
    req.isSuperAdmin = true;
    return next();
  }

  // Check 2 : flag DB (à partir de la Phase F)
  try {
    const { rows } = await pool.query(
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

  return res.status(403).json({
    error: 'Accès plateforme refusé',
    code: 'NOT_SUPER_ADMIN',
  });
}

module.exports = { superAdmin, PLATFORM_ADMIN_LOGINS };