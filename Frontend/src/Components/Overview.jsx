import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import axios from "axios";

const intervals = ["daily", "weekly", "monthly", "yearly"];

export default function Overview() {
  const [data, setData] = useState([]);
  const [interval, setInterval] = useState("monthly");

  useEffect(() => {
    const fetchSummary = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `http://localhost:5000/api/transactions/summary?interval=${interval}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const formatted = res.data.map((item) => ({
          name: item.label, // label = day/week/month/year string
          income: Number(item.income),
          expense: Number(item.expense),
        }));

        setData(formatted);
      } catch (err) {
        console.error("Error fetching summary:", err);
      }
    };

    fetchSummary();
  }, [interval]);

  const xLabel = {
    daily: "Day",
    weekly: "Week",
    monthly: "Month",
    yearly: "Year",
  };

  return (
    <div>
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        {intervals.map((int) => (
          <button
            key={int}
            className={`px-3 py-1 rounded text-sm ${
              int === interval
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => setInterval(int)}
          >
            {int.charAt(0).toUpperCase() + int.slice(1)}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            label={{
              value: xLabel[interval],
              position: "insideBottom",
              dy: 10,
            }}
          />
          <YAxis />
          <Tooltip
            formatter={(value) => [`Rs. ${value}`, undefined]}
            labelFormatter={(label) => `${xLabel[interval]}: ${label}`}
          />
          <Legend />
          <Bar
            dataKey="income"
            name="Income"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expense"
            name="Expense"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
