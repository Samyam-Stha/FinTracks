import React, { useState, useEffect } from "react";
import axios from "axios";
import PastBudgetHistory from '../Components/PastBudgetHistory';

const BudgetPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    categoryName: "",
    budget: "",
  });
  const [forecast, setForecast] = useState([]);
  const [showAutoBudget, setShowAutoBudget] = useState(false);
  const [autoBudgets, setAutoBudgets] = useState([]);
  const [autoBudgetLoading, setAutoBudgetLoading] = useState(false);
  const [autoBudgetIncome, setAutoBudgetIncome] = useState(0);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showResetNotification, setShowResetNotification] = useState(false);
  const [lastCheckedMonth, setLastCheckedMonth] = useState("");
  const [autoBudgetMonth, setAutoBudgetMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });
  const [autoBudgetExists, setAutoBudgetExists] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
    fetchForecast();
    checkMonthlyReset();
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      window.history.go(1);
    };
    return () => {
      window.onpopstate = null;
    };
  }, []);

  const checkMonthlyReset = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const storedMonth = localStorage.getItem("lastBudgetMonth");
    
    if (storedMonth && storedMonth !== currentMonth) {
      // Month has changed, show reset notification
      setShowResetNotification(true);
      localStorage.setItem("lastBudgetMonth", currentMonth);
    } else if (!storedMonth) {
      // First time, store current month
      localStorage.setItem("lastBudgetMonth", currentMonth);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userCategories = res.data || [];
      const fallbackDefaults = [
        "Food & Dining",
        "Transportation",
        "Entertainment",
        "Healthcare",
        "Shopping",
        "Education",
        "Utilities",
        "Groceries",
      ];

      const merged = [...new Set([...fallbackDefaults, ...userCategories])];
      setCategories(merged);
    } catch (err) {
      console.error("Failed to fetch categories for budget:", err);
    }
  };

  const fetchBudgets = async () => {
    const targetMonth = new Date().toISOString().slice(0, 7);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/budget?month=${targetMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Only filter out 'Saving Goal', keep all others (even if budget is 0)
      setBudgets(res.data.filter(b => b.name !== "Saving Goal"));
      // Show reset notification if all budgets are 0 (optional)
      const allBudgetsZero = res.data.every(b => b.budget === 0);
      if (allBudgetsZero && res.data.length > 0) {
        setShowResetNotification(true);
      }
    } catch (err) {
      setBudgets([]); // On error, also show empty
      console.error("Failed to fetch budgets:", err);
    }
  };

  const fetchForecast = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/budget/forecast", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForecast(res.data);
    } catch (err) {
      console.error("Forecast fetch failed:", err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/budget", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchBudgets();
      await fetchForecast();
      setForm({ ...form, categoryName: "", budget: "" });
    } catch (err) {
      console.error("Failed to add budget:", err);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage > 100) return "bg-red-700";
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-green-500";
  };

  // Auto Budget logic
  const handleAutoBudget = async () => {
    setAutoBudgetLoading(true);
    try {
      console.log("Starting auto budget generation...");
      
      // Fetch categories
      const catRes = await axios.get("http://localhost:5000/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userCategories = catRes.data || [];
      console.log("User categories:", userCategories);
      
      const fallbackDefaults = [
        "Food & Dining",
        "Transportation",
        "Entertainment",
        "Healthcare",
        "Shopping",
        "Education",
        "Utilities",
        "Groceries",
      ];
      const merged = [...new Set([...fallbackDefaults, ...userCategories])];
      console.log("Merged categories:", merged);

      // Fetch total income for the selected month
      const [year, monthNum] = autoBudgetMonth.split("-");
      const monthStart = `${autoBudgetMonth}-01`;
      console.log("Selected month:", autoBudgetMonth, "Year:", year, "Month:", monthNum);
      
      const incomeRes = await axios.get(
        `http://localhost:5000/api/transactions/summary?interval=monthly`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Income response:", incomeRes.data);
      
      // Find the correct month label
      const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'long' });
      console.log("Looking for month:", monthName, "Year:", year);
      
      const monthData = incomeRes.data.data.find(d => d.label === monthName && d.year == year);
      console.log("Found month data:", monthData);
      
      const totalIncome = monthData ? Number(monthData.income) : 0;
      console.log("Total income for month:", totalIncome);

      // Distribute amount among categories
      const expenseCategories = merged.filter(cat => cat !== "Saving Goal");
      const perCategory = expenseCategories.length > 0 ? Math.floor(totalIncome / expenseCategories.length) : 0;
      console.log("Per category budget:", perCategory);

      // Create budgets array
      const budgets = expenseCategories.map(cat => ({ category: cat, budget: perCategory }));
      console.log("Generated budgets:", budgets);

      // Check if budgets already exist for this month
      const budgetRes = await axios.get(
        `http://localhost:5000/api/budget?month=${autoBudgetMonth}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAutoBudgetExists((budgetRes.data || []).some(b => b.budget > 0));

      setAutoBudgets(budgets);
      setAutoBudgetIncome(totalIncome);
      setShowAutoBudget(true);
    } catch (err) {
      console.error("Auto budget error:", err);
      alert("Failed to generate auto budget");
    } finally {
      setAutoBudgetLoading(false);
    }
  };

  const handleAutoBudgetChange = (idx, value) => {
    setAutoBudgets(autoBudgets =>
      autoBudgets.map((b, i) => i === idx ? { ...b, budget: value } : b)
    );
  };

  const handleAutoBudgetConfirm = async () => {
    try {
      await Promise.all(
        autoBudgets.map(b =>
          axios.post(
            "http://localhost:5000/api/budget",
            { categoryName: b.category, budget: b.budget, month: autoBudgetMonth },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      setShowAutoBudget(false);
      setAutoBudgets([]);
      await fetchBudgets();
      await fetchForecast();
      alert("Auto budgets saved!");
    } catch (err) {
      alert("Failed to save auto budgets");
      console.error(err);
    }
  };

  const autoBudgetTotal = autoBudgets.reduce((sum, b) => sum + Number(b.budget), 0);

  const handleEditBudget = async (categoryId, newBudget) => {
    try {
      await axios.put(
        `http://localhost:5000/api/budget/${categoryId}`,
        { budget: newBudget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchBudgets();
      await fetchForecast();
      setEditingBudget(null);
    } catch (err) {
      console.error("Failed to update budget:", err);
      alert("Failed to update budget");
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/budget/${budgetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchBudgets();
      await fetchForecast();
    } catch (err) {
      alert('Failed to delete budget');
      console.error('Failed to delete budget:', err);
    }
  };

  const handleManualReset = async () => {
    if (window.confirm("This will reset all budgets to 0 and save current month's data to history. Continue?")) {
      try {
        await axios.post("http://localhost:5000/api/budget/reset", { month: new Date().toISOString().slice(0, 7) }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchBudgets();
        await fetchForecast();
        alert("Budgets have been reset successfully!");
        setShowResetNotification(true);
      } catch (err) {
        console.error("Failed to reset budgets:", err);
        alert("Failed to reset budgets");
      }
    }
  };

  return (
    <div>
      <div className="p-2 max-w-5xl mx-auto space-y-10">
        {/* Monthly Reset Notification */}
        {showResetNotification && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-1">
                    New Month Started
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your budgets have been reset to 0 for the new month. Previous month's budget data has been saved to history.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetNotification(false)}
                className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-800">
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Budget</h2>
          <div className="flex gap-3">
            {/* Manual Reset Button (for testing) */}
            <button
              onClick={handleManualReset}
              className="bg-red-600 text-white px-8 py-2 rounded-lg font-semibold shadow hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              Manual Reset
            </button>
            {/* Auto Budget Button */}
            <button
              onClick={handleAutoBudget}
              className="bg-blue-600 text-white px-8 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={autoBudgetLoading}
            >
              {autoBudgetLoading ? "Calculating..." : "Divide Budget"}
            </button>
          </div>
        </div>

        {/* Budget Progress Grid */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Budget Progress</h3>
          <p className="text-base text-gray-500 dark:text-gray-400 mb-8">
            Your monthly category-wise breakdown.
          </p>
          {budgets.filter(b => b.budget > 0).length === 0 ? (
            <div className="text-center text-lg text-gray-500 py-12">No budgets available for this month.</div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
              {budgets.filter(b => b.budget > 0).map((item, index) => {
                const spent = parseFloat(item.spent || 0);
                const budget = parseFloat(item.budget || 0);
                const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                const forecastItem = forecast.find((f) => f.category === item.name);
                const today = new Date();
                const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const daysLeft = lastDayOfMonth.getDate() - today.getDate() + 1;
                const remainingBudget = Math.max(budget - spent, 0);
                const safeDailySpend = daysLeft > 0 ? (remainingBudget / daysLeft) : 0;
                const isEditing = editingBudget === item.id;

                return (
                  <div key={index} className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 flex flex-col gap-3 border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-xl text-gray-900 dark:text-white">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingBudget(item.id)}
                          className="text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(item.id)}
                          className="text-gray-500 hover:text-red-600 transition-colors ml-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3.5a.5.5 0 000 1h13a.5.5 0 000-1H15V3a1 1 0 00-1-1H6zm2 5a1 1 0 00-1 1v7a1 1 0 102 0V8a1 1 0 00-1-1zm4 1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="number"
                          defaultValue={budget}
                          className="border px-2 py-1 rounded w-32 focus:ring-2 focus:ring-blue-400 transition"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditBudget(item.id, e.target.value);
                            }
                          }}
                          onBlur={(e) => handleEditBudget(item.id, e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => setEditingBudget(null)}
                          className="text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-base mb-1">
                          <span className="text-gray-500">Spent</span>
                          <span className="font-medium">
                            Rs. {spent.toFixed(2)} / Rs. {budget.toFixed(2)} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-4 w-full rounded bg-gray-200 mb-2 overflow-hidden">
                          <div
                            className={`h-4 rounded-l transition-all duration-700 ease-in-out ${getProgressColor(percentage)}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-base text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                          {forecastItem && (
                            <div className="flex justify-between mb-1">
                              <span>Forecast:</span>
                              <span className="font-medium">
                                Rs. {typeof forecastItem.forecast === "number" ? forecastItem.forecast.toFixed(2) : "0.00"}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between mb-1">
                            <span>Remaining:</span>
                            <span className="font-medium">Rs. {remainingBudget.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Safe Daily Spend:</span>
                            <span className="font-medium">Rs. {safeDailySpend.toFixed(2)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <PastBudgetHistory />

        {/* Add Budget Form */}
        {/* <div id="budget-form" className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 flex flex-col md:flex-row items-center gap-6 border border-gray-200 dark:border-gray-800">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 w-full md:items-end">
            <div className="flex-1">
              <label className="block text-base font-semibold mb-2">Category</label>
              <select
                name="categoryName"
                value={form.categoryName}
                onChange={handleChange}
                className="border px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-400 transition"
                required
              >
                <option value="" disabled>
                  Select Category
                </option>
                {categories.filter(cat => cat !== "Saving Goal").map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-base font-semibold mb-2">Budget Amount</label>
              <input
                type="number"
                name="budget"
                placeholder="Budget Amount"
                value={form.budget}
                onChange={handleChange}
                className="border px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-400 transition"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Add Budget
            </button>
          </form>
        </div> */}
      </div>
      {showAutoBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative border dark:border-gray-800">
            <button
              onClick={() => setShowAutoBudget(false)}
              className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Auto Budget - Edit & Confirm</h2>
            <div className="mb-3 flex justify-between items-center text-base">
              <span className="font-semibold">Select Month:</span>
              <input
                type="month"
                className="border px-2 py-1 rounded focus:ring-2 focus:ring-blue-400 transition"
                max={new Date().toISOString().slice(0, 7)}
                value={autoBudgetMonth}
                onChange={e => setAutoBudgetMonth(e.target.value)}
              />
            </div>
            {autoBudgetExists && (
              <div className="text-red-600 text-sm mb-2">Budgets already exist for this month. Proceeding will overwrite them.</div>
            )}
            <div className="mb-3 flex justify-between items-center text-base">
              <span className="font-semibold">Total Monthly Income:</span>
              <span className="font-mono">Rs. {autoBudgetIncome}</span>
            </div>
            <div className="mb-3 flex justify-between items-center text-base">
              <span className="font-semibold">Total Budgeted:</span>
              <span className={`font-mono ${autoBudgetTotal > autoBudgetIncome ? 'text-red-600' : ''}`}>Rs. {autoBudgetTotal}</span>
            </div>
            {autoBudgetTotal > autoBudgetIncome && (
              <div className="text-red-600 text-sm mb-2">Total budget exceeds monthly income!</div>
            )}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleAutoBudgetConfirm();
              }}
              className="space-y-4"
            >
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full">
                  <tbody>
                    {autoBudgets.map((b, idx) => (
                      <tr key={b.category} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 text-left align-middle whitespace-nowrap font-medium text-gray-700">{b.category}</td>
                        <td className="py-2 pl-2 text-right align-middle">
                          <input
                            type="number"
                            value={b.budget}
                            onChange={e => handleAutoBudgetChange(idx, e.target.value)}
                            className="border rounded px-2 py-1 w-24 text-right focus:ring-2 focus:ring-blue-400"
                            min={0}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAutoBudget(false)}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  disabled={autoBudgetTotal > autoBudgetIncome}
                >
                  Confirm Budgets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPage;