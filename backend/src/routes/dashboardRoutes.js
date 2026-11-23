const express = require('express');
const router = express.Router();
const { authenticate, requirePermission, requireHospital } = require('../middleware/auth');
const { getKpi, getBedOccupancy, getTodaysSurgeries } = require('../controllers/dashboardController');

// Toutes les routes du dashboard nécessitent :
// - une authentification valide
// - un tenant résolu (hospital_id dans le JWT) → 403 TENANT_MISSING sinon
// - la permission 'view_dashboard'
router.use(authenticate);
router.use(requireHospital);
router.use(requirePermission('view_dashboard'));

// Route principale des KPI
router.get('/kpi', getKpi);

// Occupation détaillée des lits
router.get('/beds/occupancy', getBedOccupancy);

// Interventions du jour
router.get('/surgeries/today', getTodaysSurgeries);

module.exports = router;