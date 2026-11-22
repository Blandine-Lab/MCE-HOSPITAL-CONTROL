const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

// 🔥 MARQUEUR DE VÉRIFICATION — doit apparaître au démarrage du backend
console.log('🔥 db.js chargé — version RETRY v5 (timeout 8s + idle 10s + trim tenant)');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL non définie !');
  process.exit(1);
}

console.log('🔗 Connexion à PostgreSQL avec DATABASE_URL');

// ============================================================
// Options communes aux deux pools
// - idleTimeoutMillis: 10000 → recycle AVANT que Neon ne coupe
// - connectionTimeoutMillis: 15000 → marge sous coupure
// ============================================================
const poolOptions = {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000,
  keepAlives: 1,
  keepAlivesIdle: 30,
  keepAlivesInterval: 10,
  keepAlivesCount: 5,
};

const pool = new Pool({ connectionString, ...poolOptions });

pool.on('connect', (client) => {
  console.log('✅ Connecté à PostgreSQL');
  client.on('error', (err) => {
    console.error('❌ Erreur client pg :', err.message);
  });
});
pool.on('error', (err) => console.error('❌ Erreur pool Postgres :', err.message));

// ============================================================
// 🏥 AsyncLocalStorage — contexte tenant
// ============================================================
if (!global.__tenantALS) {
  global.__tenantALS = new AsyncLocalStorage();
}
const tenantALS = global.__tenantALS;

function runWithTenant(hospitalId, callback) {
  return tenantALS.run({ hospitalId }, callback);
}

function getCurrentTenant() {
  const store = tenantALS.getStore();
  return store ? store.hospitalId : null;
}

// ============================================================
// 🩹 Normalisation : "" et "  " → null (jamais passés à set_config)
// ============================================================
function normalizeTenantId(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

// ============================================================
// 🩹 Détection des erreurs transitoires
// ============================================================
function isDroppedConnection(err) {
  if (!err) return false;
  const code = err.code;
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ETIMEDOUT' ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === '08006' ||
    msg.includes('connection terminated unexpectedly') ||
    msg.includes('connection reset') ||
    msg.includes('server closed the connection')
  );
}

// ============================================================
// 🔧 Wrapper de pool.query (RLS) + retry
//    + trim / rejet de "" avant set_config
// ============================================================
const originalQuery = pool.query.bind(pool);

pool.query = async function patchedQuery(text, params) {
  const hospitalId = normalizeTenantId(getCurrentTenant());

  const run = async () => {
    // Pas de tenant OU tenant vide → requête directe (pas de set_config)
    if (!hospitalId) {
      return originalQuery(text, params);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT set_config('app.hospital_id', $1, true)`,
        [String(hospitalId)]
      );
      const result = await client.query(text, params);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  };

  try {
    return await run();
  } catch (err) {
    if (!isDroppedConnection(err)) throw err;
    return run();
  }
};

// ============================================================
// 🏥 Helper tenantQuery — trim + rejet de "" également
// ============================================================
async function tenantQuery(hospitalId, sql, params = []) {
  const tenantId = normalizeTenantId(hospitalId);

  if (!tenantId) {
    const err = new Error('tenantQuery: hospitalId manquant ou vide');
    err.code = 'TENANT_MISSING';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.hospital_id', $1, true)`,
      [String(tenantId)]
    );
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================
// 🔐 Pool auth (bypass RLS pour login)
// ============================================================
const authConnectionString =
  process.env.DATABASE_URL_OWNER || process.env.DATABASE_URL;

if (!process.env.DATABASE_URL_OWNER) {
  console.warn(
    '⚠️ DATABASE_URL_OWNER non définie — authPool utilisera DATABASE_URL ' +
    '(le login risque d’échouer sous RLS).'
  );
}

const authPool = new Pool({ connectionString: authConnectionString, ...poolOptions });

authPool.on('connect', (client) => {
  console.log('✅ authPool connecté (login/RLS bypass)');
  client.on('error', (err) => {
    console.error('❌ Erreur client authPool :', err.message);
  });
});
authPool.on('error', (err) => console.error('❌ Erreur authPool :', err.message));

// ============================================================
// 🔐 authQueryWithRetry — 3 tentatives, backoff, TIMEOUT DUR 8s
// ============================================================
async function authQueryWithRetry(text, params, retries = 3, baseDelay = 1000) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const start = Date.now();
    console.log(`🔵 authQueryWithRetry tentative ${attempt}/${retries}...`);
    try {
      const result = await Promise.race([
        authPool.query(text, params),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(
              Object.assign(
                new Error('TIMEOUT 8s sur authPool.query'),
                { code: 'ETIMEDOUT' }
              )
            ),
            8000
          )
        ),
      ]);
      console.log(`🟢 authQueryWithRetry OK en ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      const elapsed = Date.now() - start;
      console.warn(
        `🔴 authQueryWithRetry échec tentative ${attempt}/${retries} ` +
        `après ${elapsed}ms : code=${err.code || '?'} msg=${err.message}`
      );
      lastErr = err;

      if (!isDroppedConnection(err) && err.code !== 'ETIMEDOUT') throw err;

      if (attempt === retries) {
        console.error(
          `❌ authQueryWithRetry : ${retries} tentatives échouées — ${err.message}`
        );
        throw err;
      }

      const delay = baseDelay * attempt;
      console.log(`🔄 Retry authPool (${attempt}/${retries}) dans ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

// ============================================================
// Export
// ============================================================
module.exports = pool;
module.exports.pool = pool;
module.exports.tenantQuery = tenantQuery;
module.exports.runWithTenant = runWithTenant;
module.exports.getCurrentTenant = getCurrentTenant;
module.exports.authPool = authPool;
module.exports.authQueryWithRetry = authQueryWithRetry;
module.exports.isDroppedConnection = isDroppedConnection;
module.exports.normalizeTenantId = normalizeTenantId;