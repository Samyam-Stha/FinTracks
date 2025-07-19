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
import { format, parseISO, getWeek } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  Clock,
  CalendarDays,
  CalendarRange,
  CalendarCheck
} from "lucide-react";
import Overview from "../components/Overview";

const intervals = [
  { value: "daily", label: "Daily", icon: CalendarDays },
  { value: "weekly", label: "Weekly", icon: CalendarRange },
  { value: "monthly", label: "Monthly", icon: Calendar },
  { value: "yearly", label: "Yearly", icon: CalendarCheck }
];

const chartTypes = [
  { value: "Bar Chart", label: "Bar Chart", icon: BarChart3 },
  { value: "Line Chart", label: "Line Chart", icon: LineChartIcon }
];

export default function ReportPage() {
  const [interval, setInterval] = useState("monthly");
  const [chartType, setChartType] = useState("Bar Chart");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    incomeChange: 0,
    expenseChange: 0,
    savingsRate: 0
  });

  // Detect dark mode
  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    fetchSummary();
  }, [interval]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/transactions/summary?interval=${interval}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.data) {
        const data = response.data.data;
        const totals = response.data.totals || { income: 0, expense: 0 };
        const currentPeriod = data[data.length - 1];
        const previousPeriod = data[data.length - 2];

        // Use totals for summary cards
        const totalIncome = totals.income;
        const totalExpense = totals.expense;
        const netBalance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

        // Calculate changes (still use last two periods for change %)
        let incomeChange = 0;
        if (previousPeriod) {
          if (previousPeriod.income === 0) {
            incomeChange = currentPeriod.income > 0 ? 100 : 0;
          } else {
            incomeChange = ((currentPeriod.income - previousPeriod.income) / previousPeriod.income) * 100;
          }
        }

        let expenseChange = 0;
        if (previousPeriod) {
          if (previousPeriod.expense === 0) {
            expenseChange = currentPeriod.expense > 0 ? 100 : 0;
          } else {
            expenseChange = ((currentPeriod.expense - previousPeriod.expense) / previousPeriod.expense) * 100;
          }
        }

        setSummary({
          totalIncome,
          totalExpense,
          netBalance,
          incomeChange,
          expenseChange,
          savingsRate
        });
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getIntervalLabel()} • {chartType}
          </p>
        </div>
        
        {/* Enhanced Toggle Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Interval Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Time Period</label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {intervals.map((int) => {
                const Icon = int.icon;
                return (
                  <button
                    key={int.value}
                    onClick={() => setInterval(int.value)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      interval === int.value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={int.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{int.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chart Type Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Chart Type</label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {chartTypes.map((chart) => {
                const Icon = chart.icon;
                return (
                  <button
                    key={chart.value}
                    onClick={() => setChartType(chart.value)}
                    disabled={loading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      chartType === chart.value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={chart.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{chart.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="text-sm text-muted-foreground">Loading report data...</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard 
          title="Total Income" 
          value={formatNPR(summary.totalIncome)}
          color="green"
          change={summary.incomeChange}
          interval={interval}
          loading={loading}
        />
        <SummaryCard 
          title="Total Expense" 
          value={formatNPR(summary.totalExpense)}
          color="red"
          change={summary.expenseChange}
          interval={interval}
          loading={loading}
        />
        <SummaryCard 
          title="Net Balance" 
          value={formatNPR(summary.netBalance)}
          color="blue"
          interval={interval}
          loading={loading}
        />
        <SummaryCard 
          title="Savings Rate" 
          value={`${summary.savingsRate.toFixed(1)}%`}
          color={summary.savingsRate >= 20 ? "green" : "red"}
          interval={interval}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income vs Expense
            </CardTitle>
            <CardDescription>Overview of your financial flow</CardDescription>
          </CardHeader>
          <CardContent>
            <Overview isDark={isDark} interval={interval} chartType={chartType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>Category-wise expense distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensePieChart isDark={isDark} interval={interval} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, color, change, interval, loading }) {
  const iconMap = {
    green: <TrendingUp className="h-5 w-5 text-green-500" />,
    red: <CreditCard className="h-5 w-5 text-red-500" />,
    blue: <DollarSign className="h-5 w-5 text-blue-500" />,
  };
  
  const valueColor = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  const getIntervalText = () => {
    switch (interval) {
      case "daily":
        return "from yesterday";
      case "weekly":
        return "from last week";
      case "monthly":
        return "from last month";
      case "yearly":
        return "from last year";
      default:
        return "from previous period";
    }
  };

  return (
    <Card className={`hover:shadow-md transition-all duration-200 ${loading ? 'opacity-75' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</CardTitle>
        {iconMap[color]}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor[color]} ${loading ? 'animate-pulse' : ''}`}>
          {loading ? '...' : value}
        </div>
        {change !== undefined && (
          <div className="flex items-center mt-2 text-sm">
            {change > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            ) : change < 0 ? (
              <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
            ) : (
              <div className="h-4 w-4 mr-1" />
            )}
            <span className={change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"}>
              {loading ? '...' : `${change > 0 ? "+" : ""}${change.toFixed(1)}% ${getIntervalText()}`}
            </span>
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1 capitalize">
          {interval} view
        </div>
      </CardContent>
    </Card>
  );
}
