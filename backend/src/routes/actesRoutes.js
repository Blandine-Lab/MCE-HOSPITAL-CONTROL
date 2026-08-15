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

pool.on('connect', () => console.log('✅ Paramédical - Actes : connecté à PostgreSQL'));

// ============================================================
// 2. Vérification et création automatique de la table actes_paramedicaux
// ============================================================
const ensureTable = async () => {
  try {
    // Vérifier si la table existe
    const check = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'actes_paramedicaux'
      )
    `);

    if (!check.rows[0].exists) {
      console.log('📦 Création de la table actes_paramedicaux...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.actes_paramedicaux (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          nom VARCHAR(200) NOT NULL,
          description TEXT,
          duree_estimee INTEGER,
          prix NUMERIC(10,2),
          categorie VARCHAR(100),
          actif BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Table actes_paramedicaux créée');
    } else {
      console.log('✅ Table actes_paramedicaux existe déjà');
    }

    // Création de l'index sur la catégorie
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_actes_categorie ON public.actes_paramedicaux(categorie);
    `);
    console.log('✅ Index actes_paramedicaux vérifiés/créés');
  } catch (err) {
    console.error('❌ Erreur lors de la vérification/création de la table actes_paramedicaux :', err.message);
  }
};

// Exécuter la vérification au démarrage
ensureTable();

// ============================================================
// 3. ROUTES
// ============================================================

// Test
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Route actes fonctionne' });
});

// GET tous les actes
router.get('/', authenticate, async (req, res) => {
  try {
    const { categorie, actif } = req.query;
    let query = `SELECT * FROM public.actes_paramedicaux WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
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

// GET un acte
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM public.actes_paramedicaux WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Créer un acte (réservé aux admins)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { code, nom, categorie, description, duree_estimee, prix, actif } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO public.actes_paramedicaux (code, nom, categorie, description, duree_estimee, prix, actif)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code, nom, categorie, description, duree_estimee, prix, actif !== undefined ? actif : true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /actes-paramedicaux :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Modifier un acte (réservé aux admins)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, nom, categorie, description, duree_estimee, prix, actif } = req.body;
    const { rows } = await pool.query(
      `UPDATE public.actes_paramedicaux 
       SET code = $1, nom = $2, categorie = $3, description = $4,
           duree_estimee = $5, prix = $6, actif = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [code, nom, categorie, description, duree_estimee, prix, actif, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE – Suppression réservée aux administrateurs
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM public.actes_paramedicaux WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Acte non trouvé' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ DELETE /actes-paramedicaux/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;