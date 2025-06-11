import { useState, useEffect } from "react";
import api from "@/api/axios";

export default function AddBudgetModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ categoryName: "", budget: "" });
  const [categories, setCategories] = useState([]);
  const [account] = useState("Default Account"); // or fetch dynamically if needed
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get(`/categories?account=${account}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCategories(res.data || []);
      } catch (err) {
        console.error("Failed to fetch categories", err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, [account, token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post(
        "/budget",
        {
          categoryName: form.categoryName,
          budget: form.budget,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Budget added successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error adding budget", err);
      alert("Failed to add budget");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-lg"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">
          Add Budget Category
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            name="categoryName"
            className="w-full border px-3 py-2 rounded"
            value={form.categoryName}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              {categories.length === 0
                ? "No categories available"
                : "Select a category"}
            </option>
            {categories.map((cat, index) => (
              <option key={index} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="number"
            name="budget"
            placeholder="Budget Amount (Rs.)"
            className="w-full border px-3 py-2 rounded"
            value={form.budget}
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700"
          >
            Add Budget
          </button>
        </form>
      </div>
    </div>
  );
}
