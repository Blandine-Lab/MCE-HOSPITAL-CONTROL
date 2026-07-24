// middleware/permissions.js
const pool = require('../../config/db');

// Vérifie si l'utilisateur a une permission spécifique
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id; // req.user doit être défini par authenticate
      const { rows } = await pool.query(
        `SELECT p.nom 
         FROM permissions p
         JOIN roles_permissions rp ON p.id = rp.permission_id
         JOIN utilisateurs u ON u.role_id = rp.role_id
         WHERE u.id = $1 AND p.nom = $2`,
        [userId, permission]
      );
      if (rows.length === 0) {
        return res.status(403).json({ error: 'Permission insuffisante' });
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };
};

module.exports = { requirePermission };