const jwt = require('jsonwebtoken');
const { runWithTenant } = require('../config/db');

// 🔑 Doit rester identique à la clé utilisée pour signer le token au login.
const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_par_defaut_mais_changez_la';

// Log de debug local uniquement — jamais en production.
const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true';

// ============================================================
// Middleware d'authentification : vérifie l'access token
// + extrait les informations de tenant (hôpital) du JWT
// + ouvre le contexte AsyncLocalStorage pour scoper les requêtes.
// ============================================================
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token mal formé' });
    }

    if (DEBUG_AUTH) {
        console.log('🔑 JWT_SECRET utilisé :', JWT_SECRET);
        console.log('📩 Token reçu :', token);
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('❌ Erreur JWT :', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'jwt expired' });
            }
            return res.status(403).json({ error: 'Token invalide' });
        }

        if (DEBUG_AUTH) {
            console.log('✅ Token valide, utilisateur :', decoded);
        }

        // ----- Identité -----
        req.user = decoded;

        // ----- Contexte tenant -----
        req.hospitalId   = decoded.hospital_id   || null;
        req.hospitalSlug = decoded.hospital_slug || null;

        // ============================================================
        // 🏥 Multi-tenant : ouvre le contexte AsyncLocalStorage
        // ------------------------------------------------------------
        // Sans cette enveloppe, tous les `pool.query()` exécutés
        // dans les handlers suivants tourneraient SANS `app.hospital_id`
        // → RLS bloquerait tout (ou pire, laisserait passer).
        //
        // Avec l'enveloppe, tout ce qui est exécuté après `next()`
        // (même asynchrone, même dans un `.then()`) hérite du contexte
        // → le wrapper `pool.query` de config/db.js applique le
        //   `set_config('app.hospital_id', …)` automatiquement.
        // ============================================================
        if (req.hospitalId) {
            return runWithTenant(req.hospitalId, () => next());
        }

        // Pas de contexte tenant (route legacy, super-admin…)
        // → on laisse passer, comportement normal.
        next();
    });
}

// ============================================================
// Garde-fou multi-tenant (inchangé)
// ------------------------------------------------------------
// Utilisable maintenant que la Phase F (backfill) est faite.
// À monter sur les routes critiques (patients, billing, etc.)
// pour renvoyer 403 au lieu de fuiter en cas de JWT sans tenant.
// ============================================================
function requireTenant(req, res, next) {
    if (!req.hospitalId) {
        return res.status(403).json({
            error: 'Contexte hôpital manquant',
            code: 'TENANT_MISSING',
        });
    }
    next();
}

// ============================================================
// Restriction par rôle (inchangé)
// ============================================================
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        next();
    };
}

// ============================================================
// Restriction par permission (inchangé)
// ============================================================
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        if (req.user.role === 'admin') {
            return next();
        }
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: `Permission '${permission}' requise` });
        }
        next();
    };
}

// ============================================================
// Réservé aux administrateurs (inchangé)
// ============================================================
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Seul un administrateur peut effectuer cette action' });
    }
    next();
}

module.exports = {
    authenticate,
    requireTenant,
    requireRole,
    requirePermission,
    requireAdmin,
};