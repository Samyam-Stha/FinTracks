import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export function RecentTransactions() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get("http://localhost:5000/api/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const filtered = res.data
          .filter((t) => {
            const txDate = new Date(t.date);
            return (
              txDate.getMonth() === currentMonth &&
              txDate.getFullYear() === currentYear
            );
          })
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ); // sort by latest

        setTransactions(filtered);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      }
    };

    fetchTransactions();

    // Initialize Socket.IO connection
    const socket = io("http://localhost:5000", {
      withCredentials: true
    });

    // Listen for transaction events
    socket.on("transaction:added", ({ transaction }) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const txDate = new Date(transaction.date);

      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        setTransactions(prev => {
          const updated = [transaction, ...prev];
          return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      }
    });

    socket.on("transaction:updated", ({ transaction }) => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const txDate = new Date(transaction.date);

      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        setTransactions(prev => {
          const updated = prev.map(t => t.id === transaction.id ? transaction : t);
          return updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });
      } else {
        // If the updated transaction is no longer in current month, remove it
        setTransactions(prev => prev.filter(t => t.id !== transaction.id));
      }
    });

    socket.on("transaction:deleted", ({ transactionId }) => {
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-[500px]">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {format(new Date(transaction.date), "d MMMM yyyy")}
              </TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>{transaction.category}</TableCell>
              <TableCell
                className={`text-right ${
                  transaction.type === "expense"
                    ? "text-red-500"
                    : transaction.type === "income"
                    ? "text-green-500"
                    : ""
                }`}
              >
                Rs. {Number(transaction.amount).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
