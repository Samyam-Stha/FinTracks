import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./components/sidebar";
import { getCurrentUser } from "./utils/useAuth";
import Dashboard from "./pages/Dashboard/Dashboard";
import TransactionsPage from "./pages/TransactionPage";
import BudgetPage from "./pages/BudgetPage";
import ReportPage from "./pages/ReportPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(() => {
    // Load from localStorage or default to false
    return localStorage.getItem("darkMode") === "true";
  });
  const user = getCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <TransactionsPage />;
      case "budget":
        return <BudgetPage />;
      case "reports":
        return <ReportPage />;
      case "accounts":
        return (
          <div>
            <h2 className="text-xl font-semibold mb-2">🏦 Accounts</h2>
            <p>Track your connected accounts.</p>
          </div>
        );
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <div>
            <h2 className="text-xl font-semibold">Welcome!</h2>
            <p>Select a section from the sidebar to get started.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar in normal flow */}
      <div className="w-64 border-r bg-white dark:bg-gray-900 dark:border-gray-800">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
      {/* Main content takes remaining width */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        {renderPage()}
      </div>
    </div>
  );
}
