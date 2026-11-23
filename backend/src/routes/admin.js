// src/routes/admin.js
// ============================================================
// 👑 ADMIN – Utilisateurs, résolution tenant
// ------------------------------------------------------------
// ⚠️ FIX : pool patché de config/db.js (ALS + set_config auto)
//    → les `pool.query(...)` directs héritent du tenant
//    → PUT/DELETE/PATCH ne renvoient plus 404 à tort
// ============================================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireRole } = require('../middleware/auth');

// ============================================================
// 🏥 Helper RLS : transaction avec app.hospital_id défini
// ============================================================
async function withHospitalContext(hospitalId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (hospitalId) {
      await client.query(
        `SELECT set_config('app.hospital_id', $1, true)`,
        [String(hospitalId)]
      );
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

// Toutes ces routes sont réservées à l'admin
router.use(authenticate);
router.use(requireRole(['admin', 'super_admin']));

// ============================================================
// Helpers
// ============================================================
function isSuperAdmin(req) {
  return req.user?.role === 'super_admin' || req.user?.is_super_admin === true;
}

const ROLES_INTERDITS_HOSPITAL_ADMIN = ['super_admin'];

// Résout l'hôpital cible (admin → JWT ; super_admin → body.hospital_id)
async function resolveTargetHospital(req) {
  if (isSuperAdmin(req)) {
    if (!req.body.hospital_id) {
      return { error: 'Le super_admin doit fournir hospital_id' };
    }
    const { rows } = await pool.query(
      'SELECT id, slug, nom FROM hospitals WHERE id = $1',
      [req.body.hospital_id]
    );
    if (!rows[0]) return { error: 'Hôpital introuvable' };
    return { hospitalId: rows[0].id, hospitalSlug: rows[0].slug };
  }

  if (!req.user?.hospital_id) {
    return { error: 'Aucun hôpital associé à votre compte' };
  }
  if (!req.user?.hospital_slug) {
    const { rows } = await pool.query(
      'SELECT slug FROM hospitals WHERE id = $1',
      [req.user.hospital_id]
    );
    if (!rows[0]) return { error: 'Hôpital introuvable' };
    return { hospitalId: req.user.hospital_id, hospitalSlug: rows[0].slug };
  }
  return { hospitalId: req.user.hospital_id, hospitalSlug: req.user.hospital_slug };
}

// Force le @slug côté backend
function normalizeLogin(rawLogin, hospitalSlug) {
  const trimmed = String(rawLogin).trim().toLowerCase();
  if (!trimmed) return { error: 'Login vide' };
  if (trimmed.length > 100) return { error: 'Login trop long (100 caractères max)' };

  const parts = trimmed.split('@');
  if (parts.length > 2) return { error: 'Login invalide (un seul @ autorisé)' };

  if (parts.length === 2) {
    const [userPart, slugPart] = parts;
    if (!userPart) return { error: 'La partie avant @ est vide' };
    if (slugPart !== hospitalSlug) {
      return {
        error: `Le login doit se terminer par @${hospitalSlug}, pas @${slugPart}`,
      };
    }
    return { finalLogin: `${userPart}@${slugPart}` };
  }

  return { finalLogin: `${trimmed}@${hospitalSlug}` };
}

// ============================================================
// GET /api/admin/utilisateurs
// ============================================================
router.get('/utilisateurs', async (req, res) => {
  try {
    // ✅ FIX : garde-fou tenant — un admin sans hospital_id est invalide
    if (!isSuperAdmin(req) && !req.user?.hospital_id) {
      return res.status(403).json({
        error: 'TENANT_MISSING',
        message: 'Aucun hôpital associé à votre compte',
      });
    }

    let query, params;

    if (isSuperAdmin(req)) {
      query = `
        SELECT u.id, u.login, u.nom, u.prenom, u.role, u.actif, u.created_at,
               u.hospital_id, h.slug AS hospital_slug, h.nom AS hospital_nom
        FROM utilisateurs u
        LEFT JOIN hospitals h ON h.id = u.hospital_id
        ORDER BY u.id
      `;
      params = [];
      console.log('🔍 GET /admin/utilisateurs — mode SUPER_ADMIN (pas de filtre)');
    } else {
      // ✅ FIX : on n'expose NI les super_admin NI les orphelins hospital_id IS NULL
      query = `
        SELECT u.id, u.login, u.nom, u.prenom, u.role, u.actif, u.created_at,
               u.hospital_id, h.slug AS hospital_slug, h.nom AS hospital_nom
        FROM utilisateurs u
        LEFT JOIN hospitals h ON h.id = u.hospital_id
        WHERE u.hospital_id = $1
          AND u.role <> 'super_admin'
        ORDER BY u.id
      `;
      params = [req.user.hospital_id];
      console.log('🔍 GET /admin/utilisateurs — filtre hospital_id =', req.user.hospital_id);
    }

    const result = await pool.query(query, params);
    console.log(`🔍 GET /admin/utilisateurs — ${result.rows.length} ligne(s) retournée(s)`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ GET /admin/utilisateurs :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/admin/utilisateurs
// ============================================================
router.post('/utilisateurs', async (req, res) => {
  try {
    const { login, nom, prenom, role, password, actif } = req.body;

    if (!login || !password || !role) {
      return res.status(400).json({ error: 'Login, mot de passe et rôle sont requis' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' });
    }

    if (!isSuperAdmin(req) && ROLES_INTERDITS_HOSPITAL_ADMIN.includes(role)) {
      return res.status(403).json({ error: 'Rôle non autorisé' });
    }

    const target = await resolveTargetHospital(req);
    if (target.error) {
      const status = target.error.includes('super_admin') ? 400 : 403;
      return res.status(status).json({ error: target.error });
    }
    const { hospitalId: finalHospitalId, hospitalSlug: finalHospitalSlug } = target;

    const normalized = normalizeLogin(login, finalHospitalSlug);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }
    const finalLogin = normalized.finalLogin;

    // ✅ FIX : le check d'unicité passe maintenant par withHospitalContext
    //          (sinon RLS bloque et on autorise des doublons)
    const existing = await withHospitalContext(finalHospitalId, (client) =>
      client.query('SELECT id FROM utilisateurs WHERE login = $1', [finalLogin])
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Le login ${finalLogin} existe déjà` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await withHospitalContext(finalHospitalId, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO utilisateurs
           (login, password_hash, nom, prenom, role, actif, hospital_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         RETURNING id, login, nom, prenom, role, actif, hospital_id, created_at`,
        [
          finalLogin,
          hashedPassword,
          nom || null,
          prenom || null,
          role,
          actif !== undefined ? actif : true,
          finalHospitalId,
        ]
      );
      return rows[0];
    });

    console.log(
      `✅ Utilisateur créé : ${finalLogin} (${role}) → hospital_id=${finalHospitalId} (slug=${finalHospitalSlug})`
    );

    res.status(201).json({
      ...inserted,
      hospital_slug: finalHospitalSlug,
    });
  } catch (err) {
    console.error('❌ POST /admin/utilisateurs :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/admin/utilisateurs/:id
// ============================================================
router.put('/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { login, nom, prenom, role, password, actif } = req.body;

    // ✅ FIX : pool.query hérite du tenant via ALS pour les admins
    //          (avec l'ancien pool local, ça renvoyait 0 → 404 à tort)
    const user = await pool.query('SELECT * FROM utilisateurs WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const target = user.rows[0];

    if (!isSuperAdmin(req) && target.hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier un utilisateur d\'un autre hôpital' });
    }

    if (!isSuperAdmin(req) && role && ROLES_INTERDITS_HOSPITAL_ADMIN.includes(role)) {
      return res.status(403).json({ error: 'Rôle non autorisé' });
    }

    let finalLogin;
    if (login !== undefined) {
      const targetHospitalSlug = target.hospital_id
        ? (await pool.query('SELECT slug FROM hospitals WHERE id = $1', [target.hospital_id])).rows[0]?.slug
        : req.user.hospital_slug;
      if (!targetHospitalSlug) {
        return res.status(500).json({ error: 'Hôpital cible introuvable' });
      }
      const normalized = normalizeLogin(login, targetHospitalSlug);
      if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
      }
      finalLogin = normalized.finalLogin;

      if (finalLogin !== target.login) {
        // ✅ FIX : check doublon dans le contexte tenant
        const dup = await withHospitalContext(target.hospital_id, (client) =>
          client.query('SELECT id FROM utilisateurs WHERE login = $1 AND id <> $2', [finalLogin, id])
        );
        if (dup.rows.length > 0) {
          return res.status(409).json({ error: `Le login ${finalLogin} existe déjà` });
        }
      }
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (finalLogin !== undefined) { fields.push(`login = $${paramCount++}`); values.push(finalLogin); }
    if (nom !== undefined) { fields.push(`nom = $${paramCount++}`); values.push(nom); }
    if (prenom !== undefined) { fields.push(`prenom = $${paramCount++}`); values.push(prenom); }
    if (role !== undefined) { fields.push(`role = $${paramCount++}`); values.push(role); }
    if (actif !== undefined) { fields.push(`actif = $${paramCount++}`); values.push(actif); }
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' });
      }
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(hashed);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à modifier' });
    }

    fields.push(`updated_at = now()`);
    values.push(id);

    const query = `
      UPDATE utilisateurs
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, login, nom, prenom, role, actif, hospital_id, created_at
    `;

    const updated = await withHospitalContext(target.hospital_id, async (client) => {
      const { rows } = await client.query(query, values);
      return rows[0];
    });
    res.json(updated);
  } catch (err) {
    console.error('❌ PUT /admin/utilisateurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/admin/utilisateurs/:id
// ============================================================
router.delete('/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // ✅ FIX : hérite du tenant via ALS
    const user = await pool.query('SELECT id, hospital_id FROM utilisateurs WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const target = user.rows[0];

    if (!isSuperAdmin(req) && target.hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer un utilisateur d\'un autre hôpital' });
    }

    const result = await withHospitalContext(target.hospital_id, async (client) => {
      return client.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING id', [id]);
    });
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /admin/utilisateurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/admin/utilisateurs/:id/actif
// ============================================================
router.patch('/utilisateurs/:id/actif', async (req, res) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;

    if (typeof actif !== 'boolean') {
      return res.status(400).json({ error: 'Le champ "actif" doit être un booléen' });
    }

    // ✅ FIX : hérite du tenant via ALS
    const user = await pool.query('SELECT id, hospital_id FROM utilisateurs WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (!isSuperAdmin(req) && user.rows[0].hospital_id !== req.user.hospital_id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas modifier un utilisateur d\'un autre hôpital' });
    }

    const result = await withHospitalContext(user.rows[0].hospital_id, async (client) => {
      return client.query(
        `UPDATE utilisateurs SET actif = $1, updated_at = now() WHERE id = $2
         RETURNING id, login, actif`,
        [actif, id]
      );
    });
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ PATCH /admin/utilisateurs/:id/actif :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;