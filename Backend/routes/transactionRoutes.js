const express = require("express");
const router = express.Router(); // ✅ This is correct

const authenticate = require("../middleware/authenticate");
const {
  getSummaryByInterval,
  addTransaction,
  getRecentTransactions,
  getFilteredTransactions,
  getMonthlySummary,
  getCategoryExpenses,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

router.post("/", authenticate, addTransaction);
router.get("/", authenticate, getRecentTransactions);
// router.get("/summary", authenticate, getMonthlySummary);
router.get("/expenses/by-category", authenticate, getCategoryExpenses);
router.get("/summary", authenticate, getSummaryByInterval);
router.get("/filter", authenticate, getFilteredTransactions);
router.put("/:id", authenticate, updateTransaction);
router.delete("/:id", authenticate, deleteTransaction);

module.exports = router;
