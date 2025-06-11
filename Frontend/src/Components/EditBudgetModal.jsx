import { useState, useEffect } from "react";
import api from "@/api/axios";

export default function EditBudgetModal({ category, onClose, onUpdated }) {
  const [budget, setBudget] = useState(category.budget);
  const [selectedCategory, setSelectedCategory] = useState(category.name);
  const [categories, setCategories] = useState([]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/categories?account=Default Account`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

      const merged = [...new Set([...fallbackDefaults, ...res.data])];
      setCategories(merged);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      await api.put(
        `/budget/${category.id}`,
        { budget },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Budget updated successfully!");
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Update failed", err);
      alert("Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-lg"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Edit Budget</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm">Category</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled
              className="w-full border px-3 py-2 rounded bg-gray-100"
            >
              {categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Budget Amount (Rs.)</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </label>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
