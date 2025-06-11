import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { formatNPR } from "@/utils/formatCurrency";
import api from "@/api/axios";
import EditBudgetModal from "./EditBudgetModal";

export function BudgetCategoryList() {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/budget", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const withCalculations = res.data.map((cat) => {
        const remaining = cat.budget - cat.spent;
        const percentage = Math.round((cat.spent / cat.budget) * 100);
        return { ...cat, remaining, percentage };
      });

      setCategories(withCalculations);
    } catch (err) {
      console.error("Failed to load budget categories:", err);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Spent</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={cat.id}>
              <TableCell className="font-medium">{cat.name}</TableCell>
              <TableCell>{formatNPR(cat.budget)}</TableCell>
              <TableCell>{formatNPR(cat.spent)}</TableCell>
              <TableCell className={cat.remaining <= 0 ? "text-red-500" : ""}>
                {formatNPR(cat.remaining)}
              </TableCell>
              <TableCell className="w-[200px]">
                <div className="flex items-center gap-2">
                  <Progress value={cat.percentage} className="h-2" />
                  <span className="text-xs w-[40px]">{cat.percentage}%</span>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setEditing(cat)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 text-red-500">
                      <Trash className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing && (
        <EditBudgetModal
          category={editing}
          onClose={() => setEditing(null)}
          onUpdated={fetchCategories}
        />
      )}
    </>
  );
}
