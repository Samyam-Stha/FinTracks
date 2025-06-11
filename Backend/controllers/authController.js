const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register Controller
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [name, email, hashedPassword]
    );

    const token = jwt.sign(
      {
        id: newUser.rows[0].id,
        name: name,
        email: email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({ token });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Login Controller
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({ token });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

const updateUser = async (req, res) => {
  const { field, value, currentPassword } = req.body;
  const { id: userId } = req.user;


  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect current password" });
    }

    if (field === "username") {
      await pool.query("UPDATE users SET name = $1 WHERE id = $2", [
        value,
        userId,
      ]);
    } else if (field === "email") {
      await pool.query("UPDATE users SET email = $1 WHERE id = $2", [
        value,
        userId,
      ]);
    } else if (field === "newPassword") {
      const newHashed = await bcrypt.hash(value, 10);
      await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
        newHashed,
        userId,
      ]);
    } else {
      return res.status(400).json({ error: "Invalid field" });
    }

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
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

module.exports = {
  register,
  login,
  updateUser,
  deleteAccount,
};
