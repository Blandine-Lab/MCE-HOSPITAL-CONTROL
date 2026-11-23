require('dotenv').config();

// ============================================================
// 0. HANDLER GLOBAL — erreurs DB transitoires (ECONNRESET, etc.)
// ============================================================
function isTransientDbError(err) {
  if (!err) return false;
  const code = err.code;
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === '57P01' ||
    code === '08006' ||
    msg.includes('connection terminated') ||
    msg.includes('connection reset')
  );
}

process.on('uncaughtException', (err) => {
  if (isTransientDbError(err)) {
    console.error('⚠️ Erreur DB transitoire ignorée :', err.message);
    return;
  }
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (isTransientDbError(reason)) {
    console.error('⚠️ Rejet DB transitoire ignoré :', reason.message);
    return;
  }
  console.error('❌ Rejet non géré :', reason);
  process.exit(1);
});


// ============================================================
// 1. CHARGER config/db EN PREMIER
// ============================================================
const pool = require('./src/config/db');

// ============================================================
// 2. ALS GLOBAL PARTAGÉ (server.js + config/db.js)
// ============================================================
const { AsyncLocalStorage } = require('async_hooks');
if (!global.__tenantALS) {
  global.__tenantALS = new AsyncLocalStorage();
}
const tenantALS = global.__tenantALS;

// ============================================================
// 3. LOG DE DIAGNOSTIC
// ============================================================
const pg = require('pg');
console.log('🔍 DATABASE_URL présente :', process.env.DATABASE_URL ? 'OUI' : 'NON');
if (process.env.DATABASE_URL) {
  console.log('🔍 DATABASE_URL (masqué) :', process.env.DATABASE_URL.replace(/:.+@/, ':****@'));
}
console.log('🔍 PLATFORM_DOMAIN :', process.env.PLATFORM_DOMAIN || '(non défini — CORS sous-domaines désactivé)');
console.log('🔍 pg.Pool :', pg.Pool.name, '(pool natif — le set_config est géré par patchedQuery dans db.js)');
console.log('🔍 PLATFORM_ADMIN_LOGINS :', process.env.PLATFORM_ADMIN_LOGINS || '(non défini)');

// ============================================================
// 4. EXPORT POOL POUR RÉTRO-COMPAT
// ============================================================
module.exports.pool = pool;

// ============================================================
// 5. IMPORTS DES ROUTEURS
// ============================================================
// 🔥 CHAT LIVE — chemin CORRIGÉ : ./src/routes/chat (comme les autres)
const chatRoutes = require('./src/routes/chat');

// 🔥 AJOUT FORMATION — chat de formation DPI (fichier isolé)
const chatFormationRoutes = require('./src/routes/chatFormation');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcrypt');
const path = require('path');

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

const signesVitauxRoutes = require('./src/routes/signesVitauxRoutes');
const parametresLaboRoutes = require('./src/routes/parametresLaboRoutes');

const publicRoutes = require('./src/routes/publicRoutes');
const hospitalRegisterRoute = require('./src/routes/hospitalRegister');
const superAdminRoutes = require('./src/routes/superAdminRoutes');

// 🔥 BIBLIOTHÈQUE (Supabase) — chemin CORRIGÉ : ./src/routes/library
const libraryRoutes = require('./src/routes/library');

const { authenticate, requireRole } = require('./src/middleware/auth');

// ============================================================
// 6. APPLICATION EXPRESS
// ============================================================
const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ ICI on ne monte QUE les fichiers statiques (pas de body à parser)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middlewares globaux (body parsing AVANT les routes)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use((req, res, next) => {
  console.log('➡️', req.method, req.originalUrl);
  next();
});

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || null;

const staticOrigins = [
  process.env.FRONTEND_URL,
  'https://mce-hospital-control-frontend.vercel.app',
  'https://mce-hospital-control.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (staticOrigins.includes(origin)) return callback(null, true);
    if (PLATFORM_DOMAIN) {
      const escaped = PLATFORM_DOMAIN.replace(/\./g, '\\.');
      const re = new RegExp(`^https://([a-z0-9-]+\\.)?${escaped}$`, 'i');
      if (re.test(origin)) return callback(null, true);
    }
    console.warn('❌ CORS bloqué pour :', origin);
    return callback(new Error(`Origin ${origin} non autorisé par CORS`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Hospital-Slug'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Hospitalière opérationnelle',
    platform: PLATFORM_DOMAIN || 'single-tenant',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// 7. ROUTES PUBLIQUES (après body parsing + CORS)
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/hospitals', hospitalRegisterRoute);

// 💬 CHAT LIVE — PUBLIC (visiteur anonyme autorisé) — APRÈS express.json()
app.use('/api/chat', chatRoutes);

// 🔥 AJOUT FORMATION — chat de formation DPI (whitelist interne au fichier)
//    Protégé par vérification JWT manuelle dans chatFormation.js
//    Ne touche PAS au chat existant ci-dessus.
app.use('/api/chat-formation', chatFormationRoutes);

// ============================================================
// 8. ROUTES PROTÉGÉES
// ============================================================
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
app.use('/api/security', securityRoutes.router || securityRoutes);
app.use('/api/interoperabilite', interoperabiliteRoutes);
app.use('/api/bloc', blocRoutes);

app.use('/api/signes-vitaux', signesVitauxRoutes);
app.use('/api/parametres-references', parametresLaboRoutes);

app.use('/api/platform', superAdminRoutes);

// 🔥 BIBLIOTHÈQUE — placé APRÈS express.json(), cors, et avec les autres routes protégées
app.use('/api/library', libraryRoutes);

// ============================================================
// 9. ROUTES LEGACY
// ============================================================
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

app.post('/api/consultations/medecins-avec-compte', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email, login, password, role = 'medecin' } = req.body;

  if (!nom || !prenom || !password) {
    return res.status(400).json({ error: 'Nom, prénom et mot de passe sont requis' });
  }
  if (!req.hospitalId) {
    return res.status(403).json({ error: 'Contexte hôpital manquant', code: 'TENANT_MISSING' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.hospital_id', $1, true)`,
      [String(req.hospitalId)]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    const loginFinal = login || email;
    if (!loginFinal) throw new Error('Login ou email requis pour le compte utilisateur');

    const userResult = await client.query(
      `INSERT INTO utilisateurs (hospital_id, login, nom, prenom, email, password_hash, role, actif)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
      [req.hospitalId, loginFinal, nom, prenom, email, hashedPassword, role]
    );
    const userId = userResult.rows[0].id;

    const medResult = await client.query(
      `INSERT INTO medecins (hospital_id, nom, prenom, specialite, email, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.hospitalId, nom, prenom, specialite || null, email || null, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Médecin et compte créés avec succès',
      medecinId: medResult.rows[0].id,
      userId,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) { /* noop */ }
    console.error('❌ Erreur création médecin+compte :', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ============================================================
// 10. 404 + gestionnaire d'erreur
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} non trouvée`,
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.stack);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================
// 11. DÉMARRAGE
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur backend démarré sur http://0.0.0.0:${PORT}`);
  console.log(`🩺 Health check : http://0.0.0.0:${PORT}/api/health`);
  console.log(`🔐 Login : POST http://0.0.0.0:${PORT}/api/auth/login`);
  console.log(`👑 Super admin : http://0.0.0.0:${PORT}/api/platform/*`);
  console.log(`📚 Bibliothèque : http://0.0.0.0:${PORT}/api/library/*`);
  console.log(`💬 Chat live : http://0.0.0.0:${PORT}/api/chat/*`);
  console.log(`🎓 Chat formation : http://0.0.0.0:${PORT}/api/chat-formation/*`);
  if (!PLATFORM_DOMAIN) {
    console.warn('⚠️ PLATFORM_DOMAIN non défini — les sous-domaines seront bloqués par CORS.');
  }
});