const pool = require("../db");

// GET /api/budget
exports.getBudgets = async (req, res) => {
  const { id: userId } = req.user;
  const { month } = req.query;

  try {
    const result = await pool.query(
      `
      SELECT 
        b.id, 
        c.name AS name,
        b.budget,
        COALESCE(SUM(CASE 
          WHEN to_char(t.date, 'YYYY-MM') = $2 AND t.type = 'expense' 
          THEN t.amount ELSE 0 END), 0) AS spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t 
        ON t.category = c.name AND t.user_id = b.user_id
      WHERE b.user_id = $1
      GROUP BY b.id, c.name
      `,
      [userId, month]
    );

    const data = result.rows.map((b) => {
      const percentage =
        b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
      return { ...b, percentage };
    });

    res.json(data);
  } catch (err) {
    console.error("Fetch budget error:", err);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
};

// POST /api/budget
exports.addBudget = async (req, res) => {
  const { id: userId } = req.user;
  const { categoryName, budget } = req.body;

  try {
    let categoryResult = await pool.query(
      "SELECT id FROM categories WHERE user_id = $1 AND name = $2",
      [userId, categoryName]
    );

    if (categoryResult.rowCount === 0) {
      await pool.query(
        "INSERT INTO categories (user_id, account, name) VALUES ($1, $2, $3)",
        [userId, "Default Account", categoryName]
      );

      categoryResult = await pool.query(
        "SELECT id FROM categories WHERE user_id = $1 AND name = $2",
        [userId, categoryName]
      );
    }

    const categoryId = categoryResult.rows[0].id;

    const insert = await pool.query(
      `INSERT INTO budgets (user_id, category_id, budget)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, category_id) DO UPDATE
       SET budget = EXCLUDED.budget
       RETURNING *`,
      [userId, categoryId, budget]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("Add budget error:", err);
    res.status(500).json({ error: "Failed to add/update budget" });
  }
};

// PUT /api/budget/:id
exports.updateBudget = async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { budget } = req.body;

  try {
    const result = await pool.query(
      "UPDATE budgets SET budget = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [budget, id, userId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update budget error:", err);
    res.status(500).json({ error: "Failed to update budget" });
  }
};

// DELETE /api/budget/:id
exports.deleteBudget = async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM budgets WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete budget error:", err);
    res.status(500).json({ error: "Failed to delete budget" });
  }
};

// GET /api/budget/auto-suggest
exports.autoGenerateBudgets = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const result = await pool.query(
      `
      SELECT category, ROUND(AVG(amount) * 1.1) AS suggested_budget
      FROM transactions
      WHERE user_id = $1 AND type = 'expense' AND date >= NOW() - INTERVAL '3 months'
      GROUP BY category
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Auto-budget error:", err);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
};

exports.getForecast = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const result = await pool.query(
      `
      SELECT 
        b.id,
        c.name AS category,
        b.budget,
        COALESCE(SUM(t.amount), 0) AS spent,
        DATE_PART('day', CURRENT_DATE) AS day_of_month,
        DATE_PART('days', DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day') AS total_days
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t
        ON t.category = c.name AND t.user_id = $1
        AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
        AND t.type = 'expense'
      WHERE b.user_id = $1
      GROUP BY b.id, c.name, b.budget
      `,
      [userId]
    );

    const forecasts = result.rows.map((row) => {
      const { budget, spent, day_of_month, total_days } = row;
      const avgPerDay = spent / day_of_month;
      const projected = avgPerDay * total_days;
      const willExceed = projected > budget;

      return {
        ...row,
        projected: Math.round(projected),
        willExceed,
      };
    });

    res.json(forecasts);
  } catch (err) {
    console.error("Forecast error:", err);
    res.status(500).json({ error: "Failed to forecast budgets" });
  }
};

