import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./components/sidebar";
import { getCurrentUser } from "./utils/useAuth";
import Dashboard from "./pages/Dashboard/Dashboard";
import TransactionsPage from "./pages/TransactionPage";
import BudgetPage from "./pages/BudgetPage";
// import ReportPage from "./pages/ReportPage";
import SettingsPage from "./pages/SettingsPage";
import SavingPage from "./pages/SavingPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <TransactionsPage />;
      case "budget":
        return <BudgetPage />;
      case "savings":
        return <SavingPage />;
      // case "reports":
      //   return <ReportPage />;
      case "analytics":
        return <AnalyticsPage setCurrentPage={setCurrentPage} />;
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
        <div className="flex justify-end mb-4">
         
        </div>
        {renderPage()}
      </div>
    </div>
  );
}
