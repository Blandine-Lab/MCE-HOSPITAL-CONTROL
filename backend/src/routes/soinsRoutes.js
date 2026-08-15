const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ============================================================
// 1. Connexion à PostgreSQL
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Paramédical - Soins : connecté à PostgreSQL'));

// ============================================================
// 2. Vérification et création automatique de la table soins
// ============================================================
const ensureTable = async () => {
  try {
    // Vérifier si la table existe
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

    // Création des index (si non existants)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_soins_patient ON public.soins(patient_id);
      CREATE INDEX IF NOT EXISTS idx_soins_date ON public.soins(date_soin);
      CREATE INDEX IF NOT EXISTS idx_soins_statut ON public.soins(statut);
    `);
    console.log('✅ Index soins vérifiés/créés');
  } catch (err) {
    console.error('❌ Erreur lors de la vérification/création de la table soins :', err.message);
  }
};

// Exécuter la vérification au démarrage
ensureTable();

// ============================================================
// 3. ROUTES
// ============================================================

// Route de test pour vérifier que le routeur est actif
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route soins fonctionne' });
});

// GET tous les soins
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, date_debut, date_fin } = req.query;
    let query = `
      SELECT s.*, 
             p.nom as patient_nom, p.prenom as patient_prenom
      FROM public.soins s
      LEFT JOIN public.patients p ON s.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

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

// GET un soin par ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT s.*, p.nom as patient_nom, p.prenom as patient_prenom
       FROM public.soins s
       LEFT JOIN public.patients p ON s.patient_id = p.id
       WHERE s.id = $1`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Soin non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /soins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST créer un soin
router.post('/', authenticate, async (req, res) => {
  try {
    const { patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO public.soins (patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut || 'planifié', notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /soins :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT modifier un soin
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE public.soins 
       SET patient_id = $1, type_soin = $2, description = $3, date_soin = $4,
           heure_soin = $5, prestataire = $6, statut = $7, notes = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [patient_id, type_soin, description, date_soin, heure_soin, prestataire, statut, notes, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Soin non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /soins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE supprimer un soin (réservé aux administrateurs)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM public.soins WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Soin non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /soins/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;