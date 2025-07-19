const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendVerificationEmail } = require('../email');

// Register Controller (with email verification)
const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const existingPending = await prisma.pendingUser.findUnique({ where: { email } });
    if (existingPending) {
      return res.status(400).json({ error: "Verification already sent to this email. Please check your inbox." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    await prisma.pendingUser.create({
      data: { email, password: hashedPassword, code },
    });
    await sendVerificationEmail(email, code);
    return res.status(200).json({ message: "Verification code sent to email." });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Verify Controller
const verify = async (req, res) => {
  const { email, code, name } = req.body;
  try {
    const pending = await prisma.pendingUser.findUnique({ where: { email } });
    if (!pending) {
      return res.status(400).json({ error: "No pending registration for this email." });
    }
    if (pending.code !== code) {
      return res.status(400).json({ error: "Invalid verification code." });
    }
    // Create user
    const newUser = await prisma.user.create({
      data: { name, email, password: pending.password },
    });
    // Delete pending user
    await prisma.pendingUser.delete({ where: { email } });
    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    return res.status(201).json({ token });
  } catch (err) {
    console.error("Verification Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Login Controller
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({ token });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Update User
const updateUser = async (req, res) => {
  const { field, value, currentPassword } = req.body;
  const { id: userId } = req.user;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect current password" });
    }

    let updateData = {};
    if (field === "username") updateData.name = value;
    else if (field === "email") updateData.email = value;
    else if (field === "newPassword")
      updateData.password = await bcrypt.hash(value, 10);
    else return res.status(400).json({ error: "Invalid field" });

    await prisma.user.update({ where: { id: userId }, data: updateData });

    res.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete Account
const deleteAccount = async (req, res) => {
  const { id: userId } = req.user;
  const { password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

// Resend Code Controller
const resendCode = async (req, res) => {
  const { email } = req.body;
  try {
    const pending = await prisma.pendingUser.findUnique({ where: { email } });
    if (!pending) {
      return res.status(400).json({ error: "No pending registration for this email." });
    }
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.pendingUser.update({ where: { email }, data: { code: newCode } });
    await sendVerificationEmail(email, newCode);
    return res.status(200).json({ message: "Verification code resent to email." });
  } catch (err) {
    console.error("Resend Code Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Request Password Reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "No user found with this email." });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.passwordResetRequest.create({ data: { email, code } });
    await sendVerificationEmail(email, code);
    return res.status(200).json({ message: "Password reset code sent to email." });
  } catch (err) {
    console.error("Password Reset Request Error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Verify Password Reset
const verifyPasswordReset = async (req, res) => {
  const { email, code, newPassword } = req.body;
  try {
    const resetRequest = await prisma.passwordResetRequest.findFirst({ where: { email, code } });
    if (!resetRequest) {
      return res.status(400).json({ error: "Invalid or expired reset code." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
    await prisma.passwordResetRequest.deleteMany({ where: { email } });
    return res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Password Reset Verification Error:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

module.exports = {
  register,
  login,
  updateUser,
  deleteAccount,
  verify,
  resendCode,
  requestPasswordReset,
  verifyPasswordReset,
};
