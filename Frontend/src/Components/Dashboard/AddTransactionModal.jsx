import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";

export default function AddTransactionModal({ onClose, onSuccess }) {
  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const [form, setForm] = useState({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    description: "",
    amount: "",
    type: "expense",
    category: "",
    account: "Cash",
  });

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const token = localStorage.getItem("token");

  const fetchCategories = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/categories?account=${form.account}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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
      console.error("Failed to fetch categories:", err);
      setCategories([
        "Food & Dining",
        "Transportation",
        "Entertainment",
        "Healthcare",
        "Shopping",
        "Education",
        "Utilities",
        "Groceries",
      ]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [form.account, token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addNewCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      await axios.post(
        "http://localhost:5000/api/categories",
        { name: newCategory, account: form.account },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchCategories();
      setForm({ ...form, category: newCategory });
      setNewCategory("");
      setShowNewCategoryInput(false);
    } catch (err) {
      console.error("Failed to add category:", err);
      alert("Error adding new category.");
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (!window.confirm(`Delete category '${categoryName}'? This cannot be undone.`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/categories?name=${encodeURIComponent(categoryName)}&account=${encodeURIComponent(form.account)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCategories();
      if (form.category === categoryName) setForm({ ...form, category: '' });
    } catch (err) {
      alert('Failed to delete category');
      console.error('Failed to delete category:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateObj = new Date(form.date);
      const formData = {
        ...form,
        date: dateObj.toISOString(),
      };

      await axios.post("http://localhost:5000/api/transactions", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Add transaction error:", err.response?.data || err.message);
      const backendError = err.response?.data?.error;
      if (backendError) {
        alert(backendError);
      } else {
        alert("Error adding transaction.");
      }
    }
  };

  const inputBase = `w-full px-3 py-2 rounded border ${
    isDark
      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
      : "bg-white border-gray-300 text-black"
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={`rounded-lg shadow-xl w-full max-w-md p-6 relative ${
          isDark ? "bg-gray-900 text-white" : "bg-white text-black"
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-2 right-3 text-lg ${
            isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-500"
          }`}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Add Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="datetime-local"
            name="date"
            className={inputBase}
            value={form.date}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Description"
            className={inputBase}
            value={form.description}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="amount"
            placeholder="Amount"
            className={inputBase}
            value={form.amount}
            onChange={handleChange}
            required
          />
          <select
            name="type"
            className={inputBase}
            value={form.type}
            onChange={handleChange}
            required
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <select
            name="account"
            className={inputBase}
            value={form.account}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Select an account
            </option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Card">Card</option>
          </select>

          {/* Category section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <select
                name="category"
                className={`${inputBase} ${
                  form.type === "income"
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : ""
                }`}
                value={form.category}
                onChange={handleChange}
                disabled={form.type === "income"}
                required={form.type !== "income"}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {/* Delete button for selected category */}
              {form.category && categories.includes(form.category) && (
                <button
                  type="button"
                  className="ml-2 text-red-500 hover:text-red-700 text-sm border border-red-200 rounded px-2 py-1"
                  onClick={() => handleDeleteCategory(form.category)}
                  title={`Delete category '${form.category}'`}
                >
                  Delete
                </button>
              )}
            </div>

            {form.type !== "income" &&
              (showNewCategoryInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New category name"
                    className={inputBase + " flex-1"}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addNewCategory}
                    className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(true)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  + Create new category
                </button>
              ))}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
