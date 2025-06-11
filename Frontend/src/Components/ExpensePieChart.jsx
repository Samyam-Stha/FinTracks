// src/components/ExpensePieChart.jsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

const COLORS = [
  "#8884d8", // purple
  "#82ca9d", // green
  "#ffc658", // yellow
  "#ff8042", // orange
  "#8dd1e1", // light blue
  "#a4de6c", // light green
  "#d0ed57", // lime
  "#ffbb28", // gold
  "#e57373", // red
  "#ba68c8", // violet
  "#4fc3f7", // sky blue
  "#ffd54f", // light yellow
  "#81c784", // medium green
  "#f06292", // pink
  "#9575cd", // lavender
  "#4db6ac", // teal
  "#fbc02d", // deep yellow
  "#f44336", // deep red
  "#64b5f6", // blue
  "#aed581", // pale green
  "#ffb300", // amber
  "#ff7043", // deep orange
  "#b2dfdb", // turquoise
  "#cddc39", // chartreuse
];

export default function ExpensePieChart({ isDark }) {
  const [data, setData] = useState([]);

  const fetchExpenses = async () => {
    const token = localStorage.getItem("token");
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    try {
      const res = await axios.get(
        `http://localhost:5000/api/transactions/expenses/by-category?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const formatted = res.data.map((item) => ({
        ...item,
        total: Number(item.total),
      }));

      setData(formatted);
    } catch (err) {
      console.error("Error loading expense chart:", err);
    }
  };

  useEffect(() => {
    fetchExpenses();

    // Initialize Socket.IO connection
    const socket = io("http://localhost:5000", {
      withCredentials: true
    });

    // Listen for transaction events
    socket.on("transaction:added", ({ transaction }) => {
      if (transaction.type === "expense") {
        fetchExpenses(); // Refresh the chart data
      }
    });

    socket.on("transaction:updated", ({ transaction }) => {
      if (transaction.type === "expense") {
        fetchExpenses(); // Refresh the chart data
      }
    });

    socket.on("transaction:deleted", ({ transaction }) => {
      if (transaction.type === "expense") {
        fetchExpenses(); // Refresh the chart data
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ category, percent }) =>
            `${category} ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => `Rs. ${value}`}
          contentStyle={{ background: isDark ? "#222" : "#fff", color: isDark ? "#eee" : "#222" }}
        />
        <Legend wrapperStyle={{ color: isDark ? "#eee" : "#222" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
