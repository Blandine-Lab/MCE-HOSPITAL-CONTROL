const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth'); // ✅ import requireAdmin
const axios = require('axios');
const crypto = require('crypto');

// ============================================================
// 1. SYSTÈMES EXTERNES
// ============================================================
router.get('/systemes', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM systemes_externes ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/systemes/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM systemes_externes WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Système non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/systemes', authenticate, async (req, res) => {
  try {
    const { nom, code, description, type, url_base, auth_type, auth_config, actif } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO systemes_externes (nom, code, description, type, url_base, auth_type, auth_config, actif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nom, code, description, type, url_base, auth_type, auth_config, actif !== undefined ? actif : true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/systemes/:id', authenticate, async (req, res) => {
  try {
    const { nom, code, description, type, url_base, auth_type, auth_config, actif } = req.body;
    const { rows } = await pool.query(
      `UPDATE systemes_externes SET nom=$1, code=$2, description=$3, type=$4, url_base=$5, auth_type=$6, auth_config=$7, actif=$8
       WHERE id=$9 RETURNING *`,
      [nom, code, description, type, url_base, auth_type, auth_config, actif, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Système non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /systemes/:id – réservé aux administrateurs
router.delete('/systemes/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM systemes_externes WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Système non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 2. FLUX
// ============================================================
router.get('/flux', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, s1.nom as source_nom, s2.nom as dest_nom
      FROM flux_interoperabilite f
      LEFT JOIN systemes_externes s1 ON f.systeme_source_id = s1.id
      LEFT JOIN systemes_externes s2 ON f.systeme_destination_id = s2.id
      ORDER BY f.code
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/flux/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, s1.nom as source_nom, s2.nom as dest_nom
      FROM flux_interoperabilite f
      LEFT JOIN systemes_externes s1 ON f.systeme_source_id = s1.id
      LEFT JOIN systemes_externes s2 ON f.systeme_destination_id = s2.id
      WHERE f.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Flux non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/flux', authenticate, async (req, res) => {
  try {
    const { code, nom, description, systeme_source_id, systeme_destination_id, type_flux, format_donnees, mapping_config, periodicite } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO flux_interoperabilite (code, nom, description, systeme_source_id, systeme_destination_id, type_flux, format_donnees, mapping_config, periodicite, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'actif') RETURNING *`,
      [code, nom, description, systeme_source_id, systeme_destination_id, type_flux, format_donnees, mapping_config, periodicite]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/flux/:id', authenticate, async (req, res) => {
  try {
    const { code, nom, description, systeme_source_id, systeme_destination_id, type_flux, format_donnees, mapping_config, periodicite, statut } = req.body;
    const { rows } = await pool.query(
      `UPDATE flux_interoperabilite SET code=$1, nom=$2, description=$3, systeme_source_id=$4, systeme_destination_id=$5, type_flux=$6, format_donnees=$7, mapping_config=$8, periodicite=$9, statut=$10
       WHERE id=$11 RETURNING *`,
      [code, nom, description, systeme_source_id, systeme_destination_id, type_flux, format_donnees, mapping_config, periodicite, statut, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Flux non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /flux/:id – réservé aux administrateurs
router.delete('/flux/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM flux_interoperabilite WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Flux non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 3. LOGS
// ============================================================
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { direction, systeme_id, date_debut, date_fin } = req.query;
    let query = `
      SELECT l.*, f.nom as flux_nom, s.nom as systeme_nom
      FROM logs_interoperabilite l
      LEFT JOIN flux_interoperabilite f ON l.flux_id = f.id
      LEFT JOIN systemes_externes s ON l.systeme_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (direction) { query += ` AND l.direction = $${idx++}`; params.push(direction); }
    if (systeme_id) { query += ` AND l.systeme_id = $${idx++}`; params.push(systeme_id); }
    if (date_debut) { query += ` AND l.date_action >= $${idx++}`; params.push(date_debut); }
    if (date_fin) { query += ` AND l.date_action <= $${idx++}`; params.push(date_fin); }
    query += ` ORDER BY l.date_action DESC LIMIT 500`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /logs/:id – réservé aux administrateurs
router.delete('/logs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM logs_interoperabilite WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Log non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// 4. WEBHOOKS
// ============================================================
router.get('/webhooks', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM webhooks_entrants ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhooks', authenticate, async (req, res) => {
  try {
    const { nom, description, url_callback } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const { rows } = await pool.query(
      `INSERT INTO webhooks_entrants (nom, description, url_callback, token, actif) VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [nom, description, url_callback, token]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /webhooks/:id – réservé aux administrateurs
router.delete('/webhooks/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM webhooks_entrants WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Webhook non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Point d'entrée public pour recevoir les données (sans auth, protégé par token)
router.post('/webhook/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { rows } = await pool.query('SELECT * FROM webhooks_entrants WHERE token = $1 AND actif = true', [token]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Token invalide ou webhook inactif' });
    }
    await pool.query(
      `INSERT INTO logs_interoperabilite (direction, requete, status_code)
       VALUES ('IN', $1, 200)`,
      [JSON.stringify(req.body)]
    );
    // Ici, vous pouvez appeler un traitement interne ou url_callback
    res.status(200).json({ message: 'Webhook reçu avec succès', data: req.body });
  } catch (err) {
    console.error('Erreur webhook:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// 5. PROXY (appel sortant)
// ============================================================
router.post('/proxy', authenticate, async (req, res) => {
  try {
    const { systeme_id, endpoint, method, data, headers } = req.body;
    const { rows } = await pool.query('SELECT * FROM systemes_externes WHERE id = $1 AND actif = true', [systeme_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Système externe non trouvé ou inactif' });
    const systeme = rows[0];
    const url = systeme.url_base + (endpoint || '');
    const authConfig = systeme.auth_config || {};
    const requestHeaders = { 'Content-Type': 'application/json', ...headers };
    if (systeme.auth_type === 'api_key' && authConfig.api_key) {
      requestHeaders['Authorization'] = `Bearer ${authConfig.api_key}`;
    }

    const startTime = Date.now();
    let response;
    try {
      response = await axios({
        method: method || 'GET',
        url,
        data,
        headers: requestHeaders,
        timeout: 30000
      });
    } catch (err) {
      const duree = Date.now() - startTime;
      await pool.query(
        `INSERT INTO logs_interoperabilite (systeme_id, direction, requete, reponse, status_code, erreur, duree_ms)
         VALUES ($1, 'OUT', $2, $3, $4, $5, $6)`,
        [systeme_id, JSON.stringify({ url, method, data, headers: requestHeaders }), JSON.stringify(err.response?.data || err.message), err.response?.status || 500, err.message, duree]
      );
      return res.status(500).json({ error: 'Erreur lors de l\'appel externe', detail: err.message });
    }
    const duree = Date.now() - startTime;
    await pool.query(
      `INSERT INTO logs_interoperabilite (systeme_id, direction, requete, reponse, status_code, duree_ms)
       VALUES ($1, 'OUT', $2, $3, $4, $5)`,
      [systeme_id, JSON.stringify({ url, method, data, headers: requestHeaders }), JSON.stringify(response.data), response.status, duree]
    );
    res.json(response.data);
  } catch (err) {
    console.error('Erreur proxy:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;