const pool = require("../db");

exports.getCategories = async (req, res) => {
  const { id: userId } = req.user;
  const { account } = req.query;

  try {
    let result;

    if (account) {
      result = await pool.query(
        "SELECT name FROM categories WHERE user_id = $1 AND account = $2",
        [userId, account]
      );
    } else {
      result = await pool.query(
        "SELECT DISTINCT name FROM categories WHERE user_id = $1",
        [userId]
      );
    }

    res.json(result.rows.map((row) => row.name));
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
};

exports.addCategory = async (req, res) => {
  const { id: userId } = req.user;

  const { name, account } = req.body;

  try {
    await pool.query(
      `INSERT INTO categories (user_id, account, name)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, account, name]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Insert category error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
};
