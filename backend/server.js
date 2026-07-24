require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcrypt');

// Import des routeurs existants
const authRoutes = require('./src/routes/auth');
const consultationRoutes = require('./src/routes/consultations');
const billingRoutes = require('./src/routes/billing');
const pharmacyRoutes = require('./src/routes/pharmacy');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const patientRoutes = require('./src/routes/patients');
const logRoutes = require('./src/routes/logs');
const prescriptionsRoutes = require('./src/routes/prescriptions');
const adminRoutes = require('./src/routes/admin');

// ========== IMPORTS MODULE PARAMÉDICAL ==========
const soinsRoutes = require('./src/routes/soinsRoutes');
const actesRoutes = require('./src/routes/actesRoutes');

// ========== IMPORTS MODULE LABORATOIRE & IMAGERIE ==========
const examensRoutes = require('./src/routes/examensRoutes');
const typesExamensRoutes = require('./src/routes/typesExamensRoutes');
const path = require('path');

// ========== IMPORTS MODULE RESSOURCES HUMAINES & PLANNING ==========
const employesRoutes = require('./src/routes/employesRoutes');
const servicesRoutes = require('./src/routes/servicesRoutes');
const planningsRoutes = require('./src/routes/planningsRoutes');
const congesRoutes = require('./src/routes/congesRoutes');
const absencesRoutes = require('./src/routes/absencesRoutes');
const contratsRoutes = require('./src/routes/contratsRoutes');

// ========== IMPORTS MODULE FINANCES & COMPTABILITÉ ==========
const comptesRoutes = require('./src/routes/comptesRoutes');
const ecrituresRoutes = require('./src/routes/ecrituresRoutes');
const journauxRoutes = require('./src/routes/journauxRoutes');
const budgetsRoutes = require('./src/routes/budgetsRoutes');
const paiementsRoutes = require('./src/routes/paiementsRoutes');
const rapportsFinanciersRoutes = require('./src/routes/rapportsFinanciersRoutes');

// ========== IMPORTS MODULE STOCK & APPROVISIONNEMENT ==========
const produitsRoutes = require('./src/routes/produitsRoutes');
const stocksRoutes = require('./src/routes/stocksRoutes');
const fournisseursRoutes = require('./src/routes/fournisseursRoutes');
const commandesAchatRoutes = require('./src/routes/commandesAchatRoutes');
const mouvementsRoutes = require('./src/routes/mouvementsRoutes');
const inventairesRoutes = require('./src/routes/inventairesRoutes');

// ========== IMPORTS MODULE QUALITÉ & RISQUES ==========
const signalementsRoutes = require('./src/routes/signalementsRoutes');
const auditsRoutes = require('./src/routes/auditsRoutes');
const actionsCAPARoutes = require('./src/routes/actionsCAPARoutes');
const indicateursRoutes = require('./src/routes/indicateursRoutes');
const nonConformitesRoutes = require('./src/routes/nonConformitesRoutes');
const evaluationsRisquesRoutes = require('./src/routes/evaluationsRisquesRoutes');
const dashboardQualiteRoutes = require('./src/routes/dashboardQualiteRoutes');  // ⬅️ NOUVELLE LIGNE

// ========== IMPORTS MODULE REPORTING & DÉCISIONNEL (BI) ==========
const biRoutes = require('./src/routes/biRoutes');

// ========== IMPORTS MODULE SÉCURITÉ ==========
const securityRoutes = require('./src/routes/securityRoutes');

// ========== IMPORTS MODULE INTEROPÉRABILITÉ ==========
const interoperabiliteRoutes = require('./src/routes/interoperabiliteRoutes');

// Importer les middlewares d'authentification
const { authenticate, requireRole } = require('./src/middleware/auth');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const blocRoutes = require('./src/routes/blocRoutes');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 1. Middlewares globaux ==========
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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

// ========== 4. Routes protégées (authentification requise) ==========
app.use('/api/consultations', consultationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/admin', adminRoutes);

// ========== ROUTES PARAMÉDICALES ==========
app.use('/api/soins', soinsRoutes);
app.use('/api/actes-paramedicaux', actesRoutes);

// ========== ROUTES LABORATOIRE & IMAGERIE ==========
app.use('/api/examens', examensRoutes);
app.use('/api/types-examens', typesExamensRoutes);

// ========== ROUTES RESSOURCES HUMAINES & PLANNING ==========
app.use('/api/employes', employesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/plannings', planningsRoutes);
app.use('/api/conges', congesRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/contrats', contratsRoutes);

// ========== ROUTES FINANCES & COMPTABILITÉ ==========
app.use('/api/comptes', comptesRoutes);
app.use('/api/ecritures', ecrituresRoutes);
app.use('/api/journaux', journauxRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/rapports-financiers', rapportsFinanciersRoutes);

// ========== ROUTES STOCK & APPROVISIONNEMENT ==========
app.use('/api/produits', produitsRoutes);
app.use('/api/stocks', stocksRoutes);
app.use('/api/fournisseurs', fournisseursRoutes);
app.use('/api/commandes', commandesAchatRoutes);
app.use('/api/mouvements', mouvementsRoutes);
app.use('/api/inventaires', inventairesRoutes);

// ========== ROUTES QUALITÉ & RISQUES ==========
app.use('/api/signalements', signalementsRoutes);
app.use('/api/audits', auditsRoutes);
app.use('/api/actions-capa', actionsCAPARoutes);
app.use('/api/indicateurs', indicateursRoutes);
app.use('/api/non-conformites', nonConformitesRoutes);
app.use('/api/evaluations-risques', evaluationsRisquesRoutes);
app.use('/api/dashboard/qualite', dashboardQualiteRoutes);  // ⬅️ NOUVELLE LIGNE

// ========== ROUTES REPORTING & DÉCISIONNEL (BI) ==========
app.use('/api/bi', biRoutes);

// ========== ROUTES SÉCURITÉ ==========
app.use('/api/security', securityRoutes.router);

// ========== ROUTES INTEROPÉRABILITÉ ==========
app.use('/api/interoperabilite', interoperabiliteRoutes);
app.use('/api/bloc', blocRoutes);

// ========== 4bis. Route spécifique pour /admin/patients (legacy) ==========
app.get('/admin/patients', authenticate, requireRole(['admin', 'pharmacien']), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, prenom AS first_name, nom AS last_name, email
      FROM patients
      ORDER BY nom, prenom
    `);
    res.json(rows);
  } catch (err) {
    console.error('Erreur /admin/patients:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTE : Création d’un médecin + compte utilisateur ==========
app.post('/api/consultations/medecins-avec-compte', authenticate, requireRole(['admin']), async (req, res) => {
  const { nom, prenom, specialite, email, login, password, role = 'medecin' } = req.body;

  if (!nom || !prenom || !password) {
    return res.status(400).json({ error: 'Nom, prénom et mot de passe sont requis' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Utiliser l'email comme login si login non fourni
    const loginFinal = login || email;
    if (!loginFinal) {
      throw new Error('Login ou email requis pour le compte utilisateur');
    }

    // Créer l’utilisateur
    const [userResult] = await connection.query(
      `INSERT INTO utilisateurs (login, nom, prenom, email, password, role, actif)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [loginFinal, nom, prenom, email, hashedPassword, role]
    );
    const userId = userResult.insertId;

    // Créer le médecin avec le user_id
    const [medResult] = await connection.query(
      `INSERT INTO medecins (nom, prenom, specialite, email, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [nom, prenom, specialite || null, email || null, userId]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Médecin et compte créés avec succès',
      medecinId: medResult.insertId,
      userId: userId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erreur création médecin+compte :', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
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
  console.error('Erreur serveur :', err.stack);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== 7. Démarrage du serveur ==========
app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
  console.log(`🩺 Health check : http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login : POST http://localhost:${PORT}/api/auth/login`);
  console.log(`📦 Médicaments : GET http://localhost:${PORT}/api/pharmacy/medicaments (authentifié)`);
  console.log(`👥 Patients admin : GET http://localhost:${PORT}/admin/patients (authentifié)`);
  console.log(`👤 Gestion utilisateurs : GET http://localhost:${PORT}/api/admin/utilisateurs (admin requis)`);
  console.log(`💉 Soins : GET http://localhost:${PORT}/api/soins (authentifié)`);
  console.log(`📋 Actes paramédicaux : GET http://localhost:${PORT}/api/actes-paramedicaux (authentifié)`);
  console.log(`🔬 Examens : GET http://localhost:${PORT}/api/examens (authentifié)`);
  console.log(`📊 Types d'examens : GET http://localhost:${PORT}/api/types-examens (authentifié)`);
  console.log(`👥 Employés : GET http://localhost:${PORT}/api/employes (authentifié)`);
  console.log(`🏢 Services : GET http://localhost:${PORT}/api/services (authentifié)`);
  console.log(`📅 Plannings : GET http://localhost:${PORT}/api/plannings (authentifié)`);
  console.log(`🏖️ Congés : GET http://localhost:${PORT}/api/conges (authentifié)`);
  console.log(`❌ Absences : GET http://localhost:${PORT}/api/absences (authentifié)`);
  console.log(`📄 Contrats : GET http://localhost:${PORT}/api/contrats (authentifié)`);
  console.log(`📊 Comptes : GET http://localhost:${PORT}/api/comptes (authentifié)`);
  console.log(`📝 Écritures : GET http://localhost:${PORT}/api/ecritures (authentifié)`);
  console.log(`📒 Journaux : GET http://localhost:${PORT}/api/journaux (authentifié)`);
  console.log(`💰 Budgets : GET http://localhost:${PORT}/api/budgets (authentifié)`);
  console.log(`💳 Paiements : GET http://localhost:${PORT}/api/paiements (authentifié)`);
  console.log(`📈 Rapports financiers : GET http://localhost:${PORT}/api/rapports-financiers (authentifié)`);
  console.log(`📦 Produits : GET http://localhost:${PORT}/api/produits (authentifié)`);
  console.log(`📊 Stocks : GET http://localhost:${PORT}/api/stocks (authentifié)`);
  console.log(`🚚 Fournisseurs : GET http://localhost:${PORT}/api/fournisseurs (authentifié)`);
  console.log(`🛒 Commandes : GET http://localhost:${PORT}/api/commandes (authentifié)`);
  console.log(`📈 Mouvements : GET http://localhost:${PORT}/api/mouvements (authentifié)`);
  console.log(`📋 Inventaires : GET http://localhost:${PORT}/api/inventaires (authentifié)`);
  console.log(`🚨 Signalements : GET http://localhost:${PORT}/api/signalements (authentifié)`);
  console.log(`📋 Audits : GET http://localhost:${PORT}/api/audits (authentifié)`);
  console.log(`⚡ Actions CAPA : GET http://localhost:${PORT}/api/actions-capa (authentifié)`);
  console.log(`📊 Indicateurs : GET http://localhost:${PORT}/api/indicateurs (authentifié)`);
  console.log(`❌ Non-conformités : GET http://localhost:${PORT}/api/non-conformites (authentifié)`);
  console.log(`⚠️ Évaluations risques : GET http://localhost:${PORT}/api/evaluations-risques (authentifié)`);
  console.log(`📊 BI Dashboard : GET http://localhost:${PORT}/api/bi/dashboard (authentifié)`);
  console.log(`📈 Rapports BI : GET http://localhost:${PORT}/api/bi/rapports (authentifié)`);
  console.log(`🔒 Sécurité : GET http://localhost:${PORT}/api/security/roles (admin requis)`);
  console.log(`📋 Logs sécurité : GET http://localhost:${PORT}/api/security/logs (admin requis)`);
  console.log(`🌐 Interopérabilité : GET http://localhost:${PORT}/api/interoperabilite/systemes (authentifié)`);
  console.log(`📡 Webhooks : POST http://localhost:${PORT}/api/interoperabilite/webhook/:token (public)`);
});