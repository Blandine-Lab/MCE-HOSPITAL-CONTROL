const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // ⚠️ Adaptez le chemin si nécessaire

// 🔑 Utiliser la même clé que celle utilisée pour signer le token (dans auth.js côté routes)
const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_par_defaut_mais_changez_la';

// ============================================================
// Middleware d'authentification : vérifie l'access token
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

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'jwt expired' });
            }
            return res.status(403).json({ error: 'Token invalide' });
        }
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
// Middleware de restriction par permission
// ============================================================
function requirePermission(permissionCode) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Non authentifié' });
            }

            const userId = req.user.id;
            const query = `
                SELECT 1
                FROM role_permissions rp
                JOIN utilisateurs u ON u.role = (SELECT nom FROM roles WHERE id = rp.role_id)
                JOIN permissions p ON p.id = rp.permission_id
                WHERE u.id = $1 AND p.code = $2
            `;
            const { rows } = await pool.query(query, [userId, permissionCode]);

            if (rows.length === 0) {
                return res.status(403).json({ error: 'Permission refusée' });
            }

            next();
        } catch (err) {
            console.error('Erreur dans requirePermission :', err);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    };
}

// ============================================================
// ✅ NOUVEAU : Middleware réservé aux administrateurs (pour suppression)
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

// ============================================================
// Export des middlewares
// ============================================================
module.exports = {
    authenticate,
    requireRole,
    requirePermission,
    requireAdmin, // ✅ Export du nouveau middleware
};