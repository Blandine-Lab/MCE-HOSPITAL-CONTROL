const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authQueryWithRetry } = require('../config/db');
const { logAudit } = require('../utils/audit');

const JWT_SECRET = process.env.JWT_SECRET || 'une_cle_par_defaut_mais_changez_la';

const PLATFORM_ADMIN_LOGINS = (process.env.PLATFORM_ADMIN_LOGINS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ALL_PERMISSIONS = [
  'view_dashboard', 'manage_users', 'view_patients', 'manage_patients',
  'view_consultations', 'manage_consultations', 'view_medical', 'manage_medical',
  'view_paramedical', 'manage_paramedical', 'view_laboratory', 'manage_laboratory',
  'view_rh', 'manage_rh', 'view_finance', 'manage_finance', 'view_stock', 'manage_stock',
  'view_quality', 'manage_quality', 'view_reporting', 'manage_reporting',
  'view_security', 'manage_security', 'view_interoperabilite', 'manage_interoperabilite',
  'view_facturation', 'manage_facturation', 'view_pharmacy', 'manage_pharmacy',
  'view_prescriptions', 'manage_prescriptions',
];

async function safeLogAudit(payload) {
  try {
    await logAudit(payload);
  } catch (e) {
    console.warn('⚠️ logAudit non bloquant :', e.message);
  }
}

router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'login et password requis' });
  }

  try {
    // ============================================================
    // 📌 Parsing "user" ou "user@slug" (robuste, indexOf)
    // ============================================================
    const rawLogin = String(login).trim();
    const atIdx = rawLogin.indexOf('@');
    const hasSlug = atIdx > 0 && atIdx < rawLogin.length - 1;
    const userPart = hasSlug ? rawLogin.slice(0, atIdx) : rawLogin;
    const slugPart = hasSlug ? rawLogin.slice(atIdx + 1).toLowerCase() : null;

    // ============================================================
    // 📌 1. Résoudre l'hôpital si slug fourni
    // ============================================================
    let hopitalBySlug = null;
    if (slugPart) {
      const { rows: hRows } = await authQueryWithRetry(
        `SELECT id, nom, slug, logo_url, couleur FROM hospitals WHERE slug = $1`,
        [slugPart]
      );
      if (hRows.length === 0) {
        return res.status(401).json({ error: 'Hôpital introuvable' });
      }
      hopitalBySlug = hRows[0];
    }

    // ============================================================
    // 📌 2. Chercher l'utilisateur
    //    ⚠️ FIX : rawLogin (admin@mce), pas userPart (admin)
    // ============================================================
    let userQuery, userParams;
    if (hopitalBySlug) {
      userQuery = `SELECT * FROM utilisateurs WHERE login = $1 AND actif = true AND hospital_id = $2`;
      userParams = [rawLogin, hopitalBySlug.id];
    } else {
      userQuery = `SELECT * FROM utilisateurs WHERE login = $1 AND actif = true`;
      userParams = [userPart];
    }

    const { rows } = await authQueryWithRetry(userQuery, userParams);

    if (rows.length === 0) {
      safeLogAudit({
        action: 'LOGIN_FAILED',
        details: { login: rawLogin, reason: 'user_not_found' },
        ip: req.ip,
      }).catch(() => {});
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    if (!hasSlug && rows.length > 1) {
      return res.status(401).json({
        error: "Login ambigu, précisez l'hôpital : utilisateur@slug",
      });
    }

    const user = rows[0];

    // ============================================================
    // 📌 3. Mot de passe
    // ============================================================
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      safeLogAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: { login: user.login, reason: 'bad_password' },
        ip: req.ip,
        hospitalId: user.hospital_id,
      }).catch(() => {});
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // ============================================================
    // 📌 4. Permissions (admin = ALL)
    // ============================================================
    let permissions = [];
    const adminRoles = ['admin', 'Administrateur', 'super_admin'];
    if (adminRoles.includes(user.role)) {
      permissions = ALL_PERMISSIONS;
    } else {
      try {
        const { rows: roleRows } = await authQueryWithRetry(
          'SELECT id FROM roles WHERE nom = $1', [user.role]
        );
        if (roleRows.length > 0) {
          const { rows: permsRows } = await authQueryWithRetry(`
            SELECT p.code FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
          `, [roleRows[0].id]);
          permissions = permsRows.map((r) => r.code);
        }
      } catch (err) {
        console.error('❌ Erreur permissions :', err);
        permissions = [];
      }
    }

    // ============================================================
    // 📌 5. Hôpital (priorité au slug fourni, sinon hospital_id du user)
    // ============================================================
    let hopital = hopitalBySlug;
    if (!hopital && user.hospital_id) {
      const { rows: hRows } = await authQueryWithRetry(
        `SELECT id, nom, slug, logo_url, couleur FROM hospitals WHERE id = $1`,
        [user.hospital_id]
      );
      hopital = hRows[0] || null;
    }

    // ============================================================
    // 📌 6. JWT
    // ============================================================
    const hospitalId = hopital?.id || user.hospital_id || null;
    // ⚠️ FIX : plus de fallback 'mce' qui polluait les super_admin
    const hospitalSlug = hopital?.slug || null;

    // ⚠️ FIX : is_super_admin aussi basé sur role + colonne DB
    const isSuperAdmin =
      user.role === 'super_admin' ||
      user.is_super_admin === true ||
      PLATFORM_ADMIN_LOGINS.includes(String(user.login || '').toLowerCase());

    const token = jwt.sign(
      {
        id: user.id, login: user.login, role: user.role,
        nom: user.nom, prenom: user.prenom,
        permissions,
        hospital_id: hospitalId, hospital_slug: hospitalSlug,
        is_super_admin: isSuperAdmin,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // ============================================================
    // 📌 7. Audit
    // ============================================================
    safeLogAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: {
        login: user.login, role: user.role, hospital_slug: hospitalSlug,
        is_super_admin: isSuperAdmin, format: hasSlug ? 'user@slug' : 'user',
      },
      ip: req.ip,
      hospitalId,
    }).catch(() => {});

    console.log(
      `🔐 Login OK : ${rawLogin} | role=${user.role} | ` +
      `hospital_id=${hospitalId} | slug=${hospitalSlug} | super_admin=${isSuperAdmin} | ` +
      `perms=${permissions.length}`
    );

    // ============================================================
    // 📌 8. Réponse
    // ============================================================
    res.json({
      token,
      accessToken: token,
      user: {
        id: user.id, login: user.login, role: user.role,
        nom: user.nom, prenom: user.prenom,
        permissions,
        hospital_id: hospitalId, hospital_slug: hospitalSlug,
        is_super_admin: isSuperAdmin,
      },
      hopital,
    });
  } catch (err) {
    console.error('❌ Erreur login :', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;