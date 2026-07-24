// Si vous voulez séparer, mais on peut tout mettre dans auth.js
module.exports = {
  requireRole: (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Droits insuffisants' });
    }
    next();
  }
};