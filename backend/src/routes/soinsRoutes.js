const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');

// ============================================================
// Helper – vérification d'appartenance au tenant
// ============================================================
async function patientInTenant(patientId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM patients WHERE id = $1 AND hospital_id = $2',
    [patientId, hospitalId]
  );
  return rowCount > 0;
}

// ============================================================
// Vérification et création automatique de la table soins
// ============================================================
const ensureTable = async () => {
  try {
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'soins'
      )
    `);

    if (!check.rows[0].exists) {
      console.log('📦 Création de la table soins...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.soins (
          id SERIAL PRIMARY KEY,
          hospital_id UUID REFERENCES hospitals(id),
          patient_id INTEGER NOT NULL,
          acte_id INTEGER,
          type_soin VARCHAR(100),
          description TEXT,
          date_soin DATE NOT NULL,
          heure_soin TIME,
          prestataire VARCHAR(200),
          statut VARCHAR(50) DEFAULT 'planifié',
          notes TEXT,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Table soins créée');
    } else {
      console.log('✅ Table soins existe déjà');
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_soins_patient ON public.soins(patient_id);
      CREATE INDEX IF NOT EXISTS idx_soins_date ON public.soins(date_soin);
      CREATE INDEX IF NOT EXISTS idx_soins_statut ON public.soins(statut);
      CREATE INDEX IF NOT EXISTS idx_soins_hospital ON public.soins(hospital_id);
    `);
  } catch (err) {
    console.error('❌ Erreur lors de la vérification/création de la table soins :', err.message);
  }
};

ensureTable();

// ============================================================
// ROUTES
// ============================================================

router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route soins fonctionne' });
});

// GET tous les soins (scopé au tenant)
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { patient_id, date_debut, date_fin } = req.query;
    let query = `
      SELECT s.*, 
             p.nom as patient_nom, p.prenom as patient_prenom
      FROM public.soins s
      LEFT JOIN public.patients p ON s.patient_id = p.id
      WHERE s.hospital_id = $1
    `;
    const params = [req.hospitalId];
    let paramIndex = 2;

    if (patient_id) {
      query += ` AND s.patient_id = $${paramIndex}`;
      params.push(patient_id);
      paramIndex++;
    }
    if (date_debut && date_fin) {
      query += ` AND s.date_soin BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(date_debut, date_fin);
      paramIndex += 2;
    }
    query += ` ORDER BY s.date_soin DESC, s.heure_soin ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /soins :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET un soin par ID (scopé au tenant)
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT s.*, p.nom as patient_nom, p.prenom as patient_prenom
       FROM public.soins s
       LEFT JOIN public.patients p ON s.patient_id = p.id
       WHERE s.id = $1 AND s.hospital_id = $2`,
      [id, req.hospitalId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Soin non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /soins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST créer un soin
router.post('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Le patient est requis' });
    }

    // Le patient doit appartenir au tenant courant
    if (!(await patientInTenant(patient_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { rows } = await pool.query(
      `INSERT INTO public.soins 
        (hospital_id, patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.hospitalId,
        patient_id,
        type_soin,
        description,
        date_soin,
        heure_soin,
        prestataire,
        statut || 'planifié',
        notes,
        req.user.id
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /soins :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier un soin (scopé au tenant)
router.put('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes } = req.body;

    // Vérifier que le soin appartient au tenant
    const existing = await pool.query(
      'SELECT id FROM public.soins WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Soin non trouvé' });

    // Si patient_id est fourni, il doit appartenir au tenant
    if (patient_id && !(await patientInTenant(patient_id, req.hospitalId))) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const { rows } = await pool.query(
      `UPDATE public.soins 
       SET patient_id = $1, type_soin = $2, description = $3, date_soin = $4,
           heure_soin = $5, prestataire = $6, statut = $7, notes = $8,
           updated_at = NOW()
       WHERE id = $9 AND hospital_id = $10
       RETURNING *`,
      [patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes, id, req.hospitalId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Soin non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /soins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer un soin (admin, scopé au tenant)
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM public.soins WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Soin non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /soins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;