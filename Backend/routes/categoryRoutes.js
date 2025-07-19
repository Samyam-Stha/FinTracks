const express = require("express");
const router = express.Router();
const {
  getCategories,
  addCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const authenticate = require("../middleware/authenticate");

router.get("/", authenticate, getCategories);
router.post("/", authenticate, addCategory); // ✅ apply here
router.delete("/", authenticate, deleteCategory);

module.exports = router;
