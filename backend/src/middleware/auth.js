const jwt = require('jsonwebtoken');
const { runWithTenant } = require('../config/db');

// ============================================================
// 🔑 FIX P1 : aligné avec auth.js (pas de fallback prod silencieux)
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET manquant en production — arrêt du serveur');
    }
    console.warn('⚠️ JWT_SECRET absent — fallback DEV uniquement');
}
const EFFECTIVE_SECRET = JWT_SECRET || 'dev-only-do-not-use-in-prod';

const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true';

// ============================================================
// Middleware d'authentification
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
        // ⚠️ Ne jamais logguer le token entier en prod
        console.log('📩 Token reçu (préfixe) :', token.slice(0, 20) + '...');
    }

    jwt.verify(token, EFFECTIVE_SECRET, (err, decoded) => {
        if (err) {
            console.error('❌ Erreur JWT :', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'jwt expired' });
            }
            return res.status(403).json({ error: 'Token invalide' });
        }

        if (DEBUG_AUTH) {
            console.log('✅ Token valide, utilisateur :', {
                id: decoded.id, role: decoded.role,
                hospital_id: decoded.hospital_id,
            });
        }

        req.user = decoded;
        req.hospitalId   = decoded.hospital_id   || null;
        req.hospitalSlug = decoded.hospital_slug || null;

        if (req.hospitalId) {
            return runWithTenant(req.hospitalId, () => next());
        }

        next();
    });
}

// ============================================================
// 🔴 FIX P0 : requireHospital exporté (alias de requireTenant)
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

// Alias pour compatibilité avec les imports existants
const requireHospital = requireTenant;

// ============================================================
// Restriction par rôle
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
// Restriction par permission
// ============================================================
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        // admin et super_admin passent (ALL_PERMISSIONS déjà accordées au login)
        if (req.user.role === 'admin' || req.user.role === 'super_admin') {
            return next();
        }
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: `Permission '${permission}' requise` });
        }
        next();
    };
}

// ============================================================
// Réservé aux administrateurs d'hôpital
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
    requireHospital,        // ✅ FIX P0
    requireRole,
    requirePermission,
    requireAdmin,
};