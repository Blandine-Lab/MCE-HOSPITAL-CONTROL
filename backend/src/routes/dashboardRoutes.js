const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { getKpi, getBedOccupancy, getTodaysSurgeries } = require('../controllers/dashboardController');

// Toutes les routes du dashboard nécessitent une authentification
// et la permission 'view_dashboard'
router.use(authenticate);
router.use(requirePermission('view_dashboard'));

// Route principale des KPI
router.get('/kpi', getKpi);

// Occupation détaillée des lits
router.get('/beds/occupancy', getBedOccupancy);

// Interventions du jour
router.get('/surgeries/today', getTodaysSurgeries);

module.exports = router;