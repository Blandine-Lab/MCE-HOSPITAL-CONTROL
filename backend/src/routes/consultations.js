const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole, requireAdmin } = require('../middleware/auth');

// ========== RENDEZ-VOUS (LISTE AVEC NOUVEAUX CHAMPS) ==========
router.get('/rendezvous', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT rv.*, p.nom AS patient_nom, p.prenom AS patient_prenom, 
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             rv.type_consultation, rv.categorie, rv.prix
      FROM rendez_vous rv
      JOIN patients p ON rv.patient_id = p.id
      LEFT JOIN medecins m ON rv.medecin_id = m.id
      ORDER BY rv.date_rdv DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRÉATION RENDEZ-VOUS AVEC NOUVEAUX CHAMPS ==========
router.post('/rendezvous', authenticate, async (req, res) => {
  const { patient_id, medecin_id, service_id, date_rdv, motif, type_consultation, categorie, prix } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO rendez_vous (patient_id, medecin_id, service_id, date_rdv, motif, type_consultation, categorie, prix)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [patient_id, medecin_id, service_id, date_rdv, motif, type_consultation || 'générale', categorie || 'ambulatoire', prix || 50.00]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== MISE À JOUR STATUT ==========
router.put('/rendezvous/:id', authenticate, async (req, res) => {
  const { statut, rappel_envoye, email_envoye, sms_envoye } = req.body;
  try {
    await pool.query(`
      UPDATE rendez_vous SET statut=$1, rappel_envoye=$2, email_envoye=$3, sms_envoye=$4
      WHERE id=$5
    `, [statut, rappel_envoye, email_envoye, sms_envoye, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== RENDEZ-VOUS D'UN PATIENT (POUR FACTURATION) ==========
router.get('/rendezvous/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT rv.id, rv.date_rdv, rv.motif, rv.medecin_id, rv.service_id,
             p.nom AS patient_nom, p.prenom AS patient_prenom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             rv.type_consultation, rv.categorie, rv.prix,
             rv.statut
      FROM rendez_vous rv
      JOIN patients p ON rv.patient_id = p.id
      LEFT JOIN medecins m ON rv.medecin_id = m.id
      WHERE rv.patient_id = $1
        AND rv.statut NOT IN ('annulé')
      ORDER BY rv.date_rdv DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== URGENCES ==========
router.get('/urgences', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.*, p.nom AS patient_nom, p.prenom AS patient_prenom
      FROM urgences u
      LEFT JOIN patients p ON u.patient_id = p.id
      ORDER BY u.priorite ASC, u.heure_arrivee DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/urgences', authenticate, async (req, res) => {
  const { patient_id, niveau, priorite, motif } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO urgences (patient_id, niveau, priorite, motif, heure_arrivee, statut)
      VALUES ($1, $2, $3, $4, NOW(), 'en_attente') RETURNING *
    `, [patient_id, niveau, priorite, motif]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/urgences/:id', authenticate, async (req, res) => {
  const { statut, triage_effectue_par } = req.body;
  try {
    await pool.query(`
      UPDATE urgences SET statut=$1, triage_effectue_par=$2 WHERE id=$3
    `, [statut, triage_effectue_par, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LITS DISPONIBLES ==========
router.get('/lits/disponibles', authenticate, async (req, res) => {
  const { service_id } = req.query;
  try {
    let query = `
      SELECT l.*, s.nom AS service_nom, c.nom AS chambre_nom, c.type AS chambre_type
      FROM lits l
      LEFT JOIN services s ON l.service_id = s.id
      LEFT JOIN chambres c ON l.chambre_id = c.id
      WHERE l.disponible = true
    `;
    const params = [];
    if (service_id) {
      query += ` AND l.service_id = $1`;
      params.push(service_id);
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMISSIONS (POST) ==========
router.post('/admissions', authenticate, async (req, res) => {
  const { patient_id, lit_id, service_id, motif, medecin_referent_id } = req.body;
  if (!patient_id || !lit_id || !service_id || !motif) {
    return res.status(400).json({ error: 'patient_id, lit_id, service_id et motif sont requis' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO admissions (patient_id, lit_id, date_admission, motif, service_id, medecin_referent_id, type)
      VALUES ($1, $2, NOW(), $3, $4, $5, 'admission') RETURNING *
    `, [patient_id, lit_id, motif, service_id, medecin_referent_id || null]);
    await client.query(`UPDATE lits SET disponible = false, patient_id = $1 WHERE id = $2`, [patient_id, lit_id]);
    await client.query(`UPDATE patients SET lit_id = $1, statut = 'hospitalise' WHERE id = $2`, [lit_id, patient_id]);
    await client.query(`
      INSERT INTO sejours (patient_id, admission_id, lit_id, date_debut, statut)
      VALUES ($1, $2, $3, NOW(), 'en_cours')
    `, [patient_id, rows[0].id, lit_id]);
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== LISTE COMPLÈTE DES ADMISSIONS ==========
router.get('/admissions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom, p.ipp,
             s.nom AS service_nom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN medecins m ON a.medecin_referent_id = m.id
      ORDER BY a.date_admission DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LISTE DES PATIENTS HOSPITALISÉS ==========
router.get('/patients/hospitalises', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.nom, p.prenom, p.ipp, l.id AS lit_id, l.numero AS lit_numero, c.nom AS chambre_nom
      FROM patients p
      JOIN lits l ON p.lit_id = l.id
      LEFT JOIN chambres c ON l.chambre_id = c.id
      WHERE p.statut = 'hospitalise'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMISSIONS EN COURS (pour sortie) ==========
router.get('/admissions/en_cours', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.date_admission, s.nom AS service_nom
      FROM admissions a
      JOIN services s ON a.service_id = s.id
      WHERE a.type != 'sortie'
      ORDER BY a.date_admission DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMISSIONS D'UN PATIENT ==========
router.get('/admissions/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.date_admission, s.nom AS service_nom
      FROM admissions a
      JOIN services s ON a.service_id = s.id
      WHERE a.patient_id = $1
      ORDER BY a.date_admission DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CONSULTATIONS D'UN PATIENT ==========
router.get('/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { rows } = await pool.query(`
      SELECT c.*, 
             m.nom AS medecin_nom, m.prenom AS medecin_prenom
      FROM consultations c
      LEFT JOIN medecins m ON c.medecin_id = m.id
      WHERE c.patient_id = $1
      ORDER BY c.date DESC
    `, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error('GET consultations/patient/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PRESCRIPTIONS D'UN PATIENT (CORRIGÉ) ==========
router.get('/prescriptions/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, 
             u.nom AS medecin_nom, u.prenom AS medecin_prenom,
             COALESCE(
               (SELECT json_agg(row_to_json(pi)) FROM prescription_items pi WHERE pi.prescription_id = p.id),
               '[]'::json
             ) AS items
      FROM prescriptions p
      LEFT JOIN utilisateurs u ON p.doctor_id = u.id
      WHERE p.patient_id = $1
      ORDER BY p.date_creation DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /prescriptions/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ORDONNANCES D'UN PATIENT (CORRIGÉ) ==========
router.get('/ordonnances/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, 
             u.nom AS medecin_nom, u.prenom AS medecin_prenom
      FROM ordonnances o
      LEFT JOIN utilisateurs u ON o.medecin_id = u.id
      WHERE o.patient_id = $1
      ORDER BY o.date_prescription DESC
    `, [req.params.patientId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /ordonnances/patient/:patientId :', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== TRANSFERT ==========
router.post('/transferts', authenticate, async (req, res) => {
  const { patient_id, nouveau_lit_id, nouveau_service_id, motif } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ancienLitRes = await client.query('SELECT lit_id FROM patients WHERE id = $1', [patient_id]);
    const ancienLitId = ancienLitRes.rows[0]?.lit_id;
    if (!ancienLitId) return res.status(400).json({ error: 'Patient non hospitalisé' });
    const ancienServiceRes = await client.query('SELECT service_id FROM lits WHERE id = $1', [ancienLitId]);
    const ancienServiceId = ancienServiceRes.rows[0]?.service_id;
    const newAdmission = await client.query(`
      INSERT INTO admissions (patient_id, lit_id, date_admission, motif, service_id, type, source_service_id)
      VALUES ($1, $2, NOW(), $3, $4, 'transfert', $5) RETURNING id
    `, [patient_id, nouveau_lit_id, motif, nouveau_service_id, ancienServiceId]);
    await client.query('UPDATE lits SET disponible = true, patient_id = NULL WHERE id = $1', [ancienLitId]);
    await client.query('UPDATE lits SET disponible = false, patient_id = $1 WHERE id = $2', [patient_id, nouveau_lit_id]);
    await client.query('UPDATE patients SET lit_id = $1 WHERE id = $2', [nouveau_lit_id, patient_id]);
    await client.query(`UPDATE sejours SET date_fin = NOW(), statut = 'termine' WHERE patient_id = $1 AND statut = 'en_cours'`, [patient_id]);
    await client.query(`
      INSERT INTO sejours (patient_id, admission_id, lit_id, date_debut, statut)
      VALUES ($1, $2, $3, NOW(), 'en_cours')
    `, [patient_id, newAdmission.rows[0].id, nouveau_lit_id]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Transfert effectué' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== SORTIE ==========
router.post('/sorties', authenticate, async (req, res) => {
  const { patient_id, admission_id, mode_sortie, remarques } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const litRes = await client.query('SELECT lit_id FROM patients WHERE id = $1', [patient_id]);
    const litId = litRes.rows[0]?.lit_id;
    if (litId) {
      await client.query('UPDATE lits SET disponible = true, patient_id = NULL WHERE id = $1', [litId]);
    }
    await client.query('UPDATE patients SET date_sortie = NOW(), statut = $1, lit_id = NULL WHERE id = $2', ['sorti', patient_id]);
    await client.query(`UPDATE sejours SET date_fin = NOW(), statut = 'termine' WHERE patient_id = $1 AND statut = 'en_cours'`, [patient_id]);
    await client.query(`
      INSERT INTO sorties (admission_id, date_sortie, mode_sortie, remarques)
      VALUES ($1, NOW(), $2, $3)
    `, [admission_id, mode_sortie, remarques]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Sortie enregistrée' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ========== SERVICES & MÉDECINS (public) ==========
router.get('/services', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom FROM services ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/medecins', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom, prenom FROM medecins ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRUD SERVICES ==========
router.get('/services/all', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom FROM services ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/services', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  try {
    const { rows } = await pool.query('INSERT INTO services (nom) VALUES ($1) RETURNING *', [nom]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/services/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  try {
    const result = await pool.query('UPDATE services SET nom = $1 WHERE id = $2', [nom, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /services/:id – réservé aux administrateurs
router.delete('/services/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const lits = await pool.query('SELECT id FROM lits WHERE service_id = $1', [req.params.id]);
    if (lits.rowCount > 0) return res.status(400).json({ error: 'Ce service est utilisé par des lits' });
    const result = await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRUD MÉDECINS ==========
router.get('/medecins/all', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, nom, prenom, specialite, email FROM medecins ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/medecins', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email } = req.body;
  if (!nom || !prenom) return res.status(400).json({ error: 'Nom et prénom requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO medecins (nom, prenom, specialite, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, prenom, specialite, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/medecins/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE medecins SET nom=$1, prenom=$2, specialite=$3, email=$4 WHERE id=$5',
      [nom, prenom, specialite, email, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médecin non trouvé' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /medecins/:id – réservé aux administrateurs
router.delete('/medecins/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const adm = await pool.query('SELECT id FROM admissions WHERE medecin_referent_id = $1', [req.params.id]);
    if (adm.rowCount > 0) return res.status(400).json({ error: 'Ce médecin est référent dans des admissions' });
    const result = await pool.query('DELETE FROM medecins WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médecin non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRUD BÂTIMENTS ==========
router.get('/batiments', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM batiments ORDER BY nom');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batiments', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom } = req.body;
  try {
    const { rows } = await pool.query('INSERT INTO batiments (nom) VALUES ($1) RETURNING *', [nom]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /batiments/:id – réservé aux administrateurs
router.delete('/batiments/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM batiments WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRUD ÉTAGES ==========
router.get('/etages', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, b.nom AS batiment_nom 
      FROM etages e 
      LEFT JOIN batiments b ON e.batiment_id = b.id 
      ORDER BY b.nom, e.numero
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/etages', authenticate, requireRole(['admin']), async (req, res) => {
  const { batiment_id, numero } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO etages (batiment_id, numero) VALUES ($1, $2) RETURNING *',
      [batiment_id, numero]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /etages/:id – réservé aux administrateurs
router.delete('/etages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM etages WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRUD CHAMBRES ==========
router.get('/chambres/list', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, b.nom AS batiment_nom, e.numero AS etage_numero
      FROM chambres c
      LEFT JOIN batiments b ON c.batiment_id = b.id
      LEFT JOIN etages e ON c.etage_id = e.id
      ORDER BY b.nom, e.numero, c.nom
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/chambres', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, batiment_id, etage_id, type, capacite } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO chambres (nom, batiment_id, etage_id, type, capacite)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [nom, batiment_id, etage_id, type, capacite]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /chambres/:id – réservé aux administrateurs
router.delete('/chambres/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const lits = await pool.query('SELECT id FROM lits WHERE chambre_id = $1', [req.params.id]);
    if (lits.rowCount > 0) {
      return res.status(400).json({ error: 'Cette chambre contient des lits. Supprimez d’abord les lits.' });
    }
    await pool.query('DELETE FROM chambres WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CRUD LITS ==========
router.get('/lits/all', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT l.*, c.nom AS chambre_nom 
      FROM lits l 
      LEFT JOIN chambres c ON l.chambre_id = c.id 
      ORDER BY c.nom, l.numero
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lits', authenticate, requireRole(['admin']), async (req, res) => {
  console.log('📥 Données reçues POST /lits:', req.body);
  const { chambre_id, numero, statut } = req.body;
  if (!chambre_id || !numero) {
    return res.status(400).json({ error: 'chambre_id et numero sont requis' });
  }
  try {
    const disponible = (statut !== 'occupe');
    const { rows } = await pool.query(`
      INSERT INTO lits (chambre_id, numero, statut, disponible)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [chambre_id, numero, statut || 'libre', disponible]);
    console.log('✅ Lit créé :', rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ Erreur SQL POST /lits:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /lits/:id – réservé aux administrateurs
router.delete('/lits/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const patient = await pool.query('SELECT id FROM patients WHERE lit_id = $1', [req.params.id]);
    if (patient.rowCount > 0) {
      return res.status(400).json({ error: 'Ce lit est actuellement occupé par un patient.' });
    }
    await pool.query('DELETE FROM lits WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/lits/:id', authenticate, requireRole(['admin']), async (req, res) => {
  const { statut, disponible } = req.body;
  try {
    await pool.query('UPDATE lits SET statut=$1, disponible=$2 WHERE id=$3', [statut, disponible, req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== INTERVENTIONS ==========
router.get('/interventions', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.*, p.nom AS patient_nom, p.prenom AS patient_prenom,
             m.nom AS medecin_nom
      FROM interventions i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN medecins m ON i.medecin_id = m.id
      ORDER BY i.date_intervention DESC
    `);
    res.json(rows);
  } catch (err) {
    console.warn('⚠️ Table interventions absente ou requête erronée:', err.message);
    res.json([]);
  }
});

// ========== ORDONNANCES (POST) ==========
router.post('/ordonnances', authenticate, requireRole(['medecin', 'admin']), async (req, res) => {
  const { patient_id, lignes, observations } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const numero = `ORD-${Date.now()}`;
    const ordonnance = await client.query(
      `INSERT INTO ordonnances (patient_id, medecin_id, numero_ordonnance, observations, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, req.user.id, numero, observations, req.user.id]
    );
    const ordonnanceId = ordonnance.rows[0].id;
    for (const ligne of lignes) {
      await client.query(
        `INSERT INTO ligne_ordonnances (ordonnance_id, medicament_id, quantite_prescrit, posologie)
         VALUES ($1, $2, $3, $4)`,
        [ordonnanceId, ligne.medicament_id, ligne.quantite_prescrit, ligne.posologie]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(ordonnance.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur création ordonnance :', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// ========== NOUVELLES ROUTES POUR LES ADMISSIONS ===========
// ============================================================

// GET /admissions/:id – Détail d'une admission
router.get('/admissions/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             p.nom AS patient_nom, p.prenom AS patient_prenom, p.ipp,
             s.nom AS service_nom,
             m.nom AS medecin_nom, m.prenom AS medecin_prenom,
             l.numero AS lit_numero
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN medecins m ON a.medecin_referent_id = m.id
      LEFT JOIN lits l ON a.lit_id = l.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admissions/:id – Modification d'une admission
router.put('/admissions/:id', authenticate, async (req, res) => {
  const { service_id, medecin_referent_id, lit_id, motif, date_admission } = req.body;
  try {
    const result = await pool.query(`
      UPDATE admissions SET
        service_id = COALESCE($1, service_id),
        medecin_referent_id = COALESCE($2, medecin_referent_id),
        lit_id = COALESCE($3, lit_id),
        motif = COALESCE($4, motif),
        date_admission = COALESCE($5, date_admission)
      WHERE id = $6
    `, [service_id, medecin_referent_id, lit_id, motif, date_admission, req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.sendStatus(200);
  } catch (err) {
    console.error('PUT /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /admissions/:id – réservé aux administrateurs
router.delete('/admissions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Vérifier si l'admission est liée à un séjour en cours
    const sejour = await pool.query('SELECT id FROM sejours WHERE admission_id = $1 AND statut = $2', [req.params.id, 'en_cours']);
    if (sejour.rowCount > 0) {
      return res.status(400).json({ error: 'Cette admission est associée à un séjour en cours. Impossible de la supprimer.' });
    }
    const result = await pool.query('DELETE FROM admissions WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Admission non trouvée' });
    res.sendStatus(204);
  } catch (err) {
    console.error('DELETE /admissions/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;