import { useState, useEffect } from "react";
import api from "@/api/axios";
import axios from "axios";
import { format, parseISO } from "date-fns";

export default function EditTransactionModal({ transaction, onClose }) {
  const [form, setForm] = useState({
    ...transaction,
    date: format(parseISO(transaction.date), "yyyy-MM-dd'T'HH:mm")
  });

  const [categories, setCategories] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const formData = {
      ...form,
      date: new Date(form.date).toISOString() // Convert to ISO string with timezone
    };

    try {
      await api.put(`/transactions/${transaction.id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Transaction updated!");
      onClose();
    } catch (err) {
      console.error("Update error:", err.response?.data || err.message);
      alert("Error updating transaction");
    }
  };

  const predefinedCategories = [
    "Food & Dining",
    "Transportation",
    "Entertainment",
    "Healthcare",
    "Shopping",
    "Education",
    "Utilities",
    "Groceries",
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `http://localhost:5000/api/categories?account=${form.account}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userCategories = res.data || [];
        const merged = [...new Set([...predefinedCategories, ...userCategories])];
        setCategories(merged);
      } catch (err) {
        setCategories(predefinedCategories);
      }
    };
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.account]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-lg"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">
          Edit Transaction
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="datetime-local"
            name="date"
            className="w-full border px-3 py-2 rounded"
            value={form.date?.slice(0, 16) || ""}
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
            <option value="transfer">Transfer</option>
          </select>

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

          <input
            type="text"
            name="account"
            placeholder="Account"
            className="w-full border px-3 py-2 rounded"
            value={form.account}
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
