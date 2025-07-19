const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const savingsController = require("./savingsController");

// Add Transaction
const addTransaction = async (req, res) => {
  const { id: userId } = req.user;
  const { date, description, amount, type, category, account } = req.body;

  try {
    // Check if this is an expense and if it exceeds the current balance
    if (type === "expense") {
      // Calculate total income and expenses for the current month
      const now = new Date(date || Date.now());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [incomeRes, expensesRes] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            userId,
            type: "income",
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            userId,
            type: "expense",
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        })
      ]);
      const totalIncome = incomeRes._sum.amount || 0;
      const totalExpenses = expensesRes._sum.amount || 0;
      const currentBalance = totalIncome - totalExpenses;
      if (parseFloat(amount) > currentBalance) {
        return res.status(400).json({ error: "Expense cannot be more than total balance." });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        date: new Date(date),
        description,
        amount: parseFloat(amount),
        type,
        category,
        account,
      },
    });

    // Update savings goal if this is an expense
    if (type === "expense") {
      await savingsController.updateSavingsGoalOnExpense(userId, parseFloat(amount));
    }

    req.app.get("io").emit("transaction:added", { userId, transaction });
    res.status(201).json(transaction);
  } catch (err) {
    console.error("Add transaction error:", err.message);
    res.status(500).json({ error: "Transaction failed" });
  }
};

// Get Recent Transactions
const getRecentTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: firstDay,
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    res.json(transactions);
  } catch (err) {
    console.error("Fetch recent transactions error:", err.message);
    res.status(500).json({ error: "Could not fetch transactions" });
  }
};

// Get Filtered Transactions
const getFilteredTransactions = async (req, res) => {
  const userId = req.user.id;
  const { type, category, account, startDate, endDate } = req.query;

  const filters = {
    userId,
    ...(type && type !== "all" && { type }),
    ...(category && category !== "all" && { category }),
    ...(account && account !== "all" && { account }),
    ...(startDate && { date: { gte: new Date(startDate) } }),
    ...(endDate && {
      date: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        lte: new Date(endDate),
      },
    }),
  };

  try {
    const transactions = await prisma.transaction.findMany({
      where: filters,
      orderBy: { date: "desc" },
    });

    res.json(transactions);
  } catch (err) {
    console.error("Filtered transaction fetch error:", err.message);
    res.status(500).json({ error: "Could not fetch filtered transactions" });
  }
};

// Get Category Expenses
const getCategoryExpenses = async (req, res) => {
  const userId = req.user.id;
  const { interval = "monthly" } = req.query;

  let startDate, endDate;
  const now = new Date();

  switch (interval) {
    case "daily":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "weekly": {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "yearly":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  try {
    const results = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "expense",
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
    });

    const formatted = results.map((r) => ({
      category: r.category,
      total: r._sum.amount || 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Category expenses fetch error:", err.message);
    res.status(500).json({ error: "Could not fetch category-wise expenses" });
  }
};

// Update Transaction
const updateTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { date, description, amount, type, category, account } = req.body;

  try {
    const updated = await prisma.transaction.updateMany({
      where: { id: parseInt(id), userId },
      data: {
        date: new Date(date),
        description,
        amount: parseFloat(amount),
        type,
        category,
        account,
      },
    });

    if (!updated.count) return res.status(404).json({ error: "Not found" });

    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
    });

    req.app
      .get("io")
      .emit("transaction:updated", { userId, transaction: updatedTransaction });
    res.json(updatedTransaction);
  } catch (err) {
    console.error("Update transaction error:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
};

// Delete Transaction
const deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const deleted = await prisma.transaction.deleteMany({
      where: { id: parseInt(id), userId },
    });

    if (!deleted.count) return res.status(404).json({ error: "Not found" });

    req.app
      .get("io")
      .emit("transaction:deleted", { userId, transactionId: parseInt(id) });
    res.json({ message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Delete transaction error:", err.message);
    res.status(500).json({ error: "Delete failed" });
  }
};

// Get Summary By Interval
const getSummaryByInterval = async (req, res) => {
  const userId = req.user.id;
  const { interval = "monthly" } = req.query;

  console.log("getSummaryByInterval called with interval:", interval, "for user:", userId);

  try {
    const now = new Date();
    let startDate, endDate;
    let currentPeriodStart, currentPeriodEnd;

    // Set date range based on interval
    switch (interval) {
      case "daily":
        // Start of current week (Sunday)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        // End of week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        
        // Current day for summary totals
        currentPeriodStart = new Date(now);
        currentPeriodStart.setHours(0, 0, 0, 0);
        currentPeriodEnd = new Date(now);
        currentPeriodEnd.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        // End of current month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Current week for summary totals
        currentPeriodStart = new Date(now);
        currentPeriodStart.setDate(now.getDate() - now.getDay());
        currentPeriodStart.setHours(0, 0, 0, 0);
        currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setDate(currentPeriodStart.getDate() + 6);
        currentPeriodEnd.setHours(23, 59, 59, 999);
        break;

      case "monthly":
        // Start of current year
        startDate = new Date(now.getFullYear(), 0, 1);
        // End of current year
        endDate = new Date(now.getFullYear(), 11, 31);
        
        // Current month for summary totals
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;

      case "yearly":
        // Start of 4 years ago
        startDate = new Date(now.getFullYear() - 3, 0, 1);
        // End of current year
        endDate = new Date(now.getFullYear(), 11, 31);
        
        // Current year for summary totals
        currentPeriodStart = new Date(now.getFullYear(), 0, 1);
        currentPeriodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
    }

    console.log("Date range - startDate:", startDate, "endDate:", endDate);
    console.log("Current period - start:", currentPeriodStart, "end:", currentPeriodEnd);

    // Get transactions within the date range
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    console.log("Found", transactions.length, "transactions in date range");

    // Get current period transactions for summary totals
    const currentPeriodTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
    });

    console.log("Found", currentPeriodTransactions.length, "transactions in current period");

    // Initialize data structure with all periods
    const groupedData = {};

    // Initialize all periods based on interval
    if (interval === "daily") {
      // Initialize all 7 days of the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const key = date.toISOString().split("T")[0];
        groupedData[key] = {
          label: key,
          income: 0,
          expense: 0,
        };
      }
    } else if (interval === "weekly") {
      // Initialize all 4 weeks of the month
      for (let i = 1; i <= 4; i++) {
        const key = `Week ${i}`;
        groupedData[key] = {
          label: key,
          income: 0,
          expense: 0,
        };
      }
    } else if (interval === "monthly") {
      // Initialize all 12 months with year information
      const months = ["January", "February", "March", "April", "May", "June", 
                     "July", "August", "September", "October", "November", "December"];
      months.forEach(month => {
        const key = `${month}_${now.getFullYear()}`;
        groupedData[key] = {
          label: month,
          year: now.getFullYear(),
          income: 0,
          expense: 0,
        };
      });
    } else if (interval === "yearly") {
      // Initialize current year and previous 3 years
      for (let year = now.getFullYear() - 3; year <= now.getFullYear(); year++) {
        const key = year.toString();
        groupedData[key] = {
          label: key,
          income: 0,
          expense: 0,
        };
      }
    }

    console.log("Initialized grouped data:", Object.keys(groupedData));

    // Group transactions by interval
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      let key;

      switch (interval) {
        case "daily":
          key = date.toISOString().split("T")[0];
          break;

        case "weekly":
          // Calculate which week of the month this transaction belongs to
          const dayOfMonth = date.getDate();
          const weekNumber = Math.ceil(dayOfMonth / 7);
          key = `Week ${weekNumber}`;
          break;

        case "monthly":
          const monthName = date.toLocaleString('default', { month: 'long' });
          key = `${monthName}_${date.getFullYear()}`;
          break;

        case "yearly":
          key = date.getFullYear().toString();
          break;
      }

      if (groupedData[key]) {
        if (transaction.type === "income") {
          groupedData[key].income += Number(transaction.amount);
        } else {
          groupedData[key].expense += Number(transaction.amount);
        }
      }
    });

    console.log("Grouped data after processing transactions:", groupedData);

    // Convert to array and sort
    const result = Object.values(groupedData).sort((a, b) => {
      if (interval === "daily") {
        return new Date(a.label) - new Date(b.label);
      } else if (interval === "weekly") {
        return parseInt(a.label.split(" ")[1]) - parseInt(b.label.split(" ")[1]);
      } else if (interval === "monthly") {
        const months = ["January", "February", "March", "April", "May", "June", 
                       "July", "August", "September", "October", "November", "December"];
        return months.indexOf(a.label) - months.indexOf(b.label);
      } else {
        return parseInt(a.label) - parseInt(b.label);
      }
    });

    console.log("Final result:", result);

    // Calculate totals for current period only
    const totalIncome = currentPeriodTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalExpense = currentPeriodTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    console.log("Totals - income:", totalIncome, "expense:", totalExpense);

    res.json({
      data: result,
      totals: {
        income: totalIncome,
        expense: totalExpense
      }
    });
  } catch (err) {
    console.error("Summary fetch error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

module.exports = {
  addTransaction,
  getRecentTransactions,
  getFilteredTransactions,
  getCategoryExpenses,
  updateTransaction,
  deleteTransaction,
  getSummaryByInterval,
};
