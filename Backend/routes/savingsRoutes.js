const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");
const authenticate = require("../middleware/authenticate");

router.post("/monthly", authenticate, savingsController.storeMonthlySavings);
router.get("/monthly", authenticate, savingsController.getMonthlySavings);
router.post("/goal", authenticate, savingsController.setSavingsGoal);
router.get("/goal", authenticate, savingsController.getSavingsGoal);
router.post("/month-end", authenticate, savingsController.storeCurrentMonthSavings);

module.exports = router; 