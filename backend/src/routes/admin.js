const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { authenticate, requireRole } = require('../middleware/auth');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Admin : connecté à PostgreSQL'));

// Toutes ces routes sont réservées à l'admin
router.use(authenticate);
router.use(requireRole(['admin']));

// GET /api/admin/utilisateurs – liste des utilisateurs
router.get('/utilisateurs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, login, nom, prenom, role, actif, created_at
       FROM utilisateurs
       ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /admin/utilisateurs :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/utilisateurs – créer un utilisateur
router.post('/utilisateurs', async (req, res) => {
  try {
    const { login, nom, prenom, role, password, actif } = req.body;

    if (!login || !password || !role) {
      return res.status(400).json({ error: 'Login, mot de passe et rôle sont requis' });
    }

    // Vérifier si le login existe déjà
    const check = await pool.query('SELECT id FROM utilisateurs WHERE login = $1', [login]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'Ce login est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO utilisateurs (login, password_hash, nom, prenom, role, actif)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, login, nom, prenom, role, actif, created_at`,
      [login, hashedPassword, nom || null, prenom || null, role, actif !== undefined ? actif : true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /admin/utilisateurs :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/utilisateurs/:id – modifier un utilisateur
router.put('/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { login, nom, prenom, role, password, actif } = req.body;

    const user = await pool.query('SELECT * FROM utilisateurs WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (login !== undefined) { fields.push(`login = $${paramCount++}`); values.push(login); }
    if (nom !== undefined) { fields.push(`nom = $${paramCount++}`); values.push(nom); }
    if (prenom !== undefined) { fields.push(`prenom = $${paramCount++}`); values.push(prenom); }
    if (role !== undefined) { fields.push(`role = $${paramCount++}`); values.push(role); }
    if (actif !== undefined) { fields.push(`actif = $${paramCount++}`); values.push(actif); }
    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(hashed);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à modifier' });
    }

    values.push(id);
    const query = `
      UPDATE utilisateurs
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, login, nom, prenom, role, actif, created_at
    `;
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /admin/utilisateurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/utilisateurs/:id
router.delete('/utilisateurs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    const result = await pool.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /admin/utilisateurs/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/utilisateurs/:id/actif
router.patch('/utilisateurs/:id/actif', async (req, res) => {
  try {
    const { id } = req.params;
    const { actif } = req.body;
    if (typeof actif !== 'boolean') {
      return res.status(400).json({ error: 'Le champ "actif" doit être un booléen' });
    }
    const result = await pool.query(
      `UPDATE utilisateurs SET actif = $1 WHERE id = $2
       RETURNING id, login, actif`,
      [actif, id]
    );
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