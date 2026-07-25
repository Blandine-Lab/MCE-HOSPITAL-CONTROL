// backend/src/utils/audit.js
const { Pool } = require('pg');

// Création d'un pool dédié pour l'audit (pour éviter les dépendances circulaires)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Journalise une action dans la table audit_logs
 * @param {number} userId - ID de l'utilisateur (peut être null)
 * @param {string} action - Nom de l'action (ex: 'CREATE_MEDICAMENT')
 * @param {string} resource - Type de ressource (ex: 'medicaments')
 * @param {number} resourceId - ID de la ressource concernée
 * @param {object} details - Détails supplémentaires (sera stocké en JSON)
 */
const logAudit = async (userId, action, resource, resourceId, details = {}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (utilisateur_id, action, ressource, ressource_id, details, date_action)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, resource, resourceId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('❌ Erreur logAudit:', err);
  }
};

module.exports = { logAudit };