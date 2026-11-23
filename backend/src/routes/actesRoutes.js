const express = require('express');
const router = express.Router();
const pool = require('../config/db');                       // ✅ pool patché
const { authenticate, requireHospital, requireAdmin } = require('../middleware/auth');

// ============================================================
// 1. Vérification et création automatique de la table actes_paramedicaux
// ============================================================
const ensureTable = async () => {
  try {
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'actes_paramedicaux'
      )
    `);

    if (!check.rows[0].exists) {
      console.log('📦 Création de la table actes_paramedicaux...');
      // ✅ FIX : UNIQUE (hospital_id, code) au lieu de UNIQUE (code)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.actes_paramedicaux (
          id SERIAL PRIMARY KEY,
          hospital_id UUID REFERENCES hospitals(id),
          code VARCHAR(50) NOT NULL,
          nom VARCHAR(200) NOT NULL,
          description TEXT,
          duree_estimee INTEGER,
          prix NUMERIC(10,2),
          categorie VARCHAR(100),
          actif BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (hospital_id, code)
        )
      `);
      console.log('✅ Table actes_paramedicaux créée');
    } else {
      console.log('✅ Table actes_paramedicaux existe déjà');
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_actes_categorie ON public.actes_paramedicaux(categorie);
      CREATE INDEX IF NOT EXISTS idx_actes_hospital ON public.actes_paramedicaux(hospital_id);
    `);

    // ✅ FIX : si la table existait avec UNIQUE (code) global, le remplacer par UNIQUE (hospital_id, code)
    try {
      const constraintCheck = await pool.query(`
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.actes_paramedicaux'::regclass
          AND contype = 'u'
          AND array_length(conkey, 1) = 1
      `);
      for (const row of constraintCheck.rows) {
        // Vérifier que c'est bien la contrainte sur "code" seul
        const cols = await pool.query(`
          SELECT a.attname
          FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          WHERE c.conname = $1
        `, [row.conname]);
        if (cols.rows.length === 1 && cols.rows[0].attname === 'code') {
          await pool.query(`ALTER TABLE public.actes_paramedicaux DROP CONSTRAINT ${row.conname}`);
          console.log(`✅ Contrainte globale UNIQUE(${row.conname}) supprimée`);
          await pool.query(`
            ALTER TABLE public.actes_paramedicaux
            ADD CONSTRAINT actes_paramedicaux_hospital_code_key UNIQUE (hospital_id, code)
          `);
          console.log('✅ Contrainte UNIQUE(hospital_id, code) ajoutée');
        }
      }
    } catch (e) {
      console.warn('⚠️ Migration contrainte UNIQUE ignorée :', e.message);
    }
  } catch (err) {
    console.error('❌ Erreur lors de la vérification/création de la table actes_paramedicaux :', err.message);
  }
};

ensureTable();

// ============================================================
// Helpers – vérification d'appartenance au tenant
// ============================================================
async function acteInTenant(acteId, hospitalId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM public.actes_paramedicaux WHERE id = $1 AND hospital_id = $2',
    [acteId, hospitalId]
  );
  return rowCount > 0;
}

// ============================================================
// 3. ROUTES
// ============================================================

// Test
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route actes fonctionne' });
});

// GET tous les actes (scopé au tenant)
router.get('/', authenticate, requireHospital, async (req, res) => {
  try {
    const { categorie, actif } = req.query;
    let query = `SELECT * FROM public.actes_paramedicaux WHERE hospital_id = $1`;
    const params = [req.hospitalId];
    let paramIndex = 2;
    if (categorie) {
      query += ` AND categorie = $${paramIndex}`;
      params.push(categorie);
      paramIndex++;
    }
    if (actif !== undefined) {
      query += ` AND actif = $${paramIndex}`;
      params.push(actif === 'true');
      paramIndex++;
    }
    query += ` ORDER BY nom`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /actes-paramedicaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET un acte (scopé au tenant)
router.get('/:id', authenticate, requireHospital, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM public.actes_paramedicaux WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un acte (réservé aux admins)
router.post('/', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { code, nom, categorie, description, duree_estimee, prix, actif } = req.body;

    if (!code || !nom) {
      return res.status(400).json({ error: 'Le code et le nom sont requis' });
    }

    // ✅ FIX : check d'unicité du code SCOPÉ AU TENANT (message clair au lieu d'une 500)
    const dup = await pool.query(
      'SELECT id FROM public.actes_paramedicaux WHERE code = $1 AND hospital_id = $2',
      [code, req.hospitalId]
    );
    if (dup.rows.length > 0) {
      return res.status(400).json({ error: `Un acte avec le code "${code}" existe déjà dans votre hôpital` });
    }

    const { rows } = await pool.query(
      `INSERT INTO public.actes_paramedicaux (hospital_id, code, nom, categorie, description, duree_estimee, prix, actif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.hospitalId, code, nom, categorie, description, duree_estimee, prix, actif !== undefined ? actif : true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /actes-paramedicaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un acte (réservé aux admins)
router.put('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, nom, categorie, description, duree_estimee, prix, actif } = req.body;

    // ✅ FIX : acte du tenant
    if (!(await acteInTenant(id, req.hospitalId))) {
      return res.status(404).json({ error: 'Acte non trouvé' });
    }

    // ✅ FIX : unicité du code scopée au tenant (exclut l'id courant)
    if (code) {
      const dup = await pool.query(
        'SELECT id FROM public.actes_paramedicaux WHERE code = $1 AND hospital_id = $2 AND id != $3',
        [code, req.hospitalId, id]
      );
      if (dup.rows.length > 0) {
        return res.status(400).json({ error: `Un acte avec le code "${code}" existe déjà dans votre hôpital` });
      }
    }

    // ✅ FIX : UPDATE scopé tenant
    const { rows } = await pool.query(
      `UPDATE public.actes_paramedicaux 
       SET code = $1, nom = $2, categorie = $3, description = $4,
           duree_estimee = $5, prix = $6, actif = $7,
           updated_at = NOW()
       WHERE id = $8 AND hospital_id = $9
       RETURNING *`,
      [code, nom, categorie, description, duree_estimee, prix, actif, id, req.hospitalId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE – Suppression réservée aux administrateurs (scopé tenant)
router.delete('/:id', authenticate, requireHospital, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM public.actes_paramedicaux WHERE id = $1 AND hospital_id = $2',
      [id, req.hospitalId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;