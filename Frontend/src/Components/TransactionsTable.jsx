import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditTransactionModal from "./EditTransactionModal";
import { formatNPR } from "@/utils/formatCurrency";
import { format, parseISO } from "date-fns";
import api from "@/api/axios";

export function TransactionsTable({ filters = {} }) {
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const query = new URLSearchParams();
      if (filters.type && filters.type !== "all")
        query.append("type", filters.type);
      if (filters.category && filters.category !== "all")
        query.append("category", filters.category);
      if (filters.account && filters.account !== "all")
        query.append("account", filters.account);
      if (filters.startDate) query.append("startDate", filters.startDate);
      if (filters.endDate) query.append("endDate", filters.endDate);

      const res = await api.get(`/transactions/filter?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions(res.data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tx) => setEditingTransaction(tx);
  const closeModal = () => {
    setEditingTransaction(null);
    fetchTransactions();
  };

  const handleDelete = async (tx) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    const token = localStorage.getItem("token");
    try {
      await api.delete(`/transactions/${tx.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      // Optionally, you can call fetchTransactions() instead for a full refresh
    } catch (err) {
      console.error("Delete error:", err.response?.data || err.message);
      alert("Error deleting transaction");
    }
  };

  const totalPages = Math.ceil(transactions.length / pageSize);
  const paginated = transactions.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p>Loading transactions...</p>;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((tx) => {
            console.log("Transaction date from backend:", tx.date);
            const dateObj = new Date(tx.date);
            console.log("Parsed date object:", dateObj);
            console.log("Formatted date:", format(dateObj, "dd MMM yyyy, hh:mm a"));
            
            return (
              <TableRow key={tx.id}>
                <TableCell>
                  {format(dateObj, "dd MMM yyyy, hh:mm a")}
                </TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell>{tx.category}</TableCell>
                <TableCell>{tx.account}</TableCell>
                <TableCell>
                  {tx.type === "expense" ? (
                    <Badge variant="destructive" className="flex gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Expense
                    </Badge>
                  ) : tx.type === "income" ? (
                    <Badge
                      variant="success"
                      className="bg-green-500 hover:bg-green-600 flex gap-1"
                    >
                      <ArrowDownRight className="h-3 w-3" /> Income
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex gap-1">
                      <RefreshCw className="h-3 w-3" /> Transfer
                    </Badge>
                  )}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    tx.type === "expense"
                      ? "text-red-500"
                      : tx.type === "income"
                      ? "text-green-500"
                      : ""
                  }`}
                >
                  {formatNPR(tx.amount)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(tx)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(tx)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, transactions.length)} of{" "}
          {transactions.length} transactions
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
