import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { formatNPR } from "@/utils/formatCurrency";
import api from "@/api/axios";

export function BudgetProgress() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/budget", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const filtered = res.data.filter((cat) => {
        const catDate = new Date(cat.month || cat.created_at || Date.now());
        return (
          catDate.getMonth() === currentMonth &&
          catDate.getFullYear() === currentYear
        );
      });

      setCategories(filtered);
    } catch (err) {
      console.error("Failed to fetch budget categories", err);
    }
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.id} className="space-y-1">
          <div className="flex justify-between text-sm font-medium">
            <span>{category.name}</span>
            <span>
              {formatNPR(category.spent)} / {formatNPR(category.budget)}
            </span>
          </div>
          <Progress value={category.percentage} className="h-2" />
          <div className="flex justify-end text-xs text-muted-foreground">
            {category.percentage >= 90 ? (
              <span className="text-red-500">Critical</span>
            ) : category.percentage >= 75 ? (
              <span className="text-amber-500">Warning</span>
            ) : (
              <span className="text-green-500">Good</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
