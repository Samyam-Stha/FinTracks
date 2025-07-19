const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper function to store monthly savings
const storeMonthlySavings = async (userId, month, amount, goal = 0, status = "missed") => {
  try {
    await prisma.monthlySavings.upsert({
      where: {
        userId_month: {
          userId,
          month: new Date(month)
        }
      },
      update: {
        savedAmount: parseFloat(amount),
        savingGoal: parseFloat(goal),
        status: status
      },
      create: {
        userId,
        month: new Date(month),
        savedAmount: parseFloat(amount),
        savingGoal: parseFloat(goal),
        status: status
      }
    });
  } catch (err) {
    console.error("Failed to store monthly savings:", err);
  }
};

// Helper function to store monthly budget history
const storeMonthlyBudgetHistory = async (userId, month, budgetData) => {
  try {
    // Always use the first day of the month at midnight UTC for the 'month' field
    const firstDayOfMonth = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0));
    await Promise.all(
      budgetData.filter(budget => budget.budget > 0).map(async (budget) => {
        await prisma.monthlyBudgetHistory.upsert({
          where: {
            userId_month_category: {
              userId,
              month: firstDayOfMonth,
              category: budget.name
            }
          },
          update: {
            budget: budget.budget,
            spent: budget.spent,
            remaining: Math.max(budget.budget - budget.spent, 0)
          },
          create: {
            userId,
            month: firstDayOfMonth,
            category: budget.name,
            budget: budget.budget,
            spent: budget.spent,
            remaining: Math.max(budget.budget - budget.spent, 0)
          }
        });
      })
    );
  } catch (err) {
    console.error("Failed to store monthly budget history:", err);
  }
};

// Helper function to reset budgets for new month
const resetBudgetsForNewMonth = async (userId) => {
  try {
    // Get all current budgets
    const currentBudgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });

    // Reset all budgets to 0
    await Promise.all(
      currentBudgets.map(async (budget) => {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { budget: 0 }
        });
      })
    );

    console.log(`Budgets reset for user ${userId} for new month`);
  } catch (err) {
    console.error("Failed to reset budgets:", err);
  }
};

// GET /api/budget
exports.getBudgets = async (req, res) => {
  const { id: userId } = req.user;
  const { month } = req.query;

  try {
    // Get all categories first
    const allCategories = await prisma.category.findMany({
      where: { userId },
    });

    // Get all budgets
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        category: true,
      },
    });

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    // Create a map of existing budgets
    const budgetMap = new Map(
      budgets.map((b) => [b.category.name, { budget: b.budget, id: b.id }])
    );

    // Get total income for the month
    const incomeRes = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "income",
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    const totalIncome = incomeRes._sum.amount || 0;

    // Get total expenses for the month
    const expensesRes = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "expense",
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    const totalExpenses = expensesRes._sum.amount || 0;

    // Calculate current balance
    const currentBalance = totalIncome - totalExpenses;

    // Check if it's the end of the month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const isEndOfMonth = now.getDate() === lastDayOfMonth.getDate();

    // Process all categories
    const result = await Promise.all(
      allCategories.map(async (category) => {
        const budgetInfo = budgetMap.get(category.name);
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            category: category.name,
            type: "expense",
            date: { gte: start, lt: end },
          },
          _sum: { amount: true },
        });

        const totalSpent = spent._sum.amount || 0;
        let budget = budgetInfo ? budgetInfo.budget : 0;
        let percentage = 0;

        // Special handling for savings
        if (category.name === "Saving Goal") {
          // Keep the original savings goal fixed
          const savingsGoal = budget;
          
          // Calculate savings progress based on current balance
          // Progress starts at 100% and decreases as balance decreases
          const actualSaved = Math.min(currentBalance, savingsGoal);
          // Invert the percentage calculation (100 - percentage)
          percentage = savingsGoal > 0 ? Math.max(0, 100 - Math.round(((savingsGoal - actualSaved) / savingsGoal) * 100)) : 0;
        } else {
          percentage = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;
        }

        return {
          id: budgetInfo ? budgetInfo.id : null,
          name: category.name,
          budget: budget,
          spent: category.name === "Saving Goal" ? Math.min(currentBalance, budget) : totalSpent,
          percentage,
          hasBudget: !!budgetInfo,
          totalIncome,
          totalExpenses,
          currentBalance,
        };
      })
    );

    // If it's the end of the month, store budget history and reset budgets
    if (isEndOfMonth) {
      // Store budget history for the current month
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      await storeMonthlyBudgetHistory(userId, currentMonth, result);
      
      // Store savings if there's a savings goal
      const savingsBudget = result.find(b => b.name === "Saving Goal");
      if (savingsBudget) {
        // Get the goal for the month
        const goalRes = await prisma.savingsGoal.findUnique({
          where: {
            userId_month: {
              userId,
              month: currentMonth
            }
          }
        });
        const goal = goalRes ? goalRes.initialGoal : 0;
        let status = "missed";
        if (currentBalance >= goal && goal > 0) status = "achieved";
        else if (currentBalance > 0 && currentBalance < goal) status = "partial";
        await storeMonthlySavings(userId, currentMonth, currentBalance, goal, status);
      }

      // Reset budgets for the new month (only if it's actually the last day of the month)
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (now.getDate() === lastDayOfMonth.getDate()) {
        await resetBudgetsForNewMonth(userId);
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Fetch budget error:", err);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
};

// POST /api/budget
exports.addBudget = async (req, res) => {
  const { id: userId } = req.user;
  const { categoryName, budget, month } = req.body;

  console.log("addBudget called with:", { categoryName, budget, month, userId });

  try {
    let category = await prisma.category.findFirst({
      where: { userId, name: categoryName },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { userId, name: categoryName, account: "Default Account" },
      });
      console.log("Created new category:", category);
    } else {
      console.log("Found existing category:", category);
    }

    // If month is provided, this is for auto budgeting - create/update budget for that specific month
    if (month) {
      console.log("Processing auto budget for month:", month);
      const [year, monthNum] = month.split("-");
      const targetMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      
      // For auto budgeting, we'll store the budget in the monthly budget history
      // and also update the current budget if it's for the current month
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === parseInt(year) && now.getMonth() === parseInt(monthNum) - 1;
      
      console.log("Is current month:", isCurrentMonth, "Target month:", targetMonth, "Current date:", now);
      
      if (isCurrentMonth) {
        // Update current budget
        console.log("Updating current budget for category:", categoryName);
        const newBudget = await prisma.budget.upsert({
          where: {
            userId_categoryId: { userId, categoryId: category.id },
          },
          update: { budget: parseFloat(budget) },
          create: {
            userId,
            categoryId: category.id,
            budget: parseFloat(budget),
          },
        });
        console.log("Updated current budget:", newBudget);
        res.status(201).json(newBudget);
      } else {
        // Store in monthly budget history for future months
        console.log("Storing budget in monthly history for future month");
        await prisma.monthlyBudgetHistory.upsert({
          where: {
            userId_month_category: {
              userId,
              month: targetMonth,
              category: categoryName
            }
          },
          update: {
            budget: parseFloat(budget),
            spent: 0,
            remaining: parseFloat(budget)
          },
          create: {
            userId,
            month: targetMonth,
            category: categoryName,
            budget: parseFloat(budget),
            spent: 0,
            remaining: parseFloat(budget)
          }
        });
        console.log("Stored budget in monthly history");
        res.status(201).json({ success: true, message: "Budget stored for future month" });
      }
    } else {
      // Regular budget creation/update
      console.log("Processing regular budget creation/update");
      const newBudget = await prisma.budget.upsert({
        where: {
          userId_categoryId: { userId, categoryId: category.id },
        },
        update: { budget: parseFloat(budget) },
        create: {
          userId,
          categoryId: category.id,
          budget: parseFloat(budget),
        },
      });

      console.log("Created/updated regular budget:", newBudget);
      res.status(201).json(newBudget);
    }
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
    const updated = await prisma.budget.updateMany({
      where: { id: Number(id), userId },
      data: { budget: parseFloat(budget) },
    });

    if (updated.count === 0)
      return res.status(404).json({ error: "Budget not found" });

    res.json({ success: true });
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
    await prisma.budget.deleteMany({
      where: { id: Number(id), userId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete budget error:", err);
    res.status(500).json({ error: "Failed to delete budget" });
  }
};

// GET /api/budget/forecast
exports.getForecast = async (req, res) => {
  const { id: userId } = req.user;

  try {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true },
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const today = new Date();

    const totalDays = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();
    const dayOfMonth = today.getDate();

    const forecasts = await Promise.all(
      budgets.map(async (b) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            category: b.category.name,
            type: "expense",
            date: {
              gte: startOfMonth,
              lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
            },
          },
          _sum: { amount: true },
        });

        const totalSpent = spent._sum.amount || 0;
        const avgPerDay = totalSpent / dayOfMonth;
        const projected = avgPerDay * totalDays;
        const willExceed = projected > b.budget;

        return {
          id: b.id,
          category: b.category.name,
          budget: b.budget,
          spent: totalSpent,
          projected: Math.round(projected),
          willExceed,
        };
      })
    );

    res.json(forecasts);
  } catch (err) {
    console.error("Forecast error:", err);
    res.status(500).json({ error: "Failed to forecast budgets" });
  }
};

// GET /api/budget/history
exports.getBudgetHistory = async (req, res) => {
  const { id: userId } = req.user;
  const { month } = req.query;

  try {
    let targetMonth;
    if (month) {
      const [year, monthNum] = month.split("-");
      targetMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
    } else {
      const now = new Date();
      targetMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    // Get budget history for the selected month (range, not exact date)
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const budgetHistory = await prisma.monthlyBudgetHistory.findMany({
      where: {
        userId,
        month: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: {
        category: 'asc'
      }
    });

    // Get total income and expenses for the month
    const startDate = targetMonth;
    const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const [incomeRes, expensesRes] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "income",
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "expense",
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      })
    ]);

    const totalIncome = incomeRes._sum.amount || 0;
    const totalExpenses = expensesRes._sum.amount || 0;
    const currentBalance = totalIncome - totalExpenses;

    // Format the response
    const formattedHistory = budgetHistory.map(item => ({
      category: item.category,
      budget: item.budget,
      spent: item.spent,
      remaining: item.remaining,
      percentage: item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0,
      status: item.spent > item.budget ? 'over' : 'under'
    }));

    res.json({
      month: month || targetMonth.toISOString().slice(0, 7),
      totalIncome,
      totalExpenses,
      currentBalance,
      budgets: formattedHistory
    });
  } catch (err) {
    console.error("Budget history error:", err);
    res.status(500).json({ error: "Failed to fetch budget history" });
  }
};

// POST /api/budget/reset (for testing purposes)
exports.manualReset = async (req, res) => {
  const { id: userId } = req.user;
  const { month } = req.body;

  try {
    let startOfMonth, endOfMonth;
    if (month) {
      const [year, monthNum] = month.split("-");
      startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Get all categories and budgets
    const allCategories = await prisma.category.findMany({
      where: { userId },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        category: true,
      },
    });

    // Get total income and expenses
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

    // Process all categories to get current data
    const result = await Promise.all(
      allCategories.map(async (category) => {
        const budgetInfo = budgets.find(b => b.category.name === category.name);
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            category: category.name,
            type: "expense",
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        });

        const totalSpent = spent._sum.amount || 0;
        const budget = budgetInfo ? budgetInfo.budget : 0;

        return {
          id: budgetInfo ? budgetInfo.id : null,
          name: category.name,
          budget: budget,
          spent: category.name === "Saving Goal" ? Math.min(currentBalance, budget) : totalSpent,
          hasBudget: !!budgetInfo,
        };
      })
    );

    // Store budget history
    await storeMonthlyBudgetHistory(userId, startOfMonth, result);
    
    // Store savings if there's a savings goal
    const savingsBudget = result.find(b => b.name === "Saving Goal");
    if (savingsBudget) {
      // Get the goal for the month
      const goalRes = await prisma.savingsGoal.findUnique({
        where: {
          userId_month: {
            userId,
            month: startOfMonth
          }
        }
      });
      const goal = goalRes ? goalRes.initialGoal : 0;
      let status = "missed";
      if (currentBalance >= goal && goal > 0) status = "achieved";
      else if (currentBalance > 0 && currentBalance < goal) status = "partial";
      await storeMonthlySavings(userId, startOfMonth, currentBalance, goal, status);
    }

    // Reset budgets
    await resetBudgetsForNewMonth(userId);

    res.json({ 
      success: true, 
      message: "Budgets have been reset and history saved",
      month: startOfMonth.toISOString().slice(0, 7)
    });
  } catch (err) {
    console.error("Manual reset error:", err);
    res.status(500).json({ error: "Failed to reset budgets" });
  }
};
