const express = require("express");
const router = express.Router();
const {
  getCategories,
  addCategory,
} = require("../controllers/categoryController");

const authenticate = require("../middleware/authenticate");

router.get("/", authenticate, getCategories);
router.post("/", authenticate, addCategory); // ✅ apply here

module.exports = router;
