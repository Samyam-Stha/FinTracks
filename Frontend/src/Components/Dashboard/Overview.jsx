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
  ReferenceArea,
  LineChart,
  Line,
} from "recharts";
import axios from "axios";
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getWeek } from "date-fns";
import { io } from "socket.io-client";
import { getCurrentUser } from "@/utils/useAuth";
import { formatNPR } from "../../utils/formatCurrency";

const Overview = ({ isDark, interval = "monthly", showTotals = false, chartType }) => {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [error, setError] = useState(null);
  const user = getCurrentUser();

  useEffect(() => {
    fetchSummary();

    // Initialize Socket.IO connection
    const socket = io("http://localhost:5000", {
      withCredentials: true
    });

    // Listen for transaction events
    socket.on("transaction:added", () => {
      fetchSummary();
    });

    socket.on("transaction:updated", () => {
      fetchSummary();
    });

    socket.on("transaction:deleted", () => {
      fetchSummary();
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [interval]);

  const fetchSummary = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `http://localhost:5000/api/transactions/summary?interval=${interval}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.data) {
        // Calculate totals based on the selected interval
        const now = new Date();
        let filteredData = [];

        switch (interval) {
          case "daily":
            // Get today's data only
            filteredData = res.data.data.filter(item => {
              const itemDate = parseISO(item.label);
              return itemDate >= startOfDay(now) && itemDate <= endOfDay(now);
            });
            break;
          case "weekly":
            // Get current week's data only (compare week label)
            const currentWeekNumber = Math.ceil(now.getDate() / 7);
            const currentWeekLabel = `Week ${currentWeekNumber}`;
            filteredData = res.data.data.filter(item => item.label === currentWeekLabel);
            break;
          case "monthly":
            // Get current month's data only (compare month name)
            const currentMonthName = now.toLocaleString('default', { month: 'long' });
            filteredData = res.data.data.filter(item => item.label === currentMonthName);
            break;
          case "yearly":
            // Get current year's data only
            filteredData = res.data.data.filter(item => {
              const itemDate = parseISO(item.label);
              return itemDate >= startOfYear(now) && itemDate <= endOfYear(now);
            });
            break;
          default:
            filteredData = res.data.data;
        }

        // Calculate totals from filtered data
        const intervalTotals = filteredData.reduce(
          (acc, item) => ({
            income: acc.income + (Number(item.income) || 0),
            expense: acc.expense + (Number(item.expense) || 0),
          }),
          { income: 0, expense: 0 }
        );

        setTotals(intervalTotals);
        setData(res.data.data);
      } else {
        setData([]);
        setTotals({ income: 0, expense: 0 });
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError("Failed to load data");
      setData([]);
      setTotals({ income: 0, expense: 0 });
    }
  };

  const isValidDate = (dateString) => {
    const d = new Date(dateString);
    return !isNaN(d.getTime());
  };

  const formatLabel = (label) => {
    try {
      switch (interval) {
        case "daily":
          if (isValidDate(label)) {
            return format(new Date(label), "EEE dd");
          }
          return label;
        case "weekly":
          if (label.startsWith("Week ")) {
            const weekNumber = label.split(" ")[1];
            return `Week ${weekNumber}`;
          }
          return label;
        case "monthly":
          // For monthly view, the label is already the month name
          return label;
        case "yearly":
          if (/^\d{4}$/.test(label)) {
            return label;
          }
          if (isValidDate(label)) {
            return format(new Date(label), "yyyy");
          }
          return label;
        default:
          return label;
      }
    } catch (error) {
      console.error("Error formatting label:", error);
      return label;
    }
  };

  const getIntervalLabel = () => {
    const now = new Date();
    switch (interval) {
      case "daily":
        return format(now, "EEEE, MMMM d");
      case "weekly":
        const weekNumber = getWeek(now);
        return `Week ${weekNumber} of ${format(now, "MMMM yyyy")}`;
      case "monthly":
        return format(now, "MMMM yyyy");
      case "yearly":
        return format(now, "yyyy");
      default:
        return "";
    }
  };

  // Helper to get the current interval label for highlighting
  const getCurrentIntervalLabel = () => {
    const now = new Date();
    if (interval === "daily") {
      return now.toISOString().split("T")[0];
    } else if (interval === "weekly") {
      return `Week ${Math.ceil(now.getDate() / 7)}`;
    } else if (interval === "monthly") {
      return now.toLocaleString('default', { month: 'long' });
    } else if (interval === "yearly") {
      return now.getFullYear().toString();
    }
    return "";
  };

  const highlightColor = "#facc15"; // yellow highlight
  const incomeColor = isDark ? "#34D399" : "#22c55e";
  const expenseColor = isDark ? "#F87171" : "#ef4444";
  const currentLabel = getCurrentIntervalLabel();

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 text-center p-4">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTotals && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
            <h3 className="text-sm font-medium text-gray-500">Total Income</h3>
            <p className="text-2xl font-bold text-green-500">
              {formatNPR(totals.income)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{getIntervalLabel()}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
            <h3 className="text-sm font-medium text-gray-500">Total Expense</h3>
            <p className="text-2xl font-bold text-red-500">
              {formatNPR(totals.expense)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{getIntervalLabel()}</p>
          </div>
        </div>
      )}

      <div className={isDark ? "recharts-dark" : ""}>
        <ResponsiveContainer width="100%" height={400}>
          {chartType === "Bar Chart" ? (
            <BarChart
              data={data}
              margin={{ top: 20, right: 0, left: 0, bottom: 30 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#374151" : "#ccc"}
              />
              <XAxis
                dataKey="label"
                stroke={isDark ? "#FFF" : "#333"}
                tick={{ fill: isDark ? "#FFF" : "#333" }}
                tickFormatter={formatLabel}
                label={{
                  value: interval.charAt(0).toUpperCase() + interval.slice(1),
                  position: "insideBottom",
                  dy: 10,
                  fill: isDark ? "#FFF" : "#222",
                }}
                textAnchor="middle"
                height={30}
              />
              <YAxis
                stroke={isDark ? "#FFF" : "#333"}
                tick={{ fill: isDark ? "#FFF" : "#333" }}
                tickFormatter={formatNPR}
                width={100}
              />
              <Tooltip
                formatter={formatNPR}
                contentStyle={{
                  background: isDark ? "#1F2937" : "#fff",
                  color: isDark ? "#E5E7EB" : "#222",
                  border: isDark ? "1px solid #374151" : "1px solid #ccc",
                  borderRadius: "6px",
                }}
                labelFormatter={(label) => `${interval.charAt(0).toUpperCase() + interval.slice(1)}: ${formatLabel(label)}`}
              />
              <Legend
                wrapperStyle={{
                  color: isDark ? "#E5E7EB" : "#222",
                }}
              />
              {/* Highlight background for current interval */}
              {(() => {
                let currentLabel = "";
                const now = new Date();
                if (interval === "daily") {
                  currentLabel = now.toISOString().split("T")[0];
                } else if (interval === "weekly") {
                  const weekNumber = Math.ceil(now.getDate() / 7);
                  currentLabel = `Week ${weekNumber}`;
                } else if (interval === "monthly") {
                  currentLabel = now.toLocaleString('default', { month: 'long' });
                } else if (interval === "yearly") {
                  currentLabel = now.getFullYear().toString();
                }
                // Debug log
                console.log('Highlight Debug:', { labels: data.map(d => d.label), currentLabel });
                const currentIndex = data.findIndex(item => item.label === currentLabel);
                if (currentIndex !== -1) {
                  return (
                    <ReferenceArea
                      key="highlight"
                      x1={currentLabel}
                      x2={currentLabel}
                      strokeOpacity={0}
                      fill="#facc15"
                      fillOpacity={isDark ? 0.15 : 0.25}
                    />
                  );
                }
                return null;
              })()}
              <Bar
                dataKey="income"
                name="Income"
                fill={incomeColor}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expense"
                name="Expense"
                fill={expenseColor}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#374151" : "#ccc"}
              />
              <XAxis
                dataKey="label"
                stroke={isDark ? "#FFF" : "#333"}
                tick={{ fill: isDark ? "#FFF" : "#333" }}
                tickFormatter={formatLabel}
                label={{
                  value: interval.charAt(0).toUpperCase() + interval.slice(1),
                  position: "insideBottom",
                  dy: 10,
                  fill: isDark ? "#FFF" : "#222",
                }}
                textAnchor="middle"
                height={30}
              />
              <YAxis
                stroke={isDark ? "#FFF" : "#333"}
                tick={{ fill: isDark ? "#FFF" : "#333" }}
                tickFormatter={formatNPR}
                width={100}
              />
              <Tooltip
                formatter={formatNPR}
                contentStyle={{
                  background: isDark ? "#1F2937" : "#fff",
                  color: isDark ? "#E5E7EB" : "#222",
                  border: isDark ? "1px solid #374151" : "1px solid #ccc",
                  borderRadius: "6px",
                }}
                labelFormatter={(label) => `${interval.charAt(0).toUpperCase() + interval.slice(1)}: ${formatLabel(label)}`}
              />
              <Legend
                wrapperStyle={{
                  color: isDark ? "#E5E7EB" : "#222",
                }}
              />
              {/* Highlight background for current interval */}
              {(() => {
                let currentLabel = "";
                const now = new Date();
                if (interval === "daily") {
                  currentLabel = now.toISOString().split("T")[0];
                } else if (interval === "weekly") {
                  const weekNumber = Math.ceil(now.getDate() / 7);
                  currentLabel = `Week ${weekNumber}`;
                } else if (interval === "monthly") {
                  currentLabel = now.toLocaleString('default', { month: 'long' });
                } else if (interval === "yearly") {
                  currentLabel = now.getFullYear().toString();
                }
                // Debug log
                console.log('Highlight Debug:', { labels: data.map(d => d.label), currentLabel });
                const currentIndex = data.findIndex(item => item.label === currentLabel);
                if (currentIndex !== -1) {
                  return (
                    <ReferenceArea
                      key="highlight"
                      x1={currentLabel}
                      x2={currentLabel}
                      strokeOpacity={0}
                      fill="#facc15"
                      fillOpacity={isDark ? 0.15 : 0.25}
                    />
                  );
                }
                return null;
              })()}
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={incomeColor}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expense"
                stroke={expenseColor}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Overview;
