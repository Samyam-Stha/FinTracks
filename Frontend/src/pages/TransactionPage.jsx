import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionFilters } from "@/Components/TransactionFilter";
import { TransactionsTable } from "@/Components/TransactionsTable";
import AddTransactionModal from "@/Components/Dashboard/AddTransactionModal";

export default function TransactionsPage() {
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // to re-fetch or re-render list
  const [filters, setFilters] = useState({}); // New

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1); // trigger refresh
  };

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      window.history.go(1);
    };
    return () => {
      window.onpopstate = null;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <Button
          className="flex items-center gap-1"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <TransactionFilters onFilterChange={setFilters} />

      <TransactionsTable key={refreshKey} filters={filters} />

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
