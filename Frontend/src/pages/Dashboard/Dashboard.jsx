import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  Plus,
} from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";
import { getCurrentUser } from "../../utils/useAuth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import AddTransactionModal from "@/Components/Dashboard/AddTransactionModal";
import Overview from "@/Components/Dashboard/Overview";
import { BudgetProgress } from "@/Components/Dashboard/BudgetProgress";
import { RecentTransactions } from "@/Components/Dashboard/RecentTransactions";
import ExpensePieChart from "@/Components/Dashboard/ExpensePieChart";
import { format } from "date-fns";

const Dashboard = () => {
  const user = getCurrentUser();
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [savingRate, setSavingRate] = useState(0);

  const capitalizeFirst = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  useEffect(() => {
    fetchTransactions();

    // Initialize Socket.IO connection
    const socket = io("http://localhost:5000", {
      withCredentials: true
    });

    // Listen for transaction events
    socket.on("transaction:added", ({ userId, transaction }) => {
      if (userId === user?.id) {
        setTransactions(prev => [...prev, transaction]);
        updateDashboardStats([...transactions, transaction]);
      }
    });

    socket.on("transaction:updated", ({ userId, transaction }) => {
      if (userId === user?.id) {
        setTransactions(prev => 
          prev.map(t => t.id === transaction.id ? transaction : t)
        );
        updateDashboardStats(transactions.map(t => 
          t.id === transaction.id ? transaction : t
        ));
      }
    });

    socket.on("transaction:deleted", ({ userId, transactionId }) => {
      if (userId === user?.id) {
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        updateDashboardStats(transactions.filter(t => t.id !== transactionId));
      }
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      window.history.go(1);
    };
    return () => {
      window.onpopstate = null;
    };
  }, []);

  const updateDashboardStats = (txs) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter transactions for current month
    const currentMonthTransactions = txs.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpense = currentMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyBalance = monthlyIncome - monthlyExpense;
    const savingsRate =
      monthlyIncome === 0
        ? 0
        : ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100;

    setIncome(monthlyIncome.toFixed(2));
    setExpense(monthlyExpense.toFixed(2));
    setBalance(monthlyBalance.toFixed(2));
    setSavingRate(savingsRate.toFixed(2));
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:5000/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txs = res.data;
      setTransactions(txs);
      updateDashboardStats(txs);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  const getSavingRateColor = (rate) => {
    rate = parseFloat(rate);
    if (rate >= 50) return "text-green-600";
    if (rate >= 20) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {capitalizeFirst(user?.name || user?.email)}
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 bg-black text-white px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          <Plus className="h-4 w-4" />
          Add Transaction
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {balance}</div>
            <p className="text-xs text-muted-foreground">
              This month's net balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <TrendingUp className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              Rs. {income}
            </div>
            <p className="text-xs text-muted-foreground">
              This month's total income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium ">Expenses</CardTitle>
            <CreditCard className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">Rs. {expense}</div>
            <p className="text-xs text-muted-foreground">
              This month's total expense
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <PieChart className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getSavingRateColor(savingRate)}`}
            >
              {savingRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Savings rate this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions
              transactions={transactions.filter((t) => {
                const date = new Date(t.date);
                const now = new Date();
                return (
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear()
                );
              })}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where your money goes</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensePieChart isDark={document.documentElement.classList.contains("dark")} interval="monthly" />
          </CardContent>
        </Card>
      </div>

      {/* <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
          <CardDescription>
            Your monthly category-wise breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetProgress />
        </CardContent>
      </Card> */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Income vs Expense (Monthly)</CardDescription>
        </CardHeader>
        <CardContent>
        <Overview isDark={document.documentElement.classList.contains("dark")} interval="monthly" chartType="Bar Chart" />
        </CardContent>
      </Card>

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  );
};

export default Dashboard;
