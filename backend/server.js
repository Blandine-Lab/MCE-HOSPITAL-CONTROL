require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcrypt');
const path = require('path');

// ========== LOG DE DIAGNOSTIC ==========
console.log('🔍 DATABASE_URL présente :', process.env.DATABASE_URL ? 'OUI' : 'NON');
if (process.env.DATABASE_URL) {
  console.log('🔍 DATABASE_URL (masqué) :', process.env.DATABASE_URL.replace(/:.+@/, ':****@'));
}

// ========== CONNEXION UNIQUE À LA BASE DE DONNÉES ==========
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie !');
  process.exit(1);
}

console.log('🔗 Connexion à PostgreSQL avec DATABASE_URL');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Connecté à PostgreSQL'));

// Exporter le pool pour qu'il soit accessible par les routeurs
module.exports.pool = pool;

// ========== IMPORTS DES ROUTEURS ==========
const authRoutes = require('./src/routes/auth');
const consultationRoutes = require('./src/routes/consultations');
const billingRoutes = require('./src/routes/billing');
const pharmacyRoutes = require('./src/routes/pharmacy');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const patientRoutes = require('./src/routes/patients');
const logRoutes = require('./src/routes/logs');
const prescriptionsRoutes = require('./src/routes/prescriptions');
const adminRoutes = require('./src/routes/admin');

const soinsRoutes = require('./src/routes/soinsRoutes');
const actesRoutes = require('./src/routes/actesRoutes');
const examensRoutes = require('./src/routes/examensRoutes');
const typesExamensRoutes = require('./src/routes/typesExamensRoutes');

const employesRoutes = require('./src/routes/employesRoutes');
const servicesRoutes = require('./src/routes/servicesRoutes');
const planningsRoutes = require('./src/routes/planningsRoutes');
const congesRoutes = require('./src/routes/congesRoutes');
const absencesRoutes = require('./src/routes/absencesRoutes');
const contratsRoutes = require('./src/routes/contratsRoutes');
// NOUVEAU : routes pour les demandes de congé & formation
const demandesRoutes = require('./src/routes/demandesRoutes');

const comptesRoutes = require('./src/routes/comptesRoutes');
const ecrituresRoutes = require('./src/routes/ecrituresRoutes');
const journauxRoutes = require('./src/routes/journauxRoutes');
const budgetsRoutes = require('./src/routes/budgetsRoutes');
const paiementsRoutes = require('./src/routes/paiementsRoutes');
const rapportsFinanciersRoutes = require('./src/routes/rapportsFinanciersRoutes');

const produitsRoutes = require('./src/routes/produitsRoutes');
const stocksRoutes = require('./src/routes/stocksRoutes');
const fournisseursRoutes = require('./src/routes/fournisseursRoutes');
const commandesAchatRoutes = require('./src/routes/commandesAchatRoutes');
const mouvementsRoutes = require('./src/routes/mouvementsRoutes');
const inventairesRoutes = require('./src/routes/inventairesRoutes');

const signalementsRoutes = require('./src/routes/signalementsRoutes');
const auditsRoutes = require('./src/routes/auditsRoutes');
const actionsCAPARoutes = require('./src/routes/actionsCAPARoutes');
const indicateursRoutes = require('./src/routes/indicateursRoutes');
const nonConformitesRoutes = require('./src/routes/nonConformitesRoutes');
const evaluationsRisquesRoutes = require('./src/routes/evaluationsRisquesRoutes');
const dashboardQualiteRoutes = require('./src/routes/dashboardQualiteRoutes');

const biRoutes = require('./src/routes/biRoutes');
const securityRoutes = require('./src/routes/securityRoutes');
const interoperabiliteRoutes = require('./src/routes/interoperabiliteRoutes');
const blocRoutes = require('./src/routes/blocRoutes');

// NOUVEAU : routes pour les signes vitaux
const signesVitauxRoutes = require('./src/routes/signesVitauxRoutes');

const { authenticate, requireRole } = require('./src/middleware/auth');

// ========== APPLICATION EXPRESS ==========
const app = express();
const PORT = process.env.PORT || 5000;

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 1. Middlewares globaux ==========
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ========== CONFIGURATION CORS EXPLICITE ==========
const corsOptions = {
  origin: [
    'https://mce-hospital-control-frontend.vercel.app',
    'https://mce-hospital-control.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Répondre aux requêtes OPTIONS (préflight)
app.options('*', cors(corsOptions));

// ========== 2. Route de santé (publique) ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Hospitalière opérationnelle',
    timestamp: new Date().toISOString()
  });
});

// ========== 3. Routes publiques ==========
app.use('/api/auth', authRoutes);

// ========== 4. Routes protégées ==========
app.use('/api/consultations', consultationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/soins', soinsRoutes);
app.use('/api/actes-paramedicaux', actesRoutes);

app.use('/api/examens', examensRoutes);
app.use('/api/types-examens', typesExamensRoutes);

app.use('/api/employes', employesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/plannings', planningsRoutes);
app.use('/api/conges', congesRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/contrats', contratsRoutes);
app.use('/api/demandes', demandesRoutes);

app.use('/api/comptes', comptesRoutes);
app.use('/api/ecritures', ecrituresRoutes);
app.use('/api/journaux', journauxRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/rapports-financiers', rapportsFinanciersRoutes);

app.use('/api/produits', produitsRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/fournisseurs', fournisseursRoutes);
app.use('/api/commandes', commandesAchatRoutes);
app.use('/api/mouvements', mouvementsRoutes);
app.use('/api/inventaires', inventairesRoutes);

app.use('/api/signalements', signalementsRoutes);
app.use('/api/audits', auditsRoutes);
app.use('/api/actions-capa', actionsCAPARoutes);
app.use('/api/indicateurs', indicateursRoutes);
app.use('/api/non-conformites', nonConformitesRoutes);
app.use('/api/evaluations-risques', evaluationsRisquesRoutes);
app.use('/api/dashboard/qualite', dashboardQualiteRoutes);

app.use('/api/bi', biRoutes);
app.use('/api/security', securityRoutes.router);
app.use('/api/interoperabilite', interoperabiliteRoutes);
app.use('/api/bloc', blocRoutes);

// NOUVEAU : routes pour les signes vitaux
app.use('/api/signes-vitaux', signesVitauxRoutes);

// ========== 4bis. Route spécifique pour /admin/patients (legacy) ==========
app.get('/api/admin/patients', authenticate, requireRole(['admin', 'pharmacien']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, prenom AS first_name, nom AS last_name, email
      FROM patients
      ORDER BY nom, prenom
    `);
    res.json(rows);
  } catch (err) {
    console.error('❌ Erreur /admin/patients :', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTE : Création d’un médecin + compte utilisateur ==========
app.post('/api/consultations/medecins-avec-compte', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email, login, password, role = 'medecin' } = req.body;

  if (!nom || !prenom || !password) {
    return res.status(400).json({ error: 'Nom, prénom et mot de passe sont requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);
    const loginFinal = login || email;
    if (!loginFinal) {
      throw new Error('Login ou email requis pour le compte utilisateur');
    }

    const userResult = await client.query(
      `INSERT INTO utilisateurs (login, nom, prenom, email, password_hash, role, actif)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
      [loginFinal, nom, prenom, email, hashedPassword, role]
    );
    const userId = userResult.rows[0].id;

    const medResult = await client.query(
      `INSERT INTO medecins (nom, prenom, specialite, email, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nom, prenom, specialite || null, email || null, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Médecin et compte créés avec succès',
      medecinId: medResult.rows[0].id,
      userId: userId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur création médecin+compte :', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ========== 5. Gestion des routes inexistantes (404) ==========
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} non trouvée`
  });
});

// ========== 6. Gestionnaire d'erreur global (500) ==========
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.stack);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== 7. Démarrage du serveur (écoute sur 0.0.0.0) ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur backend démarré sur http://0.0.0.0:${PORT}`);
  console.log(`🩺 Health check : http://0.0.0.0:${PORT}/api/health`);
  console.log(`🔐 Login : POST http://0.0.0.0:${PORT}/api/auth/login`);
});