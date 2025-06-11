import { useState, useEffect } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";

export default function AddTransactionModal({ onClose, onSuccess }) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const dateObj = new Date(form.date);
      console.log("Original form date:", form.date);
      console.log("Date object:", dateObj);
      console.log("ISO string:", dateObj.toISOString());
      
      const formData = {
        ...form,
        date: dateObj.toISOString()
      };

      console.log("Sending to backend:", formData);

      await axios.post(
        "http://localhost:5000/api/transactions",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Add transaction error:", err.response?.data || err.message);
      alert("Error adding transaction.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-lg"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Add Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="datetime-local"
            name="date"
            className="w-full border px-3 py-2 rounded"
            value={form.date}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="description"
            placeholder="Description"
            className="w-full border px-3 py-2 rounded"
            value={form.description}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="amount"
            placeholder="Amount"
            className="w-full border px-3 py-2 rounded"
            value={form.amount}
            onChange={handleChange}
            required
          />
          <select
            name="type"
            className="w-full border px-3 py-2 rounded"
            value={form.type}
            onChange={handleChange}
            required
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <select
            name="account"
            className="w-full border px-3 py-2 rounded"
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
            <select
              name="category"
              className={`w-full border px-3 py-2 rounded ${
                form.type === "income"
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : ""
              }`}
              value={form.category}
              onChange={handleChange}
              disabled={form.type === "income"}
              required={form.type !== "income"}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Only show category creation for expenses */}
            {form.type !== "income" &&
              (showNewCategoryInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New category name"
                    className="flex-1 border px-3 py-2 rounded"
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
