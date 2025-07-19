const express = require("express");
const router = express.Router();
const budgetController = require("../controllers/budgetController");
const authenticate = require("../middleware/authenticate");

router.get("/", authenticate, budgetController.getBudgets);
router.post("/", authenticate, budgetController.addBudget);
router.put("/:id", authenticate, budgetController.updateBudget);
router.delete("/:id", authenticate, budgetController.deleteBudget);
router.get("/forecast", authenticate, budgetController.getForecast);
router.get("/history", authenticate, budgetController.getBudgetHistory);
router.post("/reset", authenticate, budgetController.manualReset);

module.exports = router;
