// backend/src/utils/audit.js
// ============================================================
// ✅ Compatible RLS (permissive OU restrictive) : pose
//    app.hospital_id dans la transaction avant l'INSERT.
// ✅ Schéma réel : table_cible, enregistrement_id, ip_address
//    (inet), created_at, hospital_id (uuid).
// ✅ Signature OBJET (auth.js) + positionnelle (legacy).
// ✅ Logs de diagnostic : payload + code + detail + hint.
// ✅ Non bloquant (auth.js l'appelle avec .catch(() => {})).
// ============================================================

const { authPool } = require('../config/db');

async function logAudit(...args) {
  // ---------- 1) Normalisation des arguments ----------
  let payload;
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    payload = args[0];
  } else {
    const [userId, action, resource, resourceId, details] = args;
    payload = { userId, action, ressource: resource, ressourceId: resourceId, details };
  }

  const {
    userId = null,
    action = 'UNKNOWN',
    ressource = null,        // → table_cible
    ressourceId = null,      // → enregistrement_id
    details = {},
    ip = null,               // → ip_address (inet)
    hospitalId = null,       // → hospital_id (uuid)
  } = payload;

  // ---------- 2) Nettoyage des types stricts ----------
  const cleanIp =
    typeof ip === 'string' && ip.trim() !== '' && ip !== 'unknown' && ip !== 'n/a'
      ? ip.trim()
      : null;

  const cleanHospitalId =
    typeof hospitalId === 'string' && hospitalId.trim() !== ''
      ? hospitalId.trim()
      : null;

  // ---------- 3) Diagnostic AVANT INSERT ----------
  console.log('📝 logAudit :', {
    utilisateur_id: userId,
    action,
    table_cible: ressource,
    enregistrement_id: ressourceId,
    ip_address: cleanIp,
    hospital_id: cleanHospitalId,
  });

  // ---------- 4) INSERT transactionnel + set_config ----------
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
        ressource,
        ressourceId,
        JSON.stringify(details || {}),
        cleanIp,
        cleanHospitalId,
      ]
    );

    await client.query('COMMIT');
    console.log(`✅ audit_logs INSERT OK — id=${result.rows[0]?.id}`);
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