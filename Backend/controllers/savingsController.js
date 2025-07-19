const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Set or update savings goal
exports.setSavingsGoal = async (req, res) => {
  const { id: userId } = req.user;
  const { initialGoal } = req.body;

  console.log("Setting savings goal:", { userId, initialGoal });

  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Create or update savings goal for current month
    const savingsGoal = await prisma.savingsGoal.upsert({
      where: {
        userId_month: {
          userId,
          month: startOfMonth
        }
      },
      update: {
        initialGoal: parseFloat(initialGoal),
        currentGoal: parseFloat(initialGoal) // Reset current goal to initial goal
      },
      create: {
        userId,
        month: startOfMonth,
        initialGoal: parseFloat(initialGoal),
        currentGoal: parseFloat(initialGoal)
      }
    });

    console.log("Savings goal set successfully:", savingsGoal);
    res.json(savingsGoal);
  } catch (err) {
    console.error("Set savings goal error:", err);
    res.status(500).json({ error: "Failed to set savings goal" });
  }
};

// Get current savings goal and status
exports.getSavingsGoal = async (req, res) => {
  const { id: userId } = req.user;

  console.log("Getting savings goal for user:", userId);

  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // Get savings goal for current month
    const savingsGoal = await prisma.savingsGoal.findUnique({
      where: {
        userId_month: {
          userId,
          month: startOfMonth
        }
      }
    });

    console.log("Found savings goal:", savingsGoal);

    // Get total income and expenses for the month
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

    console.log("Financial data:", { totalIncome, totalExpenses, currentBalance });

    if (!savingsGoal) {
      console.log("No savings goal found, returning default response");
      return res.json({
        hasGoal: false,
        initialGoal: 0,
        currentGoal: 0,
        currentSavings: currentBalance,
        totalIncome,
        totalExpenses,
        progress: 0,
        status: "no_goal"
      });
    }

    // Calculate progress based on current balance vs savings goal
    let progress = 0;
    let status = "below_goal";
    
    if (savingsGoal.initialGoal > 0) {
      if (currentBalance >= savingsGoal.initialGoal) {
        // If balance is greater than or equal to goal, progress is 100%
        progress = 100;
        status = "achieved";
      } else if (currentBalance > 0) {
        // If balance is positive but less than goal, calculate percentage
        progress = Math.round((currentBalance / savingsGoal.initialGoal) * 100);
        status = "in_progress";
      } else {
        // If balance is negative or zero
        progress = 0;
        status = "below_goal";
      }
    }

    const response = {
      hasGoal: true,
      initialGoal: savingsGoal.initialGoal,
      currentGoal: savingsGoal.currentGoal,
      currentSavings: currentBalance,
      totalIncome,
      totalExpenses,
      progress,
      status
    };

    console.log("Returning savings goal response:", response);
    res.json(response);
  } catch (err) {
    console.error("Get savings goal error:", err);
    res.status(500).json({ error: "Failed to get savings goal" });
  }
};

// Update savings goal when expenses occur (called from transaction controller)
exports.updateSavingsGoalOnExpense = async (userId, expenseAmount) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const savingsGoal = await prisma.savingsGoal.findUnique({
      where: {
        userId_month: {
          userId,
          month: startOfMonth
        }
      }
    });

    if (savingsGoal) {
      // Decrease the current goal by the expense amount
      const newCurrentGoal = Math.max(0, savingsGoal.currentGoal - expenseAmount);
      
      await prisma.savingsGoal.update({
        where: { id: savingsGoal.id },
        data: { currentGoal: newCurrentGoal }
      });
    }
  } catch (err) {
    console.error("Update savings goal on expense error:", err);
  }
};

// Store monthly savings
exports.storeMonthlySavings = async (req, res) => {
  const { id: userId } = req.user;
  const { month, savedAmount, savingGoal } = req.body;

  try {
    const now = new Date();
    const monthDate = new Date(month);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    let status = "pending";
    if (savedAmount >= savingGoal && savingGoal > 0) {
      status = "achieved";
    } else if (now < endOfMonth) {
      status = "in_progress";
    } else if (savedAmount < savingGoal && now >= endOfMonth) {
      status = "not_achieved";
    }

    // Create or update monthly savings
    const savings = await prisma.monthlySavings.upsert({
      where: {
        userId_month: {
          userId,
          month: monthDate
        }
      },
      update: {
        savedAmount: parseFloat(savedAmount),
        savingGoal: parseFloat(savingGoal),
        status
      },
      create: {
        userId,
        month: monthDate,
        savedAmount: parseFloat(savedAmount),
        savingGoal: parseFloat(savingGoal),
        status
      }
    });

    res.json(savings);
  } catch (err) {
    console.error("Store monthly savings error:", err);
    res.status(500).json({ error: "Failed to store monthly savings" });
  }
};

// Get monthly savings
exports.getMonthlySavings = async (req, res) => {
  const { id: userId } = req.user;
  const { year } = req.query;

  try {
    const startDate = new Date(year || new Date().getFullYear(), 0, 1);
    const endDate = new Date(year || new Date().getFullYear(), 11, 31);

    const savings = await prisma.monthlySavings.findMany({
      where: {
        userId,
        month: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        month: 'asc'
      }
    });

    res.json(savings);
  } catch (err) {
    console.error("Get monthly savings error:", err);
    res.status(500).json({ error: "Failed to fetch monthly savings" });
  }
};

// POST /api/savings/month-end
exports.storeCurrentMonthSavings = async (req, res) => {
  const { id: userId } = req.user;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate current savings for the month
    const [incomeRes, expensesRes, goalRes] = await Promise.all([
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
      }),
      prisma.savingsGoal.findUnique({
        where: {
          userId_month: {
            userId,
            month: startOfMonth
          }
        }
      })
    ]);
    const totalIncome = incomeRes._sum.amount || 0;
    const totalExpenses = expensesRes._sum.amount || 0;
    const savedAmount = totalIncome - totalExpenses;
    const savingGoal = goalRes ? goalRes.initialGoal : 0;
    
    let status = "pending";
    if (savedAmount >= savingGoal && savingGoal > 0) status = "achieved";
    else if (now < endOfMonth) status = "in_progress";
    else if (savedAmount < savingGoal && now >= endOfMonth) status = "not_achieved";

    // Store in MonthlySavings
    await prisma.monthlySavings.upsert({
      where: {
        userId_month: {
          userId,
          month: startOfMonth
        }
      },
      update: { 
        savedAmount, 
        savingGoal, 
        status 
      },
      create: { 
        userId, 
        month: startOfMonth, 
        savedAmount, 
        savingGoal, 
        status 
      }
    });

    res.json({ 
      success: true, 
      month: startOfMonth, 
      savedAmount, 
      savingGoal, 
      status 
    });
  } catch (err) {
    console.error("Store current month savings error:", err);
    res.status(500).json({ error: "Failed to store current month savings" });
  }
}; 