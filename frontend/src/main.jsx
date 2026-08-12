import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Dashboard from './pages/dashboard/Dashboard';
import './index.css';
import UIShowcase from './pages/ui/UIShowcase';
import Badge from './pages/rh-planning/Badge';

// ========== IMPORTS UI/UX (Providers) ==========
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

// ========== IMPORTS SCURIT (PERMISSIONS) ==========
import { PermissionRoute } from './components/PermissionRoute';

// ========== LAYOUT (NAVBAR) ==========
import Layout from './components/Layout';

// ========== PAGE ACCS NON AUTORIS ==========
import Unauthorized from './pages/Unauthorized';

// ========== PAGE PARTENAIRE (PUBLIC) ==========
import RendezVousPartenaire from './pages/RendezVousPartenaire';

// ========== IMPORTS OFFLINE ==========
import api from './axios';
import { onConnectionChange } from './services/offlineStorage';

// Anciens imports (conservs pour les autres modules)
import PatientsList from './pages/patients/PatientsList';
import PatientForm from './pages/patients/PatientForm';
import PatientProfile from './pages/patients/PatientProfile';
import AdmissionForm from './pages/consultations/AdmissionForm';
import UrgencesList from './pages/consultations/UrgencesList';
import RendezVousList from './pages/consultations/RendezVousList';
import ConsultationsHome from './pages/consultations/ConsultationsHome';
import TransfertForm from './pages/consultations/TransfertForm';
import SortieForm from './pages/consultations/SortieForm';
import BedManagement from './pages/lits/BedManagement';
import Admin from './pages/admin/Admin';
import Login from './pages/admin/Login';
import FacturesList from './pages/billing/FacturesList';
import FactureForm from './pages/billing/FactureForm';
import FactureDetail from './pages/billing/FactureDetail';
import PrestationsList from './pages/billing/PrestationsList';
import MedicamentsList from './pages/pharmacy/MedicamentsList';
import LotsList from './pages/pharmacy/LotsList';
import TarifSheet from './pages/billing/TarifSheet';
import DelivranceForm from './pages/pharmacy/DelivranceForm';
import RetourForm from './pages/pharmacy/RetourForm';
import OrdonnanceForm from './pages/consultations/OrdonnanceForm';
import PrescriptionPage from './pages/PrescriptionPage';
import PrescriptionForm from './pages/consultations/PrescriptionForm';
import PrescriptionCreation from './pages/consultations/PrescriptionCreation';
import DoctorPrescriptionList from './pages/consultations/DoctorPrescriptionList';
import PharmacistPrescriptionList from './pages/consultations/PharmacistPrescriptionList';
import PrescriptionDetail from './pages/consultations/PrescriptionDetail';

// ========== IMPORTS DME ==========
import MedicalModule from './pages/medical/MedicalModule';
import MedicalPatientsList from './pages/medical/PatientsList';
import PatientMedicalRecord from './pages/medical/PatientMedicalRecord';
import MedicalAdmissionsList from './pages/medical/AdmissionsList';
import MedicalAdmissionForm from './pages/medical/AdmissionForm';
import MedicalBedManagement from './pages/medical/BedManagement';
import AdmissionDetail from './pages/medical/AdmissionDetail';
import AdmissionEdit from './pages/medical/AdmissionEdit';

// ========== IMPORTS MODULE PARAMDICAL & SOINS ==========
import ParamedicalModule from './pages/paramedical/ParamedicalModule';
import SoinsList from './pages/paramedical/SoinsList';
import SoinForm from './pages/paramedical/SoinForm';
import SoinDetail from './pages/paramedical/SoinDetail';
import PlanningSoins from './pages/paramedical/PlanningSoins';
import ActesParamedicaux from './pages/paramedical/ActesParamedicaux';
import PatientSuivi from './pages/paramedical/PatientSuivi';

// ========== IMPORTS MODULE LABORATOIRE & IMAGERIE ==========
import LaboratoireImagerieModule from './pages/laboratoire-imagerie/LaboratoireImagerieModule';
import ExamensList from './pages/laboratoire-imagerie/ExamensList';
import ExamenForm from './pages/laboratoire-imagerie/ExamenForm';
import ExamenDetail from './pages/laboratoire-imagerie/ExamenDetail';
import ResultatForm from './pages/laboratoire-imagerie/ResultatForm';
import ValidationForm from './pages/laboratoire-imagerie/ValidationForm';
import TypesExamens from './pages/laboratoire-imagerie/TypesExamens';
import ParametresLabo from './pages/laboratoire-imagerie/ParametresLabo';

// ========== IMPORTS MODULE RESSOURCES HUMAINES & PLANNING ==========
import RHPlanningModule from './pages/rh-planning/RHPlanningModule';
import EmployesList from './pages/rh-planning/EmployesList';
import EmployeForm from './pages/rh-planning/EmployeForm';
import EmployeDetail from './pages/rh-planning/EmployeDetail';
import ServicesList from './pages/rh-planning/ServicesList';
import ServiceForm from './pages/rh-planning/ServiceForm';
import PlanningsList from './pages/rh-planning/PlanningsList';
import PlanningForm from './pages/rh-planning/PlanningForm';
import PlanningDetail from './pages/rh-planning/PlanningDetail';
import CongesList from './pages/rh-planning/CongesList';
import CongeForm from './pages/rh-planning/CongeForm';
import AbsencesList from './pages/rh-planning/AbsencesList';
import AbsenceForm from './pages/rh-planning/AbsenceForm';
import StatsRH from './pages/rh-planning/StatsRH';
// ? NOUVEAU : imports pour les contrats
import ContratsList from './pages/rh-planning/ContratsList';
import ContratForm from './pages/rh-planning/ContratForm';
import ContratDetail from './pages/rh-planning/ContratDetail';

// ========== IMPORTS MODULE FINANCES & COMPTABILIT ==========
import FinancesModule from './pages/finances/FinancesModule';
import DashboardFinances from './pages/finances/DashboardFinances';
import ComptesList from './pages/finances/ComptesList';
import CompteForm from './pages/finances/CompteForm';
import EcrituresList from './pages/finances/EcrituresList';
import EcritureForm from './pages/finances/EcritureForm';
import EcritureDetail from './pages/finances/EcritureDetail';
import JournauxList from './pages/finances/JournauxList';
import JournalForm from './pages/finances/JournalForm';
import BudgetsList from './pages/finances/BudgetsList';
import BudgetForm from './pages/finances/BudgetForm';
import PaiementsList from './pages/finances/PaiementsList';
import PaiementForm from './pages/finances/PaiementForm';
import RapportsFinanciers from './pages/finances/RapportsFinanciers';

// ========== IMPORTS MODULE STOCK & APPROVISIONNEMENT (AVEC ALIAS) ==========
import StockModule from './pages/stock/StockModule';
import DashboardStock from './pages/stock/DashboardStock';
import ProduitsList from './pages/stock/ProduitsList';
import ProduitForm from './pages/stock/ProduitForm';
import StocksList from './pages/stock/StocksList';
import MouvementsList from './pages/stock/MouvementsList';
import FournisseursList from './pages/stock/FournisseursList';
import FournisseurForm from './pages/stock/FournisseurForm';
import CommandesList from './pages/stock/CommandesList';
import StockCommandeForm from './pages/stock/CommandeForm';
import CommandeDetail from './pages/stock/CommandeDetail';
import InventairesList from './pages/stock/InventairesList';
import InventaireForm from './pages/stock/InventaireForm';
import InventaireDetail from './pages/stock/InventaireDetail'; // ? NOUVEAU

// ========== IMPORTS MODULE QUALIT & RISQUES ==========
import QualiteModule from './pages/qualite/QualiteModule';
import DashboardQualite from './pages/qualite/DashboardQualite';
import SignalementsList from './pages/qualite/SignalementsList';
import SignalementForm from './pages/qualite/SignalementForm';
import SignalementDetail from './pages/qualite/SignalementDetail';
import AuditsList from './pages/qualite/AuditsList';
import AuditForm from './pages/qualite/AuditForm';
import AuditDetail from './pages/qualite/AuditDetail';
import ActionsCAPAList from './pages/qualite/ActionsCAPAList';
import ActionCAPAForm from './pages/qualite/ActionCAPAForm';
import ActionCAPADetail from './pages/qualite/ActionCAPADetail';
import IndicateursList from './pages/qualite/IndicateursList';
import IndicateurForm from './pages/qualite/IndicateurForm';
import NonConformitesList from './pages/qualite/NonConformitesList';
import NonConformiteForm from './pages/qualite/NonConformiteForm';
import EvaluationsRisquesList from './pages/qualite/EvaluationsRisquesList';
import EvaluationRisqueForm from './pages/qualite/EvaluationRisqueForm';

// ========== IMPORTS MODULE REPORTING & DCISIONNEL (BI) ==========
import ReportingModule from './pages/reporting/ReportingModule';
import DashboardBI from './pages/reporting/DashboardBI';
import RapportsList from './pages/reporting/RapportsList';
import ExportsList from './pages/reporting/ExportsList';

// ========== IMPORTS MODULE SCURIT ==========
import SecurityModule from './pages/security/SecurityModule';
import DashboardSecurity from './pages/security/DashboardSecurity';
import RolesList from './pages/security/RolesList';
import RoleForm from './pages/security/RoleForm';
import PermissionsList from './pages/security/PermissionsList';
import LogsList from './pages/security/LogsList';
import SessionsList from './pages/security/SessionsList';
import TentativesList from './pages/security/TentativesList';

// ========== IMPORTS MODULE INTEROPRABILIT ==========
import InteroperabiliteModule from './pages/interoperabilite/InteroperabiliteModule';
import DashboardInteroperabilite from './pages/interoperabilite/DashboardInteroperabilite';
import SystemesList from './pages/interoperabilite/SystemesList';
import FluxList from './pages/interoperabilite/FluxList';
import LogsInteroperabiliteList from './pages/interoperabilite/LogsList';
import WebhooksList from './pages/interoperabilite/WebhooksList';

// ========== IMPORTS MODULE BLOC OPRATOIRE ==========
import BlocModule from './pages/bloc/BlocModule';
import PlanningBloc from './pages/bloc/PlanningBloc';
import InterventionsList from './pages/bloc/InterventionsList';
import InterventionForm from './pages/bloc/InterventionForm';
import SallesList from './pages/bloc/SallesList';
import BlocStats from './pages/bloc/BlocStats';

// ========== IMPORTS POUR LA PHARMACIE (DASHBOARD + COMMANDES) ==========
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import PharmacyCommandesList from './pages/pharmacy/CommandesList';
import PharmacyCommandeForm from './pages/pharmacy/CommandeForm';

// ============================================================
// ==================== ERROR BOUNDARY ========================
// ============================================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('?? ErrorBoundary a captur une erreur :', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#b91c1c', backgroundColor: '#fee2e2', minHeight: '100vh' }}>
          <h1>? Erreur dans l'application</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
            <summary>Dtails techniques</summary>
            <p><strong>{this.state.error?.toString()}</strong></p>
            <p>{this.state.errorInfo?.componentStack}</p>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// ========== ENREGISTREMENT DU SERVICE WORKER ================
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('? Service Worker enregistr avec succs');
        console.log('?? Scope:', registration.scope);
      })
      .catch((error) => {
        console.error('? Erreur enregistrement Service Worker:', error);
      });
  });
}

// ============================================================
// ========== INTERCEPTEUR GLOBAL ==============================
// ============================================================
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// ========== COMPOSANTS DE PROTECTION ========================
// ============================================================
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RoleRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!allowedRoles.includes(payload.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// ============================================================
// ========== COMPOSANT DE SYNCHRONISATION OFFLINE ============
// ============================================================
const SyncManager = () => {
  useEffect(() => {
    if (navigator.onLine) {
      console.log('?? Synchronisation initiale...');
      api.sync().catch(console.error);
    }

    const cleanup = onConnectionChange((isOnline) => {
      if (isOnline) {
        console.log('?? Connexion rtablie, synchronisation...');
        setTimeout(() => {
          api.sync().catch(console.error);
        }, 2000);
      }
    });

    return cleanup;
  }, []);

  return null;
};

// ============================================================
// ========== RENDU PRINCIPAL =================================
// ============================================================
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <SyncManager />
              <Routes>
                {/* ===== Routes publiques (sans navbar) ===== */}
                <Route path="/login" element={<Login />} />
                <Route path="/ui" element={<UIShowcase />} />
                <Route path="/test" element={<div style={{ color: 'green', fontSize: '2rem' }}>? Test OK</div>} />

                {/* ? NOUVELLE ROUTE PUBLIQUE POUR LES PARTENAIRES ? */}
                <Route path="/rdv-partenaire/:token" element={<RendezVousPartenaire />} />

                {/* ===== Routes protges avec Layout (navbar) ===== */}
                <Route element={<Layout />}>
                  <Route path="/badge/:id" element={<Badge />} />

                  {/* Page d'accueil (Home)  visible par tous les utilisateurs connects */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Home />
                      </ProtectedRoute>
                    }
                  />

                  {/* Page Accs non autoris */}
                  <Route
                    path="/unauthorized"
                    element={
                      <ProtectedRoute>
                        <Unauthorized />
                      </ProtectedRoute>
                    }
                  />

                  {/* Dashboard */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_dashboard">
                          <Dashboard />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Patients */}
                  <Route
                    path="/patients"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_patients">
                          <PatientsList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patients/new"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_patients">
                          <PatientForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patients/edit/:id"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_patients">
                          <PatientForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/patients/:id"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_patients">
                          <PatientProfile />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Consultations */}
                  <Route
                    path="/admission"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_consultations">
                          <AdmissionForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/urgences"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_consultations">
                          <UrgencesList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rendezvous"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_consultations">
                          <RendezVousList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/consultations"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_consultations">
                          <ConsultationsHome />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/transfert"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_consultations">
                          <TransfertForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sortie"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_consultations">
                          <SortieForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Lits */}
                  <Route
                    path="/lits"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_consultations">
                          <BedManagement />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* ===== FACTURATION (avec permissions ddies) ===== */}
                  <Route
                    path="/factures"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_facturation">
                          <FacturesList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/factures/new"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_facturation">
                          <FactureForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/factures/:id"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_facturation">
                          <FactureDetail />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prestations"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_facturation">
                          <PrestationsList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tarifs"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_facturation">
                          <TarifSheet />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Pharmacie */}
                  <Route
                    path="/pharmacy"
                    element={<Navigate to="/pharmacy/dashboard" replace />}
                  />
                  <Route
                    path="/pharmacy/dashboard"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_pharmacy">
                          <PharmacyDashboard />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/medicaments"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_pharmacy">
                          <MedicamentsList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/lots"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_pharmacy">
                          <LotsList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/lots/:medicamentId"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_pharmacy">
                          <LotsList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/delivrance"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_pharmacy">
                          <DelivranceForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/delivrance/:ordonnanceId"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_pharmacy">
                          <DelivranceForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/retour"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_pharmacy">
                          <RetourForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* ? Nouveaux : Routes de gestion des commandes pour la pharmacie */}
                  <Route
                    path="/pharmacy/commandes"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_pharmacy">
                          <PharmacyCommandesList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pharmacy/commandes/nouveau"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_pharmacy">
                          <PharmacyCommandeForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pharmacy/commandes/:id/reception"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_pharmacy">
                          <PharmacyCommandeForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_security">
                          <Admin />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Prescriptions */}
                  <Route
                    path="/prescription/new"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_prescriptions">
                          <PrescriptionCreation />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescription/new/:patientId"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_prescriptions">
                          <PrescriptionCreation />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/doctor/prescriptions"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_prescriptions">
                          <DoctorPrescriptionList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pharmacist/prescriptions"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_prescriptions">
                          <PharmacistPrescriptionList />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescription/:id"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_prescriptions">
                          <PrescriptionDetail />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescription"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_prescriptions">
                          <PrescriptionPage />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/prescription/:patientId"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_prescriptions">
                          <PrescriptionPage />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* Ordonnances */}
                  <Route
                    path="/ordonnance"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_prescriptions">
                          <OrdonnanceForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ordonnance/:patientId"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_prescriptions">
                          <OrdonnanceForm />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  />

                  {/* ============================================================ */}
                  {/* MODULE MDICAL (DME)  AVEC NOUVELLES ROUTES                 */}
                  {/* ============================================================ */}
                  <Route
                    path="/medical"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_medical">
                          <MedicalModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<MedicalPatientsList />} />
                    <Route path="patients" element={<MedicalPatientsList />} />
                    <Route path="patients/:id" element={<PatientMedicalRecord />} />
                    <Route path="admissions" element={<MedicalAdmissionsList />} />
                    <Route path="admissions/new" element={<MedicalAdmissionForm />} />
                    <Route path="admissions/:id" element={<AdmissionDetail />} />
                    <Route path="admissions/edit/:id" element={<AdmissionEdit />} />
                    <Route path="beds" element={<MedicalBedManagement />} />
                  </Route>

                  {/* MODULE PARAMDICAL */}
                  <Route
                    path="/paramedical"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="manage_paramedical">
                          <ParamedicalModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<SoinsList />} />
                    <Route path="soins" element={<SoinsList />} />
                    <Route path="soins/nouveau" element={<SoinForm />} />
                    <Route path="soins/:id/edit" element={<SoinForm />} />
                    <Route path="soins/:id" element={<SoinDetail />} />
                    <Route path="planning" element={<PlanningSoins />} />
                    <Route path="actes" element={<ActesParamedicaux />} />
                    <Route path="suivi/:patientId" element={<PatientSuivi />} />
                  </Route>

                  {/* ============================================================ */}
                  {/* MODULE LABORATOIRE & IMAGERIE - ROUTES COMPLTES */}
                  {/* ============================================================ */}
                  <Route
                    path="/laboratoire"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_laboratory">
                          <LaboratoireImagerieModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ExamensList />} />
                    <Route path="examens" element={<ExamensList />} />
                    <Route path="urgents" element={<ExamensList initialFilter={{ priorite: 'urgent' }} />} />
                    <Route path="examen/nouveau" element={<ExamenForm />} />
                    <Route path="examen/:id" element={<ExamenDetail />} />
                    <Route path="resultats/:id" element={<ResultatForm />} />
                    <Route path="validation/:id" element={<ValidationForm />} />
                    <Route path="types" element={<TypesExamens />} />
                    <Route path="parametres" element={<ParametresLabo />} />
                    <Route path="stats" element={<Navigate to="/laboratoire" replace />} />
                  </Route>
                  <Route path="/laboratory" element={<Navigate to="/laboratoire" replace />} />
                  {/* ============================================================ */}

                  {/* ============================================================ */}
                  {/* MODULE RH (RESSOURCES HUMAINES & PLANNING)  ROUTES COMPLTES */}
                  {/* ============================================================ */}
                  <Route
                    path="/rh"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_rh">
                          <RHPlanningModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<StatsRH />} />
                    <Route path="employes" element={<EmployesList />} />
                    <Route path="employes/nouveau" element={<EmployeForm />} />
                    <Route path="employes/:id" element={<EmployeDetail />} />
                    <Route path="employes/:id/edit" element={<EmployeForm />} />
                    <Route path="services" element={<ServicesList />} />
                    <Route path="services/nouveau" element={<ServiceForm />} />
                    <Route path="services/:id/edit" element={<ServiceForm />} />
                    <Route path="plannings" element={<PlanningsList />} />
                    <Route path="plannings/nouveau" element={<PlanningForm />} />
                    <Route path="plannings/:id" element={<PlanningDetail />} />
                    <Route path="plannings/:id/edit" element={<PlanningForm />} />
                    <Route path="conges" element={<CongesList />} />
                    <Route path="conges/nouveau" element={<CongeForm />} />
                    <Route path="conges/:id" element={<CongeForm />} />
                    <Route path="absences" element={<AbsencesList />} />
                    <Route path="absences/nouveau" element={<AbsenceForm />} />
                    <Route path="absences/:id" element={<AbsenceForm />} />
                    {/* ? NOUVEAU : Routes pour les contrats */}
                    <Route path="contrats" element={<ContratsList />} />
                    <Route path="contrats/nouveau" element={<ContratForm />} />
                    <Route path="contrats/:id" element={<ContratDetail />} />
                    <Route path="contrats/edit/:id" element={<ContratForm />} />
                    <Route path="stats" element={<StatsRH />} />
                  </Route>
                  <Route path="/hr" element={<Navigate to="/rh" replace />} />

                  {/* MODULE FINANCES (comptabilit) */}
                  <Route
                    path="/finance"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_finance">
                          <FinancesModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardFinances />} />
                    <Route path="comptes" element={<ComptesList />} />
                    <Route path="comptes/nouveau" element={<CompteForm />} />
                    <Route path="comptes/:id/edit" element={<CompteForm />} />
                    <Route path="ecritures" element={<EcrituresList />} />
                    <Route path="ecritures/nouveau" element={<EcritureForm />} />
                    <Route path="ecritures/:id" element={<EcritureDetail />} />
                    <Route path="journaux" element={<JournauxList />} />
                    <Route path="journaux/nouveau" element={<JournalForm />} />
                    <Route path="journaux/:id/edit" element={<JournalForm />} />
                    <Route path="budgets" element={<BudgetsList />} />
                    <Route path="budgets/nouveau" element={<BudgetForm />} />
                    <Route path="budgets/:id/edit" element={<BudgetForm />} />
                    <Route path="paiements" element={<PaiementsList />} />
                    <Route path="paiements/nouveau" element={<PaiementForm />} />
                    <Route path="rapports" element={<RapportsFinanciers />} />
                  </Route>
                  <Route path="/finances" element={<Navigate to="/finance" replace />} />

                  {/* MODULE STOCK (avec alias StockCommandeForm) */}
                  <Route
                    path="/stock"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_stock">
                          <StockModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardStock />} />
                    <Route path="produits" element={<ProduitsList />} />
                    <Route path="produits/nouveau" element={<ProduitForm />} />
                    <Route path="produits/:id/edit" element={<ProduitForm />} />
                    <Route path="stocks" element={<StocksList />} />
                    <Route path="mouvements" element={<MouvementsList />} />
                    <Route path="fournisseurs" element={<FournisseursList />} />
                    <Route path="fournisseurs/nouveau" element={<FournisseurForm />} />
                    <Route path="fournisseurs/:id/edit" element={<FournisseurForm />} />
                    <Route path="commandes" element={<CommandesList />} />
                    <Route path="commandes/nouveau" element={<StockCommandeForm />} />
                    <Route path="commandes/:id" element={<CommandeDetail />} />
                    <Route path="inventaires" element={<InventairesList />} />
                    <Route path="inventaires/nouveau" element={<InventaireForm />} />
                    <Route path="inventaires/:id" element={<InventaireDetail />} />  {/* ? NOUVEAU */}
                  </Route>
                  <Route path="/stocks" element={<Navigate to="/stock" replace />} />

                  {/* MODULE QUALIT */}
                  <Route
                    path="/qualite"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_quality">
                          <QualiteModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardQualite />} />
                    <Route path="signalements" element={<SignalementsList />} />
                    <Route path="signalements/nouveau" element={<SignalementForm />} />
                    <Route path="signalements/:id" element={<SignalementDetail />} />
                    <Route path="signalements/:id/edit" element={<SignalementForm />} />
                    <Route path="audits" element={<AuditsList />} />
                    <Route path="audits/nouveau" element={<AuditForm />} />
                    <Route path="audits/:id" element={<AuditDetail />} />
                    <Route path="audits/:id/edit" element={<AuditForm />} />
                    <Route path="actions-capa" element={<ActionsCAPAList />} />
                    <Route path="actions-capa/nouveau" element={<ActionCAPAForm />} />
                    <Route path="actions-capa/:id" element={<ActionCAPADetail />} />
                    <Route path="actions-capa/:id/edit" element={<ActionCAPAForm />} />
                    <Route path="indicateurs" element={<IndicateursList />} />
                    <Route path="indicateurs/nouveau" element={<IndicateurForm />} />
                    <Route path="indicateurs/:id/edit" element={<IndicateurForm />} />
                    <Route path="non-conformites" element={<NonConformitesList />} />
                    <Route path="non-conformites/nouveau" element={<NonConformiteForm />} />
                    <Route path="non-conformites/:id/edit" element={<NonConformiteForm />} />
                    <Route path="evaluations-risques" element={<EvaluationsRisquesList />} />
                    <Route path="evaluations-risques/nouveau" element={<EvaluationRisqueForm />} />
                    <Route path="evaluations-risques/:id/edit" element={<EvaluationRisqueForm />} />
                  </Route>
                  <Route path="/quality" element={<Navigate to="/qualite" replace />} />

                  {/* MODULE REPORTING */}
                  <Route
                    path="/reporting"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_reporting">
                          <ReportingModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardBI />} />
                    <Route path="rapports" element={<RapportsList />} />
                    <Route path="export" element={<ExportsList />} />
                  </Route>
                  <Route path="/bi" element={<Navigate to="/reporting" replace />} />

                  {/* MODULE SCURIT */}
                  <Route
                    path="/security"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_security">
                          <SecurityModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardSecurity />} />
                    <Route path="roles" element={<RolesList />} />
                    <Route path="roles/nouveau" element={<RoleForm />} />
                    <Route path="roles/:id/edit" element={<RoleForm />} />
                    <Route path="permissions" element={<PermissionsList />} />
                    <Route path="logs" element={<LogsList />} />
                    <Route path="sessions" element={<SessionsList />} />
                    <Route path="tentatives" element={<TentativesList />} />
                  </Route>

                  {/* MODULE INTEROPRABILIT */}
                  <Route
                    path="/interoperabilite"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_interoperabilite">
                          <InteroperabiliteModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<DashboardInteroperabilite />} />
                    <Route path="systemes" element={<SystemesList />} />
                    <Route path="flux" element={<FluxList />} />
                    <Route path="logs" element={<LogsInteroperabiliteList />} />
                    <Route path="webhooks" element={<WebhooksList />} />
                  </Route>
                  <Route path="/interop" element={<Navigate to="/interoperabilite" replace />} />

                  {/* ========== MODULE BLOC OPRATOIRE ========== */}
                  <Route
                    path="/bloc"
                    element={
                      <ProtectedRoute>
                        <PermissionRoute permission="view_medical">
                          <BlocModule />
                        </PermissionRoute>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<PlanningBloc />} />
                    <Route path="interventions" element={<InterventionsList />} />
                    <Route path="interventions/nouveau" element={<InterventionForm />} />
                    <Route path="interventions/:id/edit" element={<InterventionForm />} />
                    <Route path="salles" element={<SallesList />} />
                    <Route path="stats" element={<BlocStats />} />
                  </Route>

                </Route> {/* fin du Layout */}

                {/* Route UI Showcase (publique, sans Layout) */}
                <Route path="/ui" element={<UIShowcase />} />
              </Routes>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);