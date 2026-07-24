const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// ============================================================
// ============== GESTION DES RÔLES ===========================
// ============================================================

// GET - Liste des rôles avec leurs permissions
router.get('/roles', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const roles = await pool.query('SELECT * FROM roles ORDER BY id');
    for (let r of roles.rows) {
      const perms = await pool.query(`
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
      `, [r.id]);
      r.permissions = perms.rows;
    }
    res.json(roles.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Récupérer un rôle spécifique avec ses permissions
router.get('/roles/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rôle non trouvé' });
    }
    const role = rows[0];
    const perms = await pool.query(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [id]);
    role.permissions = perms.rows;
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un rôle (description et permissions sont optionnelles)
router.post('/roles', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { nom, description = null, permission_ids } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Le nom du rôle est requis' });
    }
    const { rows } = await pool.query(
      'INSERT INTO roles (nom, description) VALUES ($1, $2) RETURNING *',
      [nom.trim(), description]
    );
    const roleId = rows[0].id;
    if (permission_ids && Array.isArray(permission_ids) && permission_ids.length) {
      for (let pid of permission_ids) {
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [roleId, pid]
        );
      }
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce nom de rôle existe déjà' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un rôle (mise à jour partielle : nom, description, permissions)
router.put('/roles/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { nom, description, permission_ids } = req.body;
    const roleId = req.params.id;

    const updateFields = [];
    const params = [];
    let paramIdx = 1;

    if (nom !== undefined && nom.trim() !== '') {
      updateFields.push(`nom = $${paramIdx++}`);
      params.push(nom.trim());
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIdx++}`);
      params.push(description);
    }

    if (updateFields.length > 0) {
      params.push(roleId);
      const query = `
        UPDATE roles
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIdx}
        RETURNING *
      `;
      const { rowCount } = await client.query(query, params);
      if (rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Rôle non trouvé' });
      }
    }

    if (permission_ids && Array.isArray(permission_ids)) {
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      for (let pid of permission_ids) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [roleId, pid]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ce nom de rôle est déjà utilisé' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE - Supprimer un rôle
router.delete('/roles/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { rows: users } = await pool.query(
      'SELECT id FROM utilisateurs WHERE role = (SELECT nom FROM roles WHERE id = $1)',
      [req.params.id]
    );
    if (users.length > 0) {
      return res.status(400).json({
        error: 'Ce rôle est utilisé par des utilisateurs. Changez leur rôle avant de supprimer.'
      });
    }
    const { rowCount } = await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Rôle non trouvé' });
    }
    res.json({ message: 'Rôle supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ============== PERMISSIONS =================================
// ============================================================

router.get('/permissions', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM permissions ORDER BY module, code');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/permissions', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { code, nom, description, module } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO permissions (code, nom, description, module) VALUES ($1, $2, $3, $4) RETURNING *',
      [code, nom, description, module]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ============== LOGS, SESSIONS, TENTATIVES ==================
// ============================================================

router.get('/logs', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { utilisateur_id, action, date_debut, date_fin } = req.query;
    let query = `
      SELECT l.*, u.nom as utilisateur_nom, u.prenom as utilisateur_prenom
      FROM logs_securite l
      LEFT JOIN utilisateurs u ON l.utilisateur_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (utilisateur_id) { query += ` AND l.utilisateur_id = $${idx++}`; params.push(utilisateur_id); }
    if (action) { query += ` AND l.action = $${idx++}`; params.push(action); }
    if (date_debut) { query += ` AND l.date_action >= $${idx++}`; params.push(date_debut); }
    if (date_fin) { query += ` AND l.date_action <= $${idx++}`; params.push(date_fin); }
    query += ` ORDER BY l.date_action DESC LIMIT 500`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, u.nom, u.prenom
      FROM sessions s
      JOIN utilisateurs u ON s.utilisateur_id = u.id
      WHERE s.actif = TRUE AND s.date_expiration > NOW()
      ORDER BY s.date_creation DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/sessions/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    await pool.query('UPDATE sessions SET actif = FALSE WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tentatives-connexion', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM tentatives_connexion
      ORDER BY date_tentative DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ============== NOUVELLES ROUTES POUR AUTORISATIONS ========
// ============================================================

router.get('/modules', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT module FROM permissions ORDER BY module
    `);
    const modules = rows.map(r => r.module);
    const result = [];
    for (const mod of modules) {
      const perms = await pool.query(`
        SELECT code, nom FROM permissions WHERE module = $1 AND (code LIKE 'view_%' OR code LIKE 'manage_%')
      `, [mod]);
      const viewPerm = perms.rows.find(p => p.code.startsWith('view_'));
      const managePerm = perms.rows.find(p => p.code.startsWith('manage_'));
      result.push({
        module: mod,
        view_permission: viewPerm ? viewPerm.code : null,
        manage_permission: managePerm ? managePerm.code : null,
        view_label: viewPerm ? viewPerm.nom : null,
        manage_label: managePerm ? managePerm.nom : null
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/roles/:id/authorizations', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(`
      SELECT p.code FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [id]);
    const permCodes = rows.map(r => r.code);
    const modulesRes = await pool.query(`SELECT DISTINCT module FROM permissions ORDER BY module`);
    const modules = modulesRes.rows.map(r => r.module);
    const authorizations = [];
    for (const mod of modules) {
      const perms = await pool.query(`
        SELECT code FROM permissions WHERE module = $1 AND (code LIKE 'view_%' OR code LIKE 'manage_%')
      `, [mod]);
      const viewCode = perms.rows.find(p => p.code.startsWith('view_'))?.code;
      const manageCode = perms.rows.find(p => p.code.startsWith('manage_'))?.code;
      let level = 'none';
      if (viewCode && permCodes.includes(viewCode)) level = 'read';
      if (manageCode && permCodes.includes(manageCode)) {
        level = (viewCode && permCodes.includes(viewCode)) ? 'full' : 'write';
      }
      authorizations.push({ module: mod, level });
    }
    res.json(authorizations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/roles/:id/authorizations', authenticate, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { authorizations } = req.body;
    const permissionIdsToAssign = [];
    for (const auth of authorizations) {
      const { module, level } = auth;
      if (level === 'none') continue;
      const perms = await client.query(`
        SELECT id, code FROM permissions WHERE module = $1 AND (code LIKE 'view_%' OR code LIKE 'manage_%')
      `, [module]);
      const viewPerm = perms.rows.find(p => p.code.startsWith('view_'));
      const managePerm = perms.rows.find(p => p.code.startsWith('manage_'));
      if (level === 'read' && viewPerm) permissionIdsToAssign.push(viewPerm.id);
      else if (level === 'write' || level === 'full') {
        if (viewPerm) permissionIdsToAssign.push(viewPerm.id);
        if (managePerm) permissionIdsToAssign.push(managePerm.id);
      }
    }
    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    for (const pid of permissionIdsToAssign) {
      await client.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
        [id, pid]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// ============== MIDDLEWARE DE JOURNALISATION ================
// ============================================================

const logAction = async (req, action, ressource, ressourceId, details = {}) => {
  try {
    const userId = req.user ? req.user.id : null;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    await pool.query(
      `INSERT INTO logs_securite (utilisateur_id, action, ressource, ressource_id, details, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, ressource, ressourceId, details, ip, userAgent]
    );
  } catch (err) {
    console.error('Erreur journalisation:', err);
  }
};

module.exports = { router, logAction };