// backend/src/utils/audit.js
// ============================================================
// ✅ Compatible RLS (permissive OU restrictive) : pose
//    app.hospital_id dans la transaction avant l'INSERT.
// ✅ Schéma réel : table_cible, enregistrement_id, ip_address
//    (inet), created_at, hospital_id (uuid).
// ✅ Signature OBJET (auth.js) + positionnelle (legacy).
// ✅ Accepte tableCible/recordId ET ressource/ressourceId
// ✅ Non bloquant (auth.js l'appelle avec .catch(() => {})).
// ============================================================

// ✅ Défensif : si authPool est absent de config/db.js, on log une
//    erreur claire au démarrage, mais on ne fait pas crasher le serveur.
const dbConfig = require('../config/db');
const authPool = dbConfig.authPool;

if (!authPool) {
  console.error(
    '❌ utils/audit.js : authPool manquant dans config/db.js — ' +
    'audit_logs ne sera pas écrit (actions non journalisées).'
  );
}

// ✅ Logs de diagnostic : dev ou DEBUG_AUDIT=1 uniquement
const DEBUG =
  process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUDIT === '1';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function logAudit(...args) {
  // ---------- 1) Normalisation des arguments ----------
  let payload;
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    payload = args[0];
  } else {
    const [userId, action, resource, resourceId, details] = args;
    payload = { userId, action, ressource: resource, ressourceId: resourceId, details };
  }

  // ---------- 2) Déstructuration avec ALIAS ----------
  const {
    userId = null,
    action = 'UNKNOWN',
    ressource = null,
    ressourceId = null,
    tableCible = null,
    recordId = null,
    details = {},
    ip = null,
    hospitalId = null,
  } = payload;

  const finalRessource = ressource ?? tableCible ?? null;
  const finalRessourceId = ressourceId ?? recordId ?? null;

  // ---------- 3) Nettoyage des types stricts ----------
  const cleanIp =
    typeof ip === 'string' && ip.trim() !== '' && ip !== 'unknown' && ip !== 'n/a'
      ? ip.trim()
      : null;

  const cleanHospitalId =
    typeof hospitalId === 'string' &&
    hospitalId.trim() !== '' &&
    UUID_REGEX.test(hospitalId.trim())
      ? hospitalId.trim()
      : null;

  // ---------- 4) Avertissement si tenant sans hospitalId ----------
  //    Sans hospitalId, la ligne audit_logs sera orpheline (RLS la
  //    rendra invisible ou l'INSERT échouera si NOT NULL + FORCE).
  //    On log côté serveur pour ne pas perdre l'info.
  if (!cleanHospitalId) {
    console.warn(
      '⚠️ logAudit sans hospitalId valide — action:', action,
      '| ressource:', finalRessource,
      '| userId:', userId
    );
  }

  if (DEBUG) {
    console.log('📝 logAudit :', {
      utilisateur_id: userId,
      action,
      table_cible: finalRessource,
      enregistrement_id: finalRessourceId,
      ip_address: cleanIp,
      hospital_id: cleanHospitalId,
    });
  }

  // ---------- 5) INSERT transactionnel + set_config ----------
  if (!authPool) return; // déjà signalé au démarrage

  let client;
  try {
    client = await authPool.connect();
    await client.query('BEGIN');

    if (cleanHospitalId) {
      await client.query(
        `SELECT set_config('app.hospital_id', $1, true)`,
        [String(cleanHospitalId)]
      );
    }

    const result = await client.query(
      `INSERT INTO audit_logs
         (utilisateur_id, action, table_cible, enregistrement_id,
          details, ip_address, hospital_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        userId,
        action,
        finalRessource,
        finalRessourceId,
        JSON.stringify(details || {}),
        cleanIp,
        cleanHospitalId,
      ]
    );

    await client.query('COMMIT');
    if (DEBUG) {
      console.log(`✅ audit_logs INSERT OK — id=${result.rows[0]?.id}`);
    }
  } catch (err) {
    try { if (client) await client.query('ROLLBACK'); } catch (_) {}
    console.error(
      '❌ Erreur logAudit (non bloquant):',
      err.message,
      '| code:', err.code || 'n/a',
      '| detail:', err.detail || 'n/a',
      '| hint:', err.hint || 'n/a'
    );
  } finally {
    if (client) client.release();
  }
}

module.exports = { logAudit };