const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// ✅ Création directe du pool avec DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ BI : connecté à PostgreSQL'));

// ============================================================
//  FONCTIONS UTILITAIRES DE VÉRIFICATION
// ============================================================

const tableExists = async (tableName) => {
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
    [tableName]
  );
  return result.rows[0].exists;
};

const columnExists = async (tableName, columnName) => {
  const result = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)`,
    [tableName, columnName]
  );
  return result.rows[0].exists;
};

const findDateColumn = async (tableName, candidates = ['date_consultation', 'date_creation', 'date', 'date_rdv', 'date_emission']) => {
  for (const col of candidates) {
    const exists = await columnExists(tableName, col);
    if (exists) return col;
  }
  return null;
};

const findAmountColumn = async (tableName, candidates = ['montant_total', 'montant', 'total', 'prix_total', 'prix_vente']) => {
  for (const col of candidates) {
    const exists = await columnExists(tableName, col);
    if (exists) return col;
  }
  return null;
};

// ============================================================
//  TABLEAU DE BORD (INDICATEURS)
// ============================================================
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let interval;
    switch(period) {
      case 'day': interval = '1 day'; break;
      case 'week': interval = '7 days'; break;
      case 'month': interval = '30 days'; break;
      case 'year': interval = '365 days'; break;
      default: interval = '30 days';
    }

    const result = {};

    // 1. Patients
    const patientsRes = await pool.query('SELECT COUNT(*) as total FROM patients');
    result.patients = parseInt(patientsRes.rows[0].total);

    // 2. Consultations (rendez_vous)
    if (await tableExists('rendez_vous')) {
      const dateCol = await findDateColumn('rendez_vous', ['date_rdv']);
      if (dateCol) {
        const consRes = await pool.query(
          `SELECT COUNT(*) as total FROM rendez_vous WHERE ${dateCol} >= NOW() - INTERVAL '${interval}'`
        );
        result.consultations = parseInt(consRes.rows[0].total);
      } else {
        result.consultations = 0;
      }
    } else {
      result.consultations = 0;
    }

    // 3. Prescriptions
    if (await tableExists('prescriptions')) {
      const dateCol = await findDateColumn('prescriptions', ['date_creation', 'date']);
      if (dateCol) {
        const presRes = await pool.query(
          `SELECT COUNT(*) as total FROM prescriptions WHERE ${dateCol} >= NOW() - INTERVAL '${interval}'`
        );
        result.prescriptions = parseInt(presRes.rows[0].total);
      } else {
        result.prescriptions = 0;
      }
    } else {
      result.prescriptions = 0;
    }

    // 4. Factures
    if (await tableExists('factures')) {
      const dateCol = await findDateColumn('factures', ['date_emission', 'date_creation', 'date']);
      const amountCol = await findAmountColumn('factures');
      if (dateCol && amountCol) {
        const factRes = await pool.query(
          `SELECT COUNT(*) as nombre, COALESCE(SUM(${amountCol}), 0) as montant FROM factures WHERE ${dateCol} >= NOW() - INTERVAL '${interval}'`
        );
        result.factures = {
          nombre: parseInt(factRes.rows[0].nombre || 0),
          montant: parseFloat(factRes.rows[0].montant || 0)
        };
      } else {
        result.factures = { nombre: 0, montant: 0 };
      }
    } else {
      result.factures = { nombre: 0, montant: 0 };
    }

    // 5. Occupation des lits
    if (await tableExists('lits')) {
      const occRes = await pool.query('SELECT COUNT(*) as occupes FROM lits WHERE disponible = false');
      const totalRes = await pool.query('SELECT COUNT(*) as total FROM lits');
      result.litsOccupes = parseInt(occRes.rows[0].occupes || 0);
      result.totalLits = parseInt(totalRes.rows[0].total || 0);
    } else {
      result.litsOccupes = 0;
      result.totalLits = 0;
    }

    // 6. Médecins et infirmiers
    if (await tableExists('utilisateurs')) {
      const medRes = await pool.query("SELECT COUNT(*) FROM utilisateurs WHERE role = 'medecin'");
      const infRes = await pool.query("SELECT COUNT(*) FROM utilisateurs WHERE role = 'infirmier'");
      result.medecins = parseInt(medRes.rows[0].count || 0);
      result.infirmiers = parseInt(infRes.rows[0].count || 0);
    } else {
      result.medecins = 0;
      result.infirmiers = 0;
    }

    // 7. Alertes stock
    if (await tableExists('stocks') && await tableExists('produits')) {
      const alertRes = await pool.query(`
        SELECT COUNT(*) as total 
        FROM stocks s 
        JOIN produits p ON s.produit_id = p.id 
        WHERE s.quantite <= p.seuil_alerte AND p.seuil_alerte > 0
      `);
      result.stockAlerte = parseInt(alertRes.rows[0].total || 0);
    } else {
      result.stockAlerte = 0;
    }

    res.json(result);
  } catch (err) {
    console.error('❌ GET /bi/dashboard :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  ÉVOLUTION DES CONSULTATIONS (12 mois)
// ============================================================
router.get('/consultations-evolution', authenticate, async (req, res) => {
  try {
    if (!await tableExists('rendez_vous')) return res.json([]);
    const dateCol = await findDateColumn('rendez_vous', ['date_rdv']);
    if (!dateCol) return res.json([]);

    const { rows } = await pool.query(`
      SELECT 
        TO_CHAR(${dateCol}, 'Mon') as mois,
        EXTRACT(MONTH FROM ${dateCol}) as mois_num,
        COUNT(*) as total
      FROM rendez_vous
      WHERE ${dateCol} >= NOW() - INTERVAL '12 months'
      GROUP BY mois, mois_num
      ORDER BY mois_num
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /bi/consultations-evolution :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  ÉVOLUTION DU CHIFFRE D'AFFAIRES (12 mois)
// ============================================================
router.get('/factures-evolution', authenticate, async (req, res) => {
  try {
    if (!await tableExists('factures')) return res.json([]);
    const dateCol = await findDateColumn('factures', ['date_emission', 'date_creation', 'date']);
    const amountCol = await findAmountColumn('factures');
    if (!dateCol || !amountCol) return res.json([]);

    const { rows } = await pool.query(`
      SELECT 
        TO_CHAR(${dateCol}, 'Mon') as mois,
        EXTRACT(MONTH FROM ${dateCol}) as mois_num,
        COALESCE(SUM(${amountCol}), 0) as total
      FROM factures
      WHERE ${dateCol} >= NOW() - INTERVAL '12 months'
      GROUP BY mois, mois_num
      ORDER BY mois_num
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /bi/factures-evolution :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  OCCUPATION DES LITS PAR SERVICE
// ============================================================
router.get('/occupation-lits', authenticate, async (req, res) => {
  try {
    if (!await tableExists('lits')) return res.json([]);
    const query = `
      SELECT 
        COALESCE(s.nom, 'Sans service') as service,
        COUNT(l.id) as total,
        COUNT(l.id) FILTER (WHERE l.disponible = false) as occupes
      FROM lits l
      LEFT JOIN services s ON l.service_id = s.id
      GROUP BY s.id, s.nom
      ORDER BY s.nom
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /bi/occupation-lits :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  MOTIFS D'ADMISSION (30 derniers jours)
// ============================================================
router.get('/motifs-admission', authenticate, async (req, res) => {
  try {
    if (!await tableExists('admissions')) return res.json([]);
    const query = `
      SELECT 
        COALESCE(motif, 'Non renseigné') as motif,
        COUNT(*) as count
      FROM admissions
      WHERE date_admission >= NOW() - INTERVAL '30 days'
      GROUP BY motif
      ORDER BY count DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /bi/motifs-admission :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  RAPPORTS (CRUD) – avec vérification des tables
// ============================================================

// GET /bi/rapports
router.get('/rapports', authenticate, async (req, res) => {
  try {
    if (!await tableExists('rapports')) {
      return res.json([]);
    }
    const query = `
      SELECT r.*, u.nom as created_by_nom
      FROM rapports r
      LEFT JOIN utilisateurs u ON r.created_by = u.id
      ORDER BY r.date_creation DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /bi/rapports :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /bi/rapports
router.post('/rapports', authenticate, async (req, res) => {
  try {
    const { nom, description, type, categorie, date_debut, date_fin, config } = req.body;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rapports (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'dashboard',
        categorie VARCHAR(50) DEFAULT 'general',
        date_debut DATE,
        date_fin DATE,
        config JSONB DEFAULT '{}',
        created_by INTEGER REFERENCES utilisateurs(id),
        date_creation TIMESTAMP DEFAULT NOW()
      )
    `);
    const { rows } = await pool.query(
      `INSERT INTO rapports (nom, description, type, categorie, date_debut, date_fin, config, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nom, description, type, categorie, date_debut, date_fin, config || {}, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /bi/rapports :', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /bi/rapports/:id
router.put('/rapports/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, type, categorie, date_debut, date_fin, config } = req.body;
    const { rows } = await pool.query(
      `UPDATE rapports 
       SET nom = $1, description = $2, type = $3, categorie = $4, 
           date_debut = $5, date_fin = $6, config = $7
       WHERE id = $8 AND created_by = $9
       RETURNING *`,
      [nom, description, type, categorie, date_debut, date_fin, config, id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Rapport non trouvé ou non autorisé' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /bi/rapports/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /bi/rapports/:id – réservé aux administrateurs
router.delete('/rapports/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // L'admin peut supprimer n'importe quel rapport (pas de vérification created_by)
    const result = await pool.query('DELETE FROM rapports WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Rapport non trouvé' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /bi/rapports/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  EXPORTS (CRUD + TÉLÉCHARGEMENT)
// ============================================================

// GET /bi/exports
router.get('/exports', authenticate, async (req, res) => {
  try {
    if (!await tableExists('exports')) {
      return res.json([]);
    }
    const query = `
      SELECT e.*, u.nom as created_by_nom
      FROM exports e
      LEFT JOIN utilisateurs u ON e.created_by = u.id
      ORDER BY e.created_at DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /bi/exports :', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /bi/exports – Générer un export
router.post('/exports', authenticate, async (req, res) => {
  try {
    const { type, format, date_debut, date_fin, filters } = req.body;
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS exports (
        id SERIAL PRIMARY KEY,
        nom_fichier VARCHAR(255) NOT NULL,
        format VARCHAR(20) NOT NULL,
        taille BIGINT,
        type VARCHAR(50),
        filtre JSONB,
        statut VARCHAR(20) DEFAULT 'en_cours',
        created_by INTEGER REFERENCES utilisateurs(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const filename = `${type}_${new Date().toISOString().split('T')[0]}_${Date.now()}.${format}`;
    const uploadDir = path.join(__dirname, '../../uploads/exports');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, `Export ${type} généré le ${new Date().toISOString()}`);

    const { rows } = await pool.query(
      `INSERT INTO exports (nom_fichier, format, taille, type, filtre, statut, created_by)
       VALUES ($1, $2, $3, $4, $5, 'termine', $6) RETURNING *`,
      [filename, format, fs.statSync(filepath).size, type, JSON.stringify(filters || {}), req.user.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('❌ POST /bi/exports :', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /bi/exports/:id/download
router.get('/exports/:id/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM exports WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Export non trouvé' });
    const exportItem = rows[0];

    const filepath = path.join(__dirname, '../../uploads/exports', exportItem.nom_fichier);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    res.download(filepath, exportItem.nom_fichier);
  } catch (err) {
    console.error('❌ GET /bi/exports/:id/download :', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE /bi/exports/:id – réservé aux administrateurs
router.delete('/exports/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT nom_fichier FROM exports WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Export non trouvé' });

    const filepath = path.join(__dirname, '../../uploads/exports', rows[0].nom_fichier);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    await pool.query('DELETE FROM exports WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ DELETE /bi/exports/:id :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  EXPORT D'UN RAPPORT (format)
// ============================================================
router.post('/export', authenticate, async (req, res) => {
  try {
    const { rapport_id, format } = req.body;
    if (!rapport_id || !format) {
      return res.status(400).json({ error: 'rapport_id et format requis' });
    }

    const rapportRes = await pool.query('SELECT * FROM rapports WHERE id = $1', [rapport_id]);
    if (rapportRes.rows.length === 0) return res.status(404).json({ error: 'Rapport non trouvé' });

    const rapport = rapportRes.rows[0];
    const content = `Rapport: ${rapport.nom}\nDescription: ${rapport.description || ''}\nGénéré le ${new Date().toISOString()}`;
    const filename = `rapport_${rapport_id}_${Date.now()}.${format}`;
    const uploadDir = path.join(__dirname, '../../uploads/exports');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, content);

    const exportRes = await pool.query(
      `INSERT INTO exports (nom_fichier, format, taille, type, filtre, statut, created_by)
       VALUES ($1, $2, $3, 'rapport', $4, 'termine', $5) RETURNING id`,
      [filename, format, fs.statSync(filepath).size, JSON.stringify({ rapport_id }), req.user.id]
    );

    res.json({ 
      message: 'Export généré avec succès', 
      id: exportRes.rows[0].id,
      chemin_fichier: filename
    });
  } catch (err) {
    console.error('❌ POST /bi/export :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;