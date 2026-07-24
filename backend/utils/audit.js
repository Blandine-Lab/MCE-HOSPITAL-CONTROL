const pool = require('../config/db');

async function logAudit(userId, action, tableCible, recordId, details, ip = null) {
    await pool.query(`
        INSERT INTO audit_logs (utilisateur_id, action, table_cible, enregistrement_id, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, action, tableCible, recordId, details, ip]);
}
module.exports = { logAudit };