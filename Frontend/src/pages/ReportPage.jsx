import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import ExpensePieChart from "../components/ExpensePieChart";
import api from "../api/axios";
import { formatNPR } from "../utils/formatCurrency";
import { format, parseISO } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

const intervals = ["daily", "weekly", "monthly", "yearly", "all"];

export default function ReportPage() {
  const [data, setData] = useState([]);
  const [interval, setInterval] = useState("monthly");
  const [chartType, setChartType] = useState("bar");

  // Detect dark mode
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => {
    fetchSummary();
  }, [interval]);

  const fetchSummary = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await api.get(`/transactions/summary?interval=${interval}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const formatted = res.data.map((item) => {
        const income = Number(item.income);
        const expense = Number(item.expense);
        const savingsRate =
          income > 0 ? (((income - expense) / income) * 100).toFixed(2) : 0;
        return {
          name: item.label,
          income,
          expense,
          savingsRate: Number(savingsRate),
        };
      });

      setData(formatted);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  // Calculate totals for summary cards
  let totalIncome = 0;
  let totalExpense = 0;
  let netSavings = 0;

  if (interval === "daily" && data.length > 0) {
    // Only today's data (last in array)
    const today = data[data.length - 1];
    totalIncome = today.income;
    totalExpense = today.expense;
    netSavings = today.income - today.expense;
  } else {
    // Sum all periods
    totalIncome = data.reduce((acc, cur) => acc + cur.income, 0);
    totalExpense = data.reduce((acc, cur) => acc + cur.expense, 0);
    netSavings = totalIncome - totalExpense;
  }

  const xLabel = {
    daily: "Day",
    weekly: "Week",
    monthly: "Month",
    yearly: "Year",
    all: "All Time",
  };

  // Format X axis labels for daily, weekly, monthly, and all intervals
  const formatXAxis = (tickItem) => {
    if (interval === "daily") {
      try {
        return format(parseISO(tickItem), "d MMMM yyyy");
      } catch {
        return tickItem;
      }
    }
    if (interval === "monthly") {
      try {
        return format(parseISO(tickItem + "-01"), "MMMM");
      } catch {
        return tickItem;
      }
    }
    if (interval === "weekly") {
      try {
        const [year, week] = tickItem.split('-');
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dayOfWeek = simple.getDay();
        const ISOweekStart = new Date(simple);
        if (dayOfWeek <= 4)
          ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
          ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return `${format(ISOweekStart, "MMMM")} (Week ${week})`;
      } catch {
        return tickItem;
      }
    }
    if (interval === "all") {
      return "All Time";
    }
    return tickItem;
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">📈 Financial Report</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Income"
          value={formatNPR(totalIncome)}
          color="green"
        />
        <SummaryCard
          title="Total Expense"
          value={formatNPR(totalExpense)}
          color="red"
        />
        <SummaryCard
          title="Net Savings"
          value={formatNPR(netSavings)}
          color="blue"
        />
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
        {/* Interval Toggle */}
        <div className="flex gap-2">
          {intervals.map((int) => (
            <button
              key={int}
              className={`px-3 py-1 rounded text-sm cursor-pointer ${
                int === interval
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
              onClick={() => setInterval(int)}
            >
              {int === 'all' ? 'All' : int.charAt(0).toUpperCase() + int.slice(1)}
            </button>
          ))}
        </div>

        {/* Chart Type Toggle */}
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-sm cursor-pointer ${
              chartType === "bar"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => setChartType("bar")}
          >
            📊 Bar Chart
          </button>
          <button
            className={`px-3 py-1 rounded text-sm cursor-pointer ${
              chartType === "line"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
            onClick={() => setChartType("line")}
          >
            📈 Line Chart
          </button>
        </div>
      </div>

      {/* Income vs Expense Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">
          {xLabel[interval]} Income vs Expense
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#444" : "#ccc"} />
              <XAxis
                dataKey="name"
                label={{
                  value: xLabel[interval],
                  position: "insideBottom",
                  dy: 10,
                  fill: isDark ? "#eee" : "#222"
                }}
                tickFormatter={formatXAxis}
                stroke={isDark ? "#ccc" : "#333"}
              />
              <YAxis stroke={isDark ? "#ccc" : "#333"} />
              <Tooltip
                contentStyle={{ background: isDark ? "#222" : "#fff", color: isDark ? "#eee" : "#222" }}
                formatter={(value) => [`Rs. ${value}`, undefined]}
              />
              <Legend wrapperStyle={{ color: isDark ? "#eee" : "#222" }} />
              <Bar dataKey="income" fill="#22c55e" />
              <Bar dataKey="expense" fill="#ef4444" />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#444" : "#ccc"} />
              <XAxis
                dataKey="name"
                label={{
                  value: xLabel[interval],
                  position: "insideBottom",
                  dy: 10,
                  fill: isDark ? "#eee" : "#222"
                }}
                tickFormatter={formatXAxis}
                stroke={isDark ? "#ccc" : "#333"}
              />
              <YAxis stroke={isDark ? "#ccc" : "#333"} />
              <Tooltip
                contentStyle={{ background: isDark ? "#222" : "#fff", color: isDark ? "#eee" : "#222" }}
                formatter={(value) => [`Rs. ${value}`, undefined]}
              />
              <Legend wrapperStyle={{ color: isDark ? "#eee" : "#222" }} />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#22c55e"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">Expense Breakdown</h3>
        <ExpensePieChart isDark={isDark} />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, color }) {
  const iconMap = {
    green: <TrendingUp className="h-5 w-5 text-gray-500" />,
    red: <CreditCard className="h-5 w-5 text-gray-500" />,
    blue: <DollarSign className="h-5 w-5 text-gray-500" />,
  };
  const valueColor = {
    green: "text-green-500",
    red: "text-red-500",
    blue: "text-blue-500",
  };
  return (
    <Card>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {iconMap[color]}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor[color]}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
