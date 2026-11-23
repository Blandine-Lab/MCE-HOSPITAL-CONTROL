// src/routes/prescriptions.js
// ============================================================
// 📝 PRESCRIPTIONS / ORDONNANCES
// ------------------------------------------------------------
// ⚠️ Le pool patché pose `app.hospital_id` via ALS, MAIS le RLS
//    a été mis en NO FORCE + policy tenant_isolation supprimée.
//    On filtre donc explicitement TOUTES les routes sur
//    `req.hospitalId` (JWT) pour garantir l'isolation tenant.
// ============================================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

router.use(authenticate);

// ============================================================
// Helpers
// ============================================================
async function setTenant(client, hospitalId) {
  await client.query(
    `SELECT set_config('app.hospital_id', $1, true)`,
    [String(hospitalId)]
  );
}

function requireHospital(req, res, next) {
  if (!req.hospitalId) {
    return res.status(403).json({
      error: 'Contexte hôpital manquant',
      code: 'TENANT_MISSING',
    });
  }
  next();
}

async function audit(req, action, table, recordId, details = {}) {
  try {
    await logAudit({
      userId: req.user?.id,
      action,
      tableCible: table,
      recordId,
      details,
      ip: req.ip,
      hospitalId: req.hospitalId,
    });
  } catch (e) {
    console.warn('⚠️ logAudit non bloquant :', e.message);
  }
}

function buildHistorique(o, dateDelivrance = null) {
  const events = [];

  if (o.date_creation) {
    events.push({
      action: 'creation',
      date: o.date_creation,
      utilisateur: o.medecin_prenom
        ? `Dr. ${o.medecin_prenom} ${o.medecin_nom || ''}`.trim()
        : 'Médecin',
      role: 'medecin'
    });
  }

  if (['delivree', 'servie', 'partiellement_delivree'].includes(o.statut)) {
    events.push({
      action: 'delivrance',
      date: dateDelivrance || o.date_creation,
      utilisateur: o.retrieved_prenom
        ? `${o.retrieved_prenom} ${o.retrieved_nom || ''}`.trim()
        : 'Pharmacie',
      role: 'infirmier',
      statut: o.statut
    });
  }

  return events;
}

// ============================================================
// GET /historique — DOIT être avant /:id
// ============================================================
router.get('/historique', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const { rows } = await client.query(`
      SELECT
        o.id, o.numero_ordonnance, o.date_creation, o.statut,
        o.observations, o.medecin_id, o.patient_id, o.retrieved_by,
        p.nom    AS patient_nom,
        p.prenom AS patient_prenom,
        p.ipp,
        m.nom    AS medecin_nom,
        m.prenom AS medecin_prenom,
        u.nom    AS retrieved_nom,
        u.prenom AS retrieved_prenom,
        (SELECT COUNT(*) FROM ligne_ordonnances lo
          WHERE lo.ordonnance_id = o.id AND lo.hospital_id = $1) AS nb_medicaments
      FROM ordonnances o
      JOIN patients p ON p.id = o.patient_id AND p.hospital_id = $1
      LEFT JOIN medecins m ON m.id = o.medecin_id AND m.hospital_id = $1
      LEFT JOIN utilisateurs u ON u.id = o.retrieved_by AND u.hospital_id = $1
      WHERE o.hospital_id = $1
        AND o.statut IN ('delivree', 'servie', 'partiellement_delivree')
      ORDER BY o.date_creation DESC
      LIMIT $2
    `, [req.hospitalId, limit]);

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ GET /prescriptions/historique :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /stats — Statistiques dashboard
// ============================================================
router.get('/stats', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const [total, attente, delivrees, ceMois] = await Promise.all([
      client.query('SELECT COUNT(*) FROM ordonnances WHERE hospital_id = $1', [req.hospitalId]),
      client.query("SELECT COUNT(*) FROM ordonnances WHERE hospital_id = $1 AND statut = 'en_attente'", [req.hospitalId]),
      client.query("SELECT COUNT(*) FROM ordonnances WHERE hospital_id = $1 AND statut IN ('delivree','servie','partiellement_delivree')", [req.hospitalId]),
      client.query("SELECT COUNT(*) FROM ordonnances WHERE hospital_id = $1 AND date_creation >= date_trunc('month', NOW())", [req.hospitalId])
    ]);

    await client.query('COMMIT');
    res.json({
      total: parseInt(total.rows[0].count, 10),
      enAttente: parseInt(attente.rows[0].count, 10),
      delivrees: parseInt(delivrees.rows[0].count, 10),
      ceMois: parseInt(ceMois.rows[0].count, 10)
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ GET /prescriptions/stats :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /:id/historique — AVANT /:id
// ============================================================
router.get('/:id/historique', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const { rows } = await client.query(`
      SELECT
        o.id, o.numero_ordonnance, o.date_creation, o.statut,
        o.medecin_id, o.retrieved_by,
        p.nom    AS patient_nom,
        p.prenom AS patient_prenom,
        m.nom    AS medecin_nom,
        m.prenom AS medecin_prenom,
        u.nom    AS retrieved_nom,
        u.prenom AS retrieved_prenom
      FROM ordonnances o
      JOIN patients p ON p.id = o.patient_id AND p.hospital_id = $2
      LEFT JOIN medecins m ON m.id = o.medecin_id AND m.hospital_id = $2
      LEFT JOIN utilisateurs u ON u.id = o.retrieved_by AND u.hospital_id = $2
      WHERE o.id = $1 AND o.hospital_id = $2
    `, [req.params.id, req.hospitalId]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ordonnance non trouvée' });
    }

    const ord = rows[0];

    // Date de délivrance — sous-requête scopée au tenant
    let dateDelivrance = null;
    try {
      const ms = await client.query(`
        SELECT MIN(created_at) AS date_delivrance
        FROM mouvements_stock
        WHERE type = 'sortie'
          AND hospital_id = $2
          AND ligne_ordonnance_id IN (
            SELECT id FROM ligne_ordonnances
            WHERE ordonnance_id = $1 AND hospital_id = $2
          )
      `, [req.params.id, req.hospitalId]);
      dateDelivrance = ms.rows[0]?.date_delivrance || null;
    } catch (e) {
      console.warn('⚠️ Date de délivrance indisponible :', e.message);
    }

    await client.query('COMMIT');

    res.json({
      id: ord.id,
      numero_ordonnance: ord.numero_ordonnance,
      statut: ord.statut,
      patient: `${ord.patient_prenom || ''} ${ord.patient_nom || ''}`.trim(),
      medecin: ord.medecin_prenom
        ? `Dr. ${ord.medecin_prenom} ${ord.medecin_nom || ''}`.trim()
        : '—',
      historique: buildHistorique(ord, dateDelivrance)
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ GET /prescriptions/:id/historique :', err);
    res.status(500).json({ error: err.message, code: err.code, detail: err.detail });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /:id/lignes — AVANT /:id
// ============================================================
router.get('/:id/lignes', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const { rows } = await client.query(`
      SELECT
        lo.id, lo.medicament_id, lo.quantite_prescrit, lo.quantite_delivree, lo.posologie,
        med.nom     AS medicament,
        med.code    AS medicament_code,
        med.forme, med.dosage, med.unite
      FROM ligne_ordonnances lo
      JOIN medicaments med ON med.id = lo.medicament_id AND med.hospital_id = $2
      JOIN ordonnances o ON o.id = lo.ordonnance_id AND o.hospital_id = $2
      WHERE lo.ordonnance_id = $1 AND lo.hospital_id = $2
      ORDER BY lo.id
    `, [req.params.id, req.hospitalId]);

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ GET /prescriptions/:id/lignes :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// GET / — Liste des prescriptions
// ============================================================
router.get('/', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const { status, patient_id, medecin_id, date_debut, date_fin } = req.query;
    const conditions = ['o.hospital_id = $1'];
    const params = [req.hospitalId];
    let idx = 2;

    if (req.user.role === 'medecin') {
      const m = await client.query(
        'SELECT id FROM medecins WHERE user_id = $1 AND hospital_id = $2',
        [req.user.id, req.hospitalId]
      );
      if (m.rows.length > 0) {
        conditions.push(`o.medecin_id = $${idx++}`);
        params.push(m.rows[0].id);
      } else {
        conditions.push('1 = 0');
      }
    } else if (medecin_id) {
      conditions.push(`o.medecin_id = $${idx++}`);
      params.push(parseInt(medecin_id, 10));
    }

    if (patient_id) { conditions.push(`o.patient_id = $${idx++}`); params.push(parseInt(patient_id, 10)); }
    if (status) { conditions.push(`o.statut = $${idx++}`); params.push(status); }
    if (date_debut) { conditions.push(`o.date_creation >= $${idx++}`); params.push(date_debut); }
    if (date_fin) { conditions.push(`o.date_creation <= $${idx++}`); params.push(date_fin); }

    const { rows } = await client.query(`
      SELECT
        o.id, o.numero_ordonnance, o.date_creation,
        o.date_creation AS created_at,
        o.statut, o.statut AS status,
        o.observations, o.observations AS notes,
        o.medecin_id, o.medecin_id AS doctor_id,
        o.patient_id, o.retrieved_by,
        p.nom    AS patient_nom,
        p.prenom AS patient_prenom,
        m.nom    AS medecin_nom,
        m.prenom AS medecin_prenom,
        m.nom    AS doctor_nom,
        m.prenom AS doctor_prenom,
        u.nom    AS retrieved_nom,
        u.prenom AS retrieved_prenom,
        (SELECT COUNT(*) FROM ligne_ordonnances lo
          WHERE lo.ordonnance_id = o.id AND lo.hospital_id = $1) AS nb_medicaments,
        COALESCE(
          (SELECT json_agg(row_to_json(t))
             FROM (
               SELECT lo.id,
                      med.nom AS medicament,
                      lo.posologie,
                      lo.quantite_prescrit AS quantite,
                      lo.quantite_delivree AS served_quantite,
                      lo.medicament_id
               FROM ligne_ordonnances lo
               JOIN medicaments med ON med.id = lo.medicament_id AND med.hospital_id = $1
               WHERE lo.ordonnance_id = o.id AND lo.hospital_id = $1
             ) t),
          '[]'::json
        ) AS items
      FROM ordonnances o
      JOIN patients p ON p.id = o.patient_id AND p.hospital_id = $1
      LEFT JOIN medecins m ON m.id = o.medecin_id AND m.hospital_id = $1
      LEFT JOIN utilisateurs u ON u.id = o.retrieved_by AND u.hospital_id = $1
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.date_creation DESC
      LIMIT 200
    `, params);

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ GET /prescriptions :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// GET /:id — Détail complet
// ============================================================
router.get('/:id', requireHospital, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const { rows } = await client.query(`
      SELECT
        o.id, o.numero_ordonnance, o.date_creation,
        o.date_creation AS created_at,
        o.statut, o.statut AS status,
        o.observations, o.observations AS notes,
        o.medecin_id, o.medecin_id AS doctor_id,
        o.patient_id, o.retrieved_by,
        p.nom    AS patient_nom,
        p.prenom AS patient_prenom,
        p.ipp,
        m.nom    AS medecin_nom,
        m.prenom AS medecin_prenom,
        m.nom    AS doctor_nom,
        m.prenom AS doctor_prenom,
        u.nom    AS retrieved_nom,
        u.prenom AS retrieved_prenom
      FROM ordonnances o
      JOIN patients p ON p.id = o.patient_id AND p.hospital_id = $2
      LEFT JOIN medecins m ON m.id = o.medecin_id AND m.hospital_id = $2
      LEFT JOIN utilisateurs u ON u.id = o.retrieved_by AND u.hospital_id = $2
      WHERE o.id = $1 AND o.hospital_id = $2
    `, [req.params.id, req.hospitalId]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Prescription non trouvée' });
    }

    const ord = rows[0];

    const lignesRes = await client.query(`
      SELECT
        lo.id, lo.medicament_id, lo.quantite_prescrit, lo.quantite_delivree, lo.posologie,
        med.nom AS medicament,
        med.code AS medicament_code,
        med.forme, med.dosage, med.unite
      FROM ligne_ordonnances lo
      JOIN medicaments med ON med.id = lo.medicament_id AND med.hospital_id = $2
      WHERE lo.ordonnance_id = $1 AND lo.hospital_id = $2
      ORDER BY lo.id
    `, [req.params.id, req.hospitalId]);

    await client.query('COMMIT');
    res.json({ ...ord, items: lignesRes.rows, lignes: lignesRes.rows });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ GET /prescriptions/:id :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// POST / — Création ordonnance
// ⚠️ Vérifications d'appartenance patient + médicaments + médecin
// ============================================================
router.post('/', requireHospital, requireRole(['medecin', 'admin']), async (req, res) => {
  const { patient_id, medecin_id, items, lignes, notes, observations, password } = req.body;
  const finalItems = items || lignes || [];

  if (!patient_id || !finalItems.length) {
    return res.status(400).json({ error: 'Patient et au moins un médicament requis' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis pour valider la prescription' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    // Vérification mot de passe
    const userRes = await client.query(
      'SELECT password_hash FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
      [req.user.id, req.hospitalId]
    );
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const valid = await bcrypt.compare(password, userRes.rows[0].password_hash || '');
    if (!valid) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }

    // Vérifier patient du tenant
    const patCheck = await client.query(
      'SELECT id FROM patients WHERE id = $1 AND hospital_id = $2',
      [patient_id, req.hospitalId]
    );
    if (patCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Patient non trouvé dans cet établissement' });
    }

    // Déterminer le médecin (et vérifier son appartenance)
    let finalMedecinId = medecin_id;
    if (!finalMedecinId) {
      const m = await client.query(
        'SELECT id FROM medecins WHERE user_id = $1 AND hospital_id = $2',
        [req.user.id, req.hospitalId]
      );
      if (m.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Profil médecin introuvable pour cet utilisateur.' });
      }
      finalMedecinId = m.rows[0].id;
    } else {
      const medCheck = await client.query(
        'SELECT id FROM medecins WHERE id = $1 AND hospital_id = $2',
        [finalMedecinId, req.hospitalId]
      );
      if (medCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Médecin non trouvé dans cet établissement' });
      }
    }

    // Vérifier tous les médicaments appartiennent au tenant
    const medIds = finalItems.map(i => i.medicament_id).filter(Boolean);
    if (medIds.length > 0) {
      const medsCheck = await client.query(
        'SELECT id FROM medicaments WHERE id = ANY($1::int[]) AND hospital_id = $2',
        [medIds, req.hospitalId]
      );
      if (medsCheck.rowCount !== new Set(medIds).size) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Un ou plusieurs médicaments n\'appartiennent pas à cet établissement' });
      }
    }

    const numero = `ORD-${Date.now()}`;
    const ord = await client.query(`
      INSERT INTO ordonnances (hospital_id, patient_id, medecin_id, numero_ordonnance, observations, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.hospitalId, patient_id, finalMedecinId, numero, observations || notes || null, req.user.id]);

    const ordonnanceId = ord.rows[0].id;

    for (const item of finalItems) {
      await client.query(`
        INSERT INTO ligne_ordonnances (hospital_id, ordonnance_id, medicament_id, quantite_prescrit, posologie)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        req.hospitalId,
        ordonnanceId,
        item.medicament_id,
        item.quantite_prescrit || item.quantite || 1,
        item.posologie || null
      ]);
    }

    await client.query('COMMIT');
    await audit(req, 'CREATE_ORDONNANCE', 'ordonnances', ordonnanceId, { patient_id, medecin_id: finalMedecinId });
    res.status(201).json({ id: ordonnanceId, ...ord.rows[0], message: '✅ Prescription créée avec succès' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ POST /prescriptions :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /:id/serve — Marquer comme servie
// ============================================================
router.put('/:id/serve', requireHospital, requireRole(['pharmacien', 'admin']), async (req, res) => {
  const { password, retrieved_by } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis pour valider la délivrance' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const userRes = await client.query(
      'SELECT password_hash FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
      [req.user.id, req.hospitalId]
    );
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const valid = await bcrypt.compare(password, userRes.rows[0].password_hash || '');
    if (!valid) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }

    // Vérifier retrieved_by appartient au tenant si fourni
    if (retrieved_by) {
      const rCheck = await client.query(
        'SELECT id FROM utilisateurs WHERE id = $1 AND hospital_id = $2',
        [retrieved_by, req.hospitalId]
      );
      if (rCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Utilisateur récupérateur non trouvé' });
      }
    }

    const result = await client.query(`
      UPDATE ordonnances
      SET statut = 'delivree', retrieved_by = $1
      WHERE id = $2 AND hospital_id = $3 AND statut = 'en_attente'
      RETURNING id
    `, [retrieved_by || null, req.params.id, req.hospitalId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Prescription non trouvée ou déjà servie' });
    }

    await client.query('COMMIT');
    await audit(req, 'SERVE_ORDONNANCE', 'ordonnances', req.params.id, { retrieved_by });
    res.json({ message: '✅ Prescription servie avec succès' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ PUT /prescriptions/:id/serve :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// PUT /:id/statut — Changer statut (admin)
// ============================================================
router.put('/:id/statut', requireHospital, requireRole(['admin']), async (req, res) => {
  const { statut } = req.body;
  const statutsValides = ['en_attente', 'delivree', 'servie', 'partiellement_delivree', 'annulee'];
  if (!statutsValides.includes(statut)) {
    return res.status(400).json({ error: `Statut invalide. Valeurs : ${statutsValides.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const result = await client.query(`
      UPDATE ordonnances SET statut = $1 WHERE id = $2 AND hospital_id = $3
    `, [statut, req.params.id, req.hospitalId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Prescription non trouvée' });
    }

    await client.query('COMMIT');
    await audit(req, 'UPDATE_ORDONNANCE_STATUT', 'ordonnances', req.params.id, { statut });
    res.json({ message: '✅ Statut mis à jour' });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ PUT /prescriptions/:id/statut :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// DELETE /:id — Supprimer (admin, si en_attente)
// ============================================================
router.delete('/:id', requireHospital, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenant(client, req.hospitalId);

    const check = await client.query(
      'SELECT statut FROM ordonnances WHERE id = $1 AND hospital_id = $2',
      [req.params.id, req.hospitalId]
    );
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Prescription non trouvée' });
    }
    if (check.rows[0].statut !== 'en_attente') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Impossible de supprimer une ordonnance déjà délivrée' });
    }

    await client.query('DELETE FROM ligne_ordonnances WHERE ordonnance_id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);
    await client.query('DELETE FROM ordonnances WHERE id = $1 AND hospital_id = $2', [req.params.id, req.hospitalId]);

    await client.query('COMMIT');
    await audit(req, 'DELETE_ORDONNANCE', 'ordonnances', req.params.id, {});
    res.status(204).send();
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ DELETE /prescriptions/:id :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;