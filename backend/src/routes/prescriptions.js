const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const bcrypt = require('bcrypt');
const { authenticate, requireRole } = require('../middleware/auth');

// ============================================================
// GET /api/prescriptions – liste complète (toutes les prescriptions)
// ============================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, patient_id } = req.query;
    let query = `
      SELECT p.*,
             u.nom AS doctor_nom, u.prenom AS doctor_prenom,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             (SELECT json_agg(row_to_json(pi)) FROM prescription_items pi WHERE pi.prescription_id = p.id) AS items
      FROM prescriptions p
      JOIN utilisateurs u ON u.id = p.doctor_id
      JOIN patients pat ON pat.id = p.patient_id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }
    if (patient_id) {
      query += ` AND p.patient_id = $${paramCount}`;
      values.push(patient_id);
      paramCount++;
    }
    query += ` ORDER BY p.date_creation DESC`;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ GET /prescriptions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/prescriptions/:id – détail d’une prescription
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*,
             u.nom AS doctor_nom, u.prenom AS doctor_prenom,
             pat.nom AS patient_nom, pat.prenom AS patient_prenom,
             ru.nom AS retrieved_nom, ru.prenom AS retrieved_prenom,
             (SELECT json_agg(row_to_json(pi)) FROM prescription_items pi WHERE pi.prescription_id = p.id) AS items
      FROM prescriptions p
      JOIN utilisateurs u ON u.id = p.doctor_id
      JOIN patients pat ON pat.id = p.patient_id
      LEFT JOIN utilisateurs ru ON ru.id = p.retrieved_by
      WHERE p.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ GET /prescriptions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/prescriptions – création (médecin ou admin)
// ============================================================
router.post('/', authenticate, requireRole(['medecin', 'admin']), async (req, res) => {
  try {
    const { patient_id, items, notes, password } = req.body;

    if (!patient_id || !items || !items.length) {
      return res.status(400).json({ error: 'Patient et au moins un médicament requis' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis pour valider la prescription' });
    }

    const doctor_id = req.user.id;

    // Vérifier le mot de passe du médecin
    const userRes = await db.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [doctor_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const valid = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!valid) {
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }

    const historiqueInitial = [{
      action: 'creation',
      date: new Date().toISOString(),
      utilisateur: `${req.user.prenom} ${req.user.nom}`,
      role: req.user.role
    }];

    const insertResult = await db.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, notes, status, historique)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
      [patient_id, doctor_id, notes, JSON.stringify(historiqueInitial)]
    );
    const prescriptionId = insertResult.rows[0].id;

    for (const item of items) {
      // ✅ Récupérer le produit depuis la table `produits` (catégorie 1 = Médicaments)
      const medRes = await db.query(
        'SELECT id, nom FROM produits WHERE id = $1 AND categorie_id = 1',
        [item.medicament_id]
      );
      if (medRes.rows.length === 0) {
        throw new Error(`Médicament avec ID ${item.medicament_id} non trouvé dans le stock (catégorie Médicaments)`);
      }
      const produit = medRes.rows[0];

      // ✅ Insertion sans `prix_unitaire` (on garde les colonnes existantes)
      await db.query(
        `INSERT INTO prescription_items (prescription_id, medicament, posologie, quantite, served_quantite)
         VALUES ($1, $2, $3, $4, 0)`,
        [prescriptionId, produit.nom, item.posologie || '', item.quantite || 1]
      );
    }

    res.status(201).json({ id: prescriptionId, message: '✅ Prescription créée avec succès' });
  } catch (err) {
    console.error('❌ POST /prescriptions :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PUT /api/prescriptions/:id/serve – marquer comme servie
// ============================================================
router.put('/:id/serve', authenticate, requireRole(['pharmacien', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { password, retrieved_by } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis pour valider la délivrance' });
    }

    const pharmacist_id = req.user.id;

    const userRes = await db.query('SELECT password_hash FROM utilisateurs WHERE id = $1', [pharmacist_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const valid = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!valid) {
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }

    const nouvelEvenement = {
      action: 'delivrance',
      date: new Date().toISOString(),
      utilisateur: `${req.user.prenom} ${req.user.nom}`,
      role: req.user.role
    };

    const result = await db.query(
      `UPDATE prescriptions
       SET status = 'served',
           pharmacist_id = $1,
           date_served = NOW(),
           retrieved_by = $2,
           historique = historique || $3::jsonb
       WHERE id = $4 AND status = 'pending'
       RETURNING id`,
      [pharmacist_id, retrieved_by || null, JSON.stringify([nouvelEvenement]), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prescription non trouvée ou déjà servie' });
    }

    res.json({ message: '✅ Prescription servie avec succès' });
  } catch (err) {
    console.error('❌ PUT /prescriptions/:id/serve :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;