// ============================================================
// 🏥 Middleware multi-tenant
// ------------------------------------------------------------
// Résout l'hôpital courant à partir de `req.hospitalSlug`
// (injecté par `authenticate` depuis le payload JWT).
//
// - Aujourd'hui (Phases B-C) : la table `hospitals` n'existe
//   pas encore → mode "fallback" : tout le monde est rattaché
//   à l'hôpital par défaut (HOPITAL_SLUG=mce, hospitalId=null).
//   → Zéro impact sur le comportement actuel.
//
// - À partir de la Phase F : la table existe → on lit la ligne
//   correspondante, on récupère son UUID, son statut, son
//   branding. Le fallback ne sert plus que si un slug inconnu
//   arrive (cas anormal).
//
// - En Phase C, on montera ce middleware sur les routes métier :
//     router.get('/patients',
//         authenticate, tenant,
//         controller.listPatients);
//
// - On pourra aussi activer `requireTenant` sur les routes qui
//   ne doivent pas fonctionner sans contexte hôpital (après
//   Phase F).
// ============================================================

const pool = require('../config/db');

const DEFAULT_SLUG = process.env.HOPITAL_SLUG || 'mce';
const CACHE_TTL_MS = 60 * 1000; // 60 secondes

// ------------------------------------------------------------
// Cache mémoire
// ------------------------------------------------------------
const cache = new Map(); // slug -> { data, expiresAt }

// null  = inconnu (pas encore testé)
// true  = table `hospitals` existe
// false = table absente (Phase F pas encore passée)
let hospitalsTableExists = null;

function buildFallback() {
  return {
    id: null, // pas d'UUID tant que Phase F n'est pas faite
    slug: DEFAULT_SLUG,
    nom: process.env.HOPITAL_NOM || 'MCE',
    logo_url: null,
    couleur: null,
    statut: 'actif',
    plan: 'legacy',
  };
}

// ------------------------------------------------------------
// Lecture + cache
// ------------------------------------------------------------
async function fetchHospitalBySlug(slug) {
  const now = Date.now();
  const entry = cache.get(slug);
  if (entry && entry.expiresAt > now) {
    return entry.data;
  }

  // Si on sait déjà que la table n'existe pas → fallback direct
  if (hospitalsTableExists === false) {
    const data = buildFallback();
    cache.set(slug, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, nom, logo_url, couleur, statut, plan
       FROM hospitals
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );
    hospitalsTableExists = true;
    const data = rows[0] || null;
    cache.set(slug, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } catch (err) {
    // 42P01 = undefined_table (PostgreSQL) → table pas encore créée
    if (err.code === '42P01') {
      hospitalsTableExists = false;
      console.warn(
        '⚠️  Table `hospitals` absente — mode fallback actif ' +
        `(hôpital par défaut = "${DEFAULT_SLUG}"). ` +
        'Ceci est normal jusqu’à la Phase F.'
      );
      const data = buildFallback();
      cache.set(slug, { data, expiresAt: now + CACHE_TTL_MS });
      return data;
    }
    throw err;
  }
}

// ------------------------------------------------------------
// Middleware Express
// ------------------------------------------------------------
async function tenant(req, res, next) {
  try {
    // Le slug vient du JWT (signé, donc fiable).
    // Si absent, on tombe sur l'hôpital par défaut.
    const slug = req.hospitalSlug || DEFAULT_SLUG;

    const hospital = await fetchHospitalBySlug(slug);

    if (!hospital) {
      // Slug inconnu côté DB (Phase F+) → cas anormal, on rejette
      return res.status(404).json({
        error: `Hôpital "${slug}" introuvable`,
        code: 'TENANT_NOT_FOUND',
      });
    }

    if (hospital.statut === 'suspendu') {
      return res.status(403).json({
        error: 'Ce compte hôpital est suspendu. Contactez le support.',
        code: 'TENANT_SUSPENDED',
      });
    }

    // Contexte tenant exposé aux routes / contrôleurs
    req.hospital = hospital;
    req.hospitalId = hospital.id;         // null jusqu'à Phase F
    req.hospitalSlug = hospital.slug;

    next();
  } catch (err) {
    console.error('❌ Erreur middleware tenant :', err);
    next(err);
  }
}

// ------------------------------------------------------------
// Helpers d'administration du cache
// ------------------------------------------------------------
// À appeler quand un admin modifie le branding / statut de son
// hôpital, ou après la Phase F (changement de phase → on force
// une nouvelle lecture).
function clearCache(slug) {
  if (slug) cache.delete(slug);
  else cache.clear();
}

// Force une nouvelle tentative de lecture de la table `hospitals`
// (utile après la Phase F, sans redémarrer le serveur).
function resetTableFlag() {
  hospitalsTableExists = null;
  cache.clear();
}

module.exports = {
  tenant,
  clearCache,
  resetTableFlag,
  fetchHospitalBySlug,
};