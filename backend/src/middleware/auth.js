const jwt = require('jsonwebtoken');

// 🔑 Utiliser la même clé que celle utilisée pour signer le token lors du login
const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_par_defaut_mais_changez_la';

// ============================================================
// Middleware d'authentification : vérifie l'access token
// ============================================================
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.warn('⚠️  Authentification : en-tête Authorization manquant');
        return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        console.warn('⚠️  Authentification : token mal formé');
        return res.status(401).json({ error: 'Token mal formé' });
    }

    // ----- LOGS DE DIAGNOSTIC -----
    console.log('🔑 JWT_SECRET utilisé :', JWT_SECRET);
    console.log('📩 Token reçu :', token);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('❌ Erreur JWT :', err.message, err);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'jwt expired' });
            }
            return res.status(403).json({ error: 'Token invalide' });
        }
        console.log('✅ Token valide, utilisateur :', decoded);
        req.user = decoded;
        next();
    });
}

// ============================================================
// Middleware de restriction par rôle
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
// Middleware de restriction par permission (CORRIGÉ)
// ============================================================
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        // ✅ ADMIN : accès à tout sans vérification de permission
        if (req.user.role === 'admin') {
            return next();
        }
        // Vérifier la permission pour les autres rôles
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: `Permission '${permission}' requise` });
        }
        next();
    };
}

// ============================================================
// Middleware : réserver la suppression aux administrateurs
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

module.exports = { authenticate, requireRole, requirePermission, requireAdmin };