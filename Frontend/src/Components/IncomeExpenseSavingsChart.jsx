import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatNPR } from '@/utils/formatCurrency';

const IncomeExpenseSavingsChart = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchMonthlyData();
  }, []);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/transactions/summary?interval=monthly', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMonthlyData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for the chart
  const chartData = monthlyData?.map(item => ({
    period: item.label || item.month,
    income: item.income || 0,
    expenses: item.expense || 0,
    savings: (item.income || 0) - (item.expense || 0),
  })) || [];

  // Calculate totals for summary
  const totals = chartData.reduce((acc, item) => ({
    income: acc.income + item.income,
    expenses: acc.expenses + item.expenses,
    savings: acc.savings + item.savings,
  }), { income: 0, expenses: 0, savings: 0 });

  const getSavingsColor = (savings) => {
    return savings >= 0 ? '#10b981' : '#ef4444'; // Green for positive, red for negative
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Income vs Expense vs Savings - Monthly View
          </CardTitle>
          <CardDescription>
            Compare your income, expenses, and savings over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
              <span className="text-sm text-muted-foreground">Loading monthly data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Income vs Expense vs Savings - Monthly View
        </CardTitle>
        <CardDescription>
          Compare your income, expenses, and savings over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tickFormatter={(value) => formatNPR(value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value, name) => [formatNPR(value), name]}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Legend />
              <Bar 
                dataKey="income" 
                fill="#10b981" 
                name="Income"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="expenses" 
                fill="#ef4444" 
                name="Expenses"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="savings" 
                fill={(entry) => getSavingsColor(entry.savings)}
                name="Savings"
                radius={[4, 4, 0, 0]}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        {chartData.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">Insights</h4>
            <div className="space-y-2 text-sm">
              {totals.savings > 0 ? (
                <p className="text-green-600">
                  ✅ You have a positive savings rate of {((totals.savings / totals.income) * 100).toFixed(1)}%
                </p>
              ) : (
                <p className="text-red-600">
                  ⚠️ Your expenses exceed your income by {formatNPR(Math.abs(totals.savings))}
                </p>
              )}
              
              {totals.expenses > 0 && (
                <p className="text-gray-600">
                  💡 Your expense-to-income ratio is {((totals.expenses / totals.income) * 100).toFixed(1)}%
                </p>
              )}
              
              {chartData.some(item => item.savings < 0) && (
                <p className="text-orange-600">
                  📊 Some periods show negative savings - consider reviewing your spending patterns
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomeExpenseSavingsChart; 