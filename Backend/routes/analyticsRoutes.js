const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  getSpendingTrends,
  getBudgetVsActual,
  getSeasonalAnalysis,
  getCategoryAlerts,
  getFinancialHealthScore,
} = require("../controllers/analyticsController");

// All routes require authentication
router.use(authenticate);

// Get spending trends analysis
router.get("/trends", getSpendingTrends);

// Get budget vs actual comparison
router.get("/budget-vs-actual", getBudgetVsActual);

// Get seasonal spending analysis
router.get("/seasonal", getSeasonalAnalysis);

// Get category spending alerts
router.get("/alerts", getCategoryAlerts);

// Get financial health score
router.get("/health-score", getFinancialHealthScore);

module.exports = router; 