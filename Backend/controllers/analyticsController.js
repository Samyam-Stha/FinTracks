const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get Spending Trends Analysis
const getSpendingTrends = async (req, res) => {
  const userId = req.user.id;
  const { period = "6months" } = req.query;

  try {
    const now = new Date();
    let startDate;

    switch (period) {
      case "3months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "6months":
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case "12months":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: "expense",
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: { date: "asc" },
    });

    // Group by month and calculate trends
    const monthlyData = {};
    transactions.forEach(transaction => {
      const monthKey = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          count: 0,
          categories: {}
        };
      }
      monthlyData[monthKey].total += Number(transaction.amount);
      monthlyData[monthKey].count += 1;
      
      if (!monthlyData[monthKey].categories[transaction.category]) {
        monthlyData[monthKey].categories[transaction.category] = 0;
      }
      monthlyData[monthKey].categories[transaction.category] += Number(transaction.amount);
    });

    // Calculate trend analysis
    const trendData = Object.values(monthlyData).map((data, index, array) => {
      const previousMonth = array[index - 1];
      const change = previousMonth ? ((data.total - previousMonth.total) / previousMonth.total) * 100 : 0;
      
      return {
        ...data,
        change: Math.round(change * 100) / 100,
        trend: change > 5 ? "increasing" : change < -5 ? "decreasing" : "stable"
      };
    });

    // Calculate overall trend
    const overallTrend = trendData.length > 1 ? 
      ((trendData[trendData.length - 1].total - trendData[0].total) / trendData[0].total) * 100 : 0;

    res.json({
      trends: trendData,
      overallTrend: Math.round(overallTrend * 100) / 100,
      period
    });
  } catch (err) {
    console.error("Spending trends error:", err);
    res.status(500).json({ error: "Failed to fetch spending trends" });
  }
};

// Get Budget vs Actual Comparison
const getBudgetVsActual = async (req, res) => {
  const userId = req.user.id;
  const { period, year, month, startDate, endDate } = req.query;

  try {
    const now = new Date();
    let startDateObj, endDateObj;

    // Always fetch current month's active budget
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const currentBudgets = await prisma.budget.findMany({
      where: { userId },
    });
    const currentBudgetTotal = currentBudgets.reduce((sum, b) => sum + b.budget, 0);

    // Determine the date range based on the period parameter
    if (period === 'current') {
      // Current month
      startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
      endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'past' && year && month) {
      // Specific past month
      startDateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDateObj = new Date(parseInt(year), parseInt(month), 0);
    } else if (period === 'custom' && startDate && endDate) {
      // Custom date range
      startDateObj = new Date(startDate);
      endDateObj = new Date(endDate);
    } else if (period === 'all') {
      // All time - get from the earliest transaction
      const earliestTransaction = await prisma.transaction.findFirst({
        where: { userId },
        orderBy: { date: 'asc' }
      });
      startDateObj = earliestTransaction ? new Date(earliestTransaction.date) : new Date(now.getFullYear(), 0, 1);
      endDateObj = now;
    } else {
      // Default to current month
      startDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // For current period, use current budgets
    if (period === 'current') {
      // Get current budgets
      const budgets = await prisma.budget.findMany({
        where: { userId },
        include: { category: true }
      });

      // Get actual expenses for current period
      const expenses = await prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "expense",
          date: {
            gte: startDateObj,
            lte: endDateObj,
          },
        },
        _sum: {
          amount: true,
        },
      });

      // Combine budget and actual data
      const comparison = budgets.map(budget => {
        const actualExpense = expenses.find(exp => exp.category === budget.category.name);
        const actualAmount = actualExpense ? actualExpense._sum.amount : 0;
        const variance = budget.budget - actualAmount;
        const variancePercentage = budget.budget > 0 ? (variance / budget.budget) * 100 : 0;
        
        return {
          category: budget.category.name,
          budget: budget.budget,
          actual: actualAmount,
          variance: Math.round(variance * 100) / 100,
          variancePercentage: Math.round(variancePercentage * 100) / 100,
          status: variance >= 0 ? "under" : "over"
        };
      });

      // Add categories that have expenses but no budget
      expenses.forEach(expense => {
        const hasBudget = budgets.some(budget => budget.category.name === expense.category);
        if (!hasBudget) {
          comparison.push({
            category: expense.category,
            budget: 0,
            actual: expense._sum.amount,
            variance: -expense._sum.amount,
            variancePercentage: -100,
            status: "over"
          });
        }
      });

      const totalBudget = comparison.reduce((sum, item) => sum + item.budget, 0);
      const totalActual = comparison.reduce((sum, item) => sum + item.actual, 0);
      const totalVariance = totalBudget - totalActual;

      res.json({
        comparison,
        summary: {
          totalBudget,
          totalActual,
          totalVariance: Math.round(totalVariance * 100) / 100,
          totalVariancePercentage: totalBudget > 0 ? Math.round((totalVariance / totalBudget) * 100 * 100) / 100 : 0,
          currentBudget: currentBudgetTotal
        },
        period: {
          startDate: startDateObj.toISOString().slice(0, 10),
          endDate: endDateObj.toISOString().slice(0, 10)
        }
      });
    } else {
      // For past periods, use budget history
      const budgetHistory = await prisma.monthlyBudgetHistory.findMany({
        where: {
          userId,
          month: {
            gte: startDateObj,
            lte: endDateObj
          }
        },
        orderBy: {
          month: 'asc'
        }
      });

      // Fetch current month's budgets
      const currentBudgets = await prisma.budget.findMany({
        where: { userId },
        include: { category: true }
      });
      // Calculate spent for each current category
      const currentSpent = await prisma.transaction.groupBy({
        by: ["category"],
        where: {
          userId,
          type: "expense",
          date: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        _sum: { amount: true },
      });
      const currentCategories = currentBudgets.map(b => {
        const spentObj = currentSpent.find(s => s.category === b.category.name);
        return {
          name: b.category.name,
          budget: b.budget,
          spent: spentObj ? spentObj._sum.amount : 0
        };
      });

      // Fetch selected month's budgets from history (spent is present in MonthlyBudgetHistory)
      const selectedCategories = budgetHistory.map(record => ({
        name: record.category,
        budget: record.budget,
        spent: record.spent
      }));

      if (budgetHistory.length === 0) {
        // No budget history for this period
        res.json({
          comparison: [],
          summary: {
            totalBudget: 0,
            totalActual: 0,
            totalVariance: 0,
            totalVariancePercentage: 0,
            currentBudget: currentBudgetTotal
          },
          currentCategories,
          selectedCategories,
          period: {
            startDate: startDateObj.toISOString().slice(0, 10),
            endDate: endDateObj.toISOString().slice(0, 10)
          }
        });
        return;
      }

      // Group by category and aggregate data
      const categoryData = {};
      
      budgetHistory.forEach(record => {
        if (!categoryData[record.category]) {
          categoryData[record.category] = {
            budget: 0,
            spent: 0,
            remaining: 0
          };
        }
        categoryData[record.category].budget += record.budget;
        categoryData[record.category].spent += record.spent;
        categoryData[record.category].remaining += record.remaining;
      });

      // Convert to comparison format
      let comparison = Object.entries(categoryData).map(([category, data]) => {
        const variance = data.budget - data.spent;
        const variancePercentage = data.budget > 0 ? (variance / data.budget) * 100 : 0;
        return {
          category,
          budget: data.budget,
          actual: data.spent,
          variance: Math.round(variance * 100) / 100,
          variancePercentage: Math.round(variancePercentage * 100) / 100,
          status: variance >= 0 ? "under" : "over"
        };
      });

      // Filter out categories where both budget and actual are zero
      comparison = comparison.filter(item => !(item.budget === 0 && item.actual === 0));

      // If all categories are filtered out, treat as no budgets set for this period
      if (comparison.length === 0) {
        res.json({
          comparison: [],
          summary: {
            totalBudget: 0,
            totalActual: 0,
            totalVariance: 0,
            totalVariancePercentage: 0,
            currentBudget: currentBudgetTotal
          },
          currentCategories,
          selectedCategories: [],
          period: {
            startDate: startDateObj.toISOString().slice(0, 10),
            endDate: endDateObj.toISOString().slice(0, 10)
          }
        });
        return;
      }

      const totalBudget = comparison.reduce((sum, item) => sum + item.budget, 0);
      const totalActual = comparison.reduce((sum, item) => sum + item.actual, 0);
      const totalVariance = totalBudget - totalActual;

      res.json({
        comparison,
        summary: {
          totalBudget,
          totalActual,
          totalVariance: Math.round(totalVariance * 100) / 100,
          totalVariancePercentage: totalBudget > 0 ? Math.round((totalVariance / totalBudget) * 100 * 100) / 100 : 0,
          currentBudget: currentBudgetTotal
        },
        currentCategories,
        selectedCategories,
        period: {
          startDate: startDateObj.toISOString().slice(0, 10),
          endDate: endDateObj.toISOString().slice(0, 10)
        }
      });
    }
  } catch (err) {
    console.error("Budget vs actual error:", err);
    res.status(500).json({ error: "Failed to fetch budget comparison" });
  }
};

// Get Seasonal Spending Analysis
const getSeasonalAnalysis = async (req, res) => {
  const userId = req.user.id;
  const { years = 2 } = req.query;

  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear() - parseInt(years), 0, 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: "expense",
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: { date: "asc" },
    });

    // Group by month across years
    const monthlyAverages = {};
    const monthlyData = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.getMonth();
      const year = date.getFullYear();

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      if (!monthlyData[monthKey][year]) {
        monthlyData[monthKey][year] = 0;
      }
      monthlyData[monthKey][year] += Number(transaction.amount);
    });

    // Calculate averages for each month
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];

    monthNames.forEach((monthName, monthIndex) => {
      const yearData = monthlyData[monthIndex] || {};
      const years = Object.keys(yearData);
      
      if (years.length > 0) {
        const total = years.reduce((sum, year) => sum + yearData[year], 0);
        const average = total / years.length;
        
        monthlyAverages[monthName] = {
          average: Math.round(average * 100) / 100,
          years: years.length,
          trend: years.length > 1 ? 
            (yearData[years[years.length - 1]] > yearData[years[0]] ? "increasing" : "decreasing") : "stable"
        };
      }
    });

    // Find seasonal patterns
    const sortedMonths = Object.entries(monthlyAverages)
      .sort((a, b) => b[1].average - a[1].average);

    const seasonalPatterns = {
      highestSpendingMonth: sortedMonths[0] ? sortedMonths[0][0] : null,
      lowestSpendingMonth: sortedMonths[sortedMonths.length - 1] ? sortedMonths[sortedMonths.length - 1][0] : null,
      averageMonthlySpending: Math.round(Object.values(monthlyAverages).reduce((sum, data) => sum + data.average, 0) / Object.keys(monthlyAverages).length * 100) / 100
    };

    res.json({
      monthlyAverages,
      seasonalPatterns,
      period: `${years} years`
    });
  } catch (err) {
    console.error("Seasonal analysis error:", err);
    res.status(500).json({ error: "Failed to fetch seasonal analysis" });
  }
};

// Get Category Spending Alerts
const getCategoryAlerts = async (req, res) => {
  const userId = req.user.id;

  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month expenses
    const currentMonthExpenses = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "expense",
        date: {
          gte: currentMonthStart,
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get previous month expenses
    const previousMonthExpenses = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "expense",
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });

    const alerts = [];

    // Check for budget overruns
    currentMonthExpenses.forEach(expense => {
      const budget = budgets.find(b => b.category.name === expense.category);
      if (budget && expense._sum.amount > budget.budget) {
        const overrun = expense._sum.amount - budget.budget;
        const overrunPercentage = (overrun / budget.budget) * 100;
        
        alerts.push({
          type: "budget_overrun",
          category: expense.category,
          severity: overrunPercentage > 50 ? "high" : overrunPercentage > 25 ? "medium" : "low",
          message: `Budget overrun by ${Math.round(overrunPercentage * 100) / 100}%`,
          details: {
            budget: budget.budget,
            spent: expense._sum.amount,
            overrun: Math.round(overrun * 100) / 100
          }
        });
      }
    });

    // Check for unusual spending increases
    currentMonthExpenses.forEach(current => {
      const previous = previousMonthExpenses.find(p => p.category === current.category);
      if (previous && previous._sum.amount > 0) {
        const increase = ((current._sum.amount - previous._sum.amount) / previous._sum.amount) * 100;
        
        if (increase > 50) {
          alerts.push({
            type: "spending_increase",
            category: current.category,
            severity: increase > 100 ? "high" : "medium",
            message: `Spending increased by ${Math.round(increase * 100) / 100}% from last month`,
            details: {
              previous: previous._sum.amount,
              current: current._sum.amount,
              increase: Math.round(increase * 100) / 100
            }
          });
        }
      }
    });

    // Check for categories with no budget
    currentMonthExpenses.forEach(expense => {
      const hasBudget = budgets.some(b => b.category.name === expense.category);
      if (!hasBudget && expense._sum.amount > 1000) { // Alert if spending > 1000 without budget
        alerts.push({
          type: "no_budget",
          category: expense.category,
          severity: "medium",
          message: "High spending category without budget",
          details: {
            spent: expense._sum.amount
          }
        });
      }
    });

    res.json({
      alerts,
      summary: {
        totalAlerts: alerts.length,
        highPriority: alerts.filter(a => a.severity === "high").length,
        mediumPriority: alerts.filter(a => a.severity === "medium").length,
        lowPriority: alerts.filter(a => a.severity === "low").length
      }
    });
  } catch (err) {
    console.error("Category alerts error:", err);
    res.status(500).json({ error: "Failed to fetch category alerts" });
  }
};

// Get Financial Health Score
const getFinancialHealthScore = async (req, res) => {
  const userId = req.user.id;

  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Get transactions for current month and last 6 months
    const [currentMonthTransactions, sixMonthTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: currentMonthStart,
            lte: now,
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: sixMonthsAgo,
            lte: now,
          },
        },
      })
    ]);

    // Get budgets
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });

    // Calculate metrics
    const currentIncome = currentMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentExpenses = currentMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const sixMonthIncome = sixMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const sixMonthExpenses = sixMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate scores (0-100 scale)
    let totalScore = 0;
    const metrics = {};

    // 1. Savings Rate (25 points)
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
    const savingsScore = Math.min(25, Math.max(0, savingsRate * 0.25));
    metrics.savingsRate = { value: Math.round(savingsRate * 100) / 100, score: savingsScore };
    totalScore += savingsScore;

    // 2. Budget Adherence (20 points)
    let budgetScore = 0;
    let budgetCategories = 0;
    currentMonthTransactions
      .filter(t => t.type === "expense")
      .forEach(transaction => {
        const budget = budgets.find(b => b.category.name === transaction.category);
        if (budget) {
          budgetCategories++;
          const categoryExpenses = currentMonthTransactions
            .filter(t => t.type === "expense" && t.category === transaction.category)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          if (categoryExpenses <= budget.budget) {
            budgetScore += 20 / budgets.length;
          }
        }
      });
    metrics.budgetAdherence = { 
      value: budgetCategories > 0 ? Math.round((budgetScore / 20) * 100 * 100) / 100 : 0, 
      score: budgetScore 
    };
    totalScore += budgetScore;

    // 3. Expense Consistency (15 points)
    const monthlyAverages = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthExpenses = sixMonthTransactions
        .filter(t => t.type === "expense" && t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      monthlyAverages.push(monthExpenses);
    }
    
    const avgExpense = monthlyAverages.reduce((sum, val) => sum + val, 0) / monthlyAverages.length;
    const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - avgExpense, 2), 0) / monthlyAverages.length;
    const consistencyScore = Math.max(0, 15 - (Math.sqrt(variance) / avgExpense) * 15);
    metrics.expenseConsistency = { 
      value: avgExpense > 0 ? Math.round((1 - Math.sqrt(variance) / avgExpense) * 100 * 100) / 100 : 0, 
      score: consistencyScore 
    };
    totalScore += consistencyScore;

    // 4. Income Stability (15 points)
    const monthlyIncomes = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthIncome = sixMonthTransactions
        .filter(t => t.type === "income" && t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      monthlyIncomes.push(monthIncome);
    }
    
    const avgIncome = monthlyIncomes.reduce((sum, val) => sum + val, 0) / monthlyIncomes.length;
    const incomeVariance = monthlyIncomes.reduce((sum, val) => sum + Math.pow(val - avgIncome, 2), 0) / monthlyIncomes.length;
    const incomeStabilityScore = Math.max(0, 15 - (Math.sqrt(incomeVariance) / avgIncome) * 15);
    metrics.incomeStability = { 
      value: avgIncome > 0 ? Math.round((1 - Math.sqrt(incomeVariance) / avgIncome) * 100 * 100) / 100 : 0, 
      score: incomeStabilityScore 
    };
    totalScore += incomeStabilityScore;

    // 5. Emergency Fund (15 points)
    const emergencyFundScore = Math.min(15, (currentIncome - currentExpenses) / 1000 * 15);
    metrics.emergencyFund = { 
      value: Math.round((currentIncome - currentExpenses) * 100) / 100, 
      score: emergencyFundScore 
    };
    totalScore += emergencyFundScore;

    // 6. Debt Management (10 points)
    // Assuming no debt for now - can be enhanced with debt tracking
    const debtScore = 10;
    metrics.debtManagement = { value: 100, score: debtScore };
    totalScore += debtScore;

    // Determine health level
    let healthLevel = "Poor";
    let healthColor = "red";
    if (totalScore >= 80) {
      healthLevel = "Excellent";
      healthColor = "green";
    } else if (totalScore >= 60) {
      healthLevel = "Good";
      healthColor = "blue";
    } else if (totalScore >= 40) {
      healthLevel = "Fair";
      healthColor = "yellow";
    } else if (totalScore >= 20) {
      healthLevel = "Poor";
      healthColor = "orange";
    }

    res.json({
      score: Math.round(totalScore * 100) / 100,
      healthLevel,
      healthColor,
      metrics,
      recommendations: generateRecommendations(metrics, totalScore)
    });
  } catch (err) {
    console.error("Financial health score error:", err);
    res.status(500).json({ error: "Failed to calculate financial health score" });
  }
};

// Helper function to generate recommendations
const generateRecommendations = (metrics, totalScore) => {
  const recommendations = [];

  if (metrics.savingsRate.value < 20) {
    recommendations.push("Increase your savings rate to at least 20% of your income");
  }

  if (metrics.budgetAdherence.value < 80) {
    recommendations.push("Stick to your budget more closely to improve financial discipline");
  }

  if (metrics.expenseConsistency.value < 70) {
    recommendations.push("Try to maintain more consistent monthly expenses");
  }

  if (metrics.incomeStability.value < 70) {
    recommendations.push("Consider ways to stabilize your income sources");
  }

  if (metrics.emergencyFund.value < 3000) {
    recommendations.push("Build an emergency fund of at least 3 months of expenses");
  }

  if (totalScore < 40) {
    recommendations.push("Consider consulting with a financial advisor");
  }

  return recommendations;
};

module.exports = {
  getSpendingTrends,
  getBudgetVsActual,
  getSeasonalAnalysis,
  getCategoryAlerts,
  getFinancialHealthScore,
}; 