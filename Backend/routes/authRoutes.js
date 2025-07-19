const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate"); // your JWT middleware

// Register and Login
router.post("/register", authController.register);
router.post("/login", authController.login);

// Email verification
router.post("/verify", authController.verify);
router.post("/resend", authController.resendCode);

// ✅ Add these new routes:
router.put("/update", authenticate, authController.updateUser);
router.delete("/delete", authenticate, authController.deleteAccount);

// Password reset
router.post("/request-reset", authController.requestPasswordReset);
router.post("/verify-reset", authController.verifyPasswordReset);

module.exports = router;
