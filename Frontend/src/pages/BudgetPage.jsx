import React, { useState, useEffect } from "react";
import axios from "axios";

const BudgetPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    categoryName: "",
    budget: "",
  });
  const [suggested, setSuggested] = useState([]);
  const [forecast, setForecast] = useState([]);

  const token = localStorage.getItem("token");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
    fetchForecast();
  }, []);

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
    const currentMonth = new Date().toISOString().slice(0, 7);
    try {
      const res = await axios.get(
        `http://localhost:5000/api/budget?month=${currentMonth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBudgets(res.data);
    } catch (err) {
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

  const addNewCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      await axios.post(
        "http://localhost:5000/api/categories",
        { name: newCategory, account: "Default Account" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchCategories();
      setForm({ ...form, categoryName: newCategory });
      setNewCategory("");
      setShowNewCategoryInput(false);
    } catch (err) {
      console.error("Failed to add category:", err);
      alert("Error adding new category.");
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/budget", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchBudgets(); // refresh budgets
      await fetchForecast(); // ✅ refresh forecast
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

  const fetchAutoBudgets = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/budget/auto-suggest",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuggested(res.data);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    }
  };
  const applySuggestions = async () => {
    try {
      await Promise.all(
        suggested.map((item) =>
          axios.post(
            "http://localhost:5000/api/budget",
            { categoryName: item.category, budget: item.suggested_budget },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      alert("Suggested budgets applied successfully!");
      setSuggested([]);
      await fetchBudgets(); // refresh after applying
      await fetchForecast(); // ✅ refresh forecast too
    } catch (err) {
      console.error("Failed to apply suggested budgets", err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">📁 Budget Management</h2>

      {/* Budget Form Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-8 flex flex-col md:flex-row items-center gap-4 border dark:border-gray-800">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 w-full md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              name="categoryName"
              value={form.categoryName}
              onChange={handleChange}
              className="border px-3 py-2 rounded w-full"
              required
            >
              <option value="" disabled>
                Select Category
              </option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Budget Amount</label>
            <input
              type="number"
              name="budget"
              placeholder="Budget Amount"
              value={form.budget}
              onChange={handleChange}
              className="border px-3 py-2 rounded w-full"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition"
          >
            Add Budget
          </button>
        </form>
      </div>

      {/* Auto Suggest Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-8 flex flex-col gap-4 border dark:border-gray-800">
        <button
          onClick={fetchAutoBudgets}
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 w-fit"
        >
          💡 Auto Suggest Budgets
        </button>
        {suggested.length > 0 && (
          <div className="mt-2">
            <h3 className="font-semibold text-lg mb-2">Suggested Budgets</h3>
            <ul className="space-y-2 mb-4">
              {suggested.map((item, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{item.category}</span>
                  <span className="font-medium text-green-600">
                    Rs. {item.suggested_budget}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={applySuggestions}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-semibold"
            >
              ✅ Apply All Suggestions
            </button>
          </div>
        )}
      </div>

      {/* Budget Progress Grid */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Budget Progress</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Your monthly category-wise breakdown.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {budgets.map((item, index) => {
            const spent = parseFloat(item.spent || 0);
            const budget = parseFloat(item.budget || 0);
            const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
            const forecastItem = forecast.find((f) => f.category === item.name);
            const today = new Date();
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const daysLeft = lastDayOfMonth.getDate() - today.getDate() + 1;
            const remainingBudget = Math.max(budget - spent, 0);
            const safeDailySpend = daysLeft > 0 ? (remainingBudget / daysLeft) : 0;
            return (
              <div key={index} className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 flex flex-col gap-2 border dark:border-gray-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-lg">{item.name}</span>
                  {percentage > 100 && (
                    <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">
                      Over Budget
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Spent</span>
                  <span className="font-medium">
                    Rs. {spent.toFixed(2)} / Rs. {budget.toFixed(2)} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-gray-200 mb-1">
                  <div
                    className={`h-2 rounded ${getProgressColor(percentage)}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                {forecastItem && (
                  <div
                    className={`text-xs mt-1 font-medium ${
                      forecastItem.willExceed ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    📊 Forecast: Rs. {forecastItem.projected} projected — {forecastItem.willExceed ? "Over Budget Expected ⚠️" : "On Track ✅"}
                  </div>
                )}
                {/* Insights Section */}
                <div className="mt-2 text-sm">
                  {percentage > 100 ? (
                    <span className="text-red-700 font-semibold">
                      You have exceeded your budget. Consider reducing spending or increasing your budget next month.
                    </span>
                  ) : forecastItem && forecastItem.willExceed ? (
                    <span className="text-amber-600 font-semibold">
                      At your current pace, you will exceed your budget. Try to reduce your daily spending in this category.
                    </span>
                  ) : percentage >= 75 ? (
                    <span className="text-amber-500">
                      Warning: You are close to your budget. Try to limit spending in this category.
                    </span>
                  ) : (
                    <span className="text-green-600">
                      You are on track. Keep monitoring your spending.
                    </span>
                  )}
                </div>
                {/* Safe Daily Spend Section */}
                <div className="text-xs text-blue-600 mt-1">
                  {remainingBudget > 0
                    ? `To stay within budget, spend no more than Rs. ${safeDailySpend.toFixed(2)} per day for the rest of the month.`
                    : `You have no remaining budget for this category this month.`}
                </div>
                <div className="flex justify-end text-xs text-muted-foreground mt-1">
                  {percentage > 100 ? (
                    <span className="text-red-700 font-semibold">🚨 Over Budget!</span>
                  ) : percentage >= 90 ? (
                    <span className="text-red-500">Critical</span>
                  ) : percentage >= 75 ? (
                    <span className="text-amber-500">Warning</span>
                  ) : (
                    <span className="text-green-500">Good</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
