// controllers/transactionController.js
const pool = require("../db");

exports.addTransaction = async (req, res) => {
  const { id: userId } = req.user;
  const { date, description, amount, type, category, account } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, date, description, amount, type, category, account)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, date, description, amount, type, category, account]
    );
    
    // Emit transaction added event
    const io = req.app.get("io");
    io.emit("transaction:added", { userId, transaction: result.rows[0] });
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add transaction error:", err.message);
    res.status(500).json({ error: "Transaction failed" });
  }
};

exports.getRecentTransactions = async (req, res) => {
  const { id: userId } = req.user;
  try {
    const result = await pool.query(
      `SELECT *
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
       ORDER BY date DESC
       LIMIT 10`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch recent transactions error:", err.message);
    res.status(500).json({ error: "Could not fetch transactions" });
  }
};

exports.getFilteredTransactions = async (req, res) => {
  const { id: userId } = req.user;
  const { type, category, account, startDate, endDate } = req.query;

  let query = `SELECT * FROM transactions WHERE user_id = $1`;
  const values = [userId];
  let i = 2;

  if (type && type !== "all") {
    query += ` AND type = $${i++}`;
    values.push(type);
  }
  if (category && category !== "all") {
    query += ` AND category = $${i++}`;
    values.push(category);
  }
  if (account && account !== "all") {
    query += ` AND account = $${i++}`;
    values.push(account);
  }
  if (startDate) {
    query += ` AND date >= $${i++}`;
    values.push(startDate);
  }
  if (endDate) {
    query += ` AND date <= $${i++}`;
    values.push(endDate);
  }

  query += ` ORDER BY date DESC`;

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Filtered transaction fetch error:", err.message);
    res.status(500).json({ error: "Could not fetch filtered transactions" });
  }
};

exports.getMonthlySummary = async (req, res) => {
  const { id: userId } = req.user;
  try {
    const result = await pool.query(
      `SELECT
         m.month,
         COALESCE(SUM(t.income), 0) AS income,
         COALESCE(SUM(t.expense), 0) AS expense
       FROM (SELECT generate_series(1, 12) AS month) m
       LEFT JOIN (
         SELECT
           EXTRACT(MONTH FROM date) AS month,
           CASE WHEN type = 'income' THEN amount ELSE 0 END AS income,
           CASE WHEN type = 'expense' THEN amount ELSE 0 END AS expense
         FROM transactions
         WHERE user_id = $1
           AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
       ) t ON m.month = t.month
       GROUP BY m.month
       ORDER BY m.month`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Summary fetch error:", err.message);
    res.status(500).json({ error: "Summary fetch failed" });
  }
};

exports.getCategoryExpenses = async (req, res) => {
  const { id: userId } = req.user;
  try {
    const result = await pool.query(
      `SELECT category, SUM(amount) AS total
       FROM transactions
       WHERE user_id = $1 AND type = 'expense'
         AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
       GROUP BY category
       ORDER BY total DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Category expenses fetch error:", err.message);
    res.status(500).json({ error: "Could not fetch category-wise expenses" });
  }
};

// GET /api/transactions/summary?interval=monthly|daily|weekly|yearly
exports.getSummaryByInterval = async (req, res) => {
  const { id: userId } = req.user;
  const { interval = "monthly" } = req.query;

  let query = "";
  let values = [userId];

  switch (interval) {
    case "daily":
      query = `
        SELECT
          to_char(d, 'YYYY-MM-DD') AS label,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
        LEFT JOIN transactions t
          ON t.user_id = $1 AND DATE(t.date) = d
        GROUP BY d
        ORDER BY d;
      `;
      break;

    case "weekly":
      query = `
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks',
            date_trunc('week', CURRENT_DATE),
            INTERVAL '1 week'
          ) AS week_start
        )
        SELECT
          to_char(week_start, 'IYYY-IW') AS label,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense
        FROM weeks
        LEFT JOIN transactions t
          ON t.user_id = $1
          AND date_trunc('week', t.date) = week_start
        GROUP BY week_start
        ORDER BY week_start;
      `;
      break;

    case "monthly":
      query = `
        WITH months AS (
          SELECT generate_series(
            date_trunc('year', CURRENT_DATE),
            date_trunc('year', CURRENT_DATE) + INTERVAL '11 months',
            INTERVAL '1 month'
          ) AS month_start
        )
        SELECT
          to_char(month_start, 'YYYY-MM') AS label,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense
        FROM months
        LEFT JOIN transactions t
          ON t.user_id = $1
          AND date_trunc('month', t.date) = month_start
        GROUP BY month_start
        ORDER BY month_start;
      `;
      break;

    case "yearly":
      query = `
        WITH years AS (
          SELECT generate_series(
            date_trunc('year', CURRENT_DATE) - INTERVAL '3 years',
            date_trunc('year', CURRENT_DATE),
            INTERVAL '1 year'
          ) AS year_start
        )
        SELECT
          to_char(year_start, 'YYYY') AS label,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expense
        FROM years
        LEFT JOIN transactions t
          ON t.user_id = $1
          AND date_trunc('year', t.date) = year_start
        GROUP BY year_start
        ORDER BY year_start;
      `;
      break;

    case "all":
      query = `
        SELECT
          'All Time' AS label,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
        FROM transactions
        WHERE user_id = $1
      `;
      break;

    default:
      query = `
        SELECT
          to_char(date, 'YYYY-MM') AS label,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense
        FROM transactions
        WHERE user_id = $1
          AND date >= date_trunc('month', CURRENT_DATE)
          AND date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY label
        ORDER BY label;
      `;
      break;
  }

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("Summary fetch error:", err.message);
    res.status(500).json({ error: "Failed to get summary" });
  }
};

exports.updateTransaction = async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { date, description, amount, type, category, account } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE transactions 
       SET date = $1, description = $2, amount = $3, type = $4, category = $5, account = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [date, description, amount, type, category, account, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Emit transaction updated event
    const io = req.app.get("io");
    io.emit("transaction:updated", { userId, transaction: result.rows[0] });
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update transaction error:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
};

exports.deleteTransaction = async (req, res) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      `DELETE FROM transactions 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Emit transaction deleted event
    const io = req.app.get("io");
    io.emit("transaction:deleted", { userId, transactionId: id });
    
    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Delete transaction error:", err.message);
    res.status(500).json({ error: "Delete failed" });
  }
};
