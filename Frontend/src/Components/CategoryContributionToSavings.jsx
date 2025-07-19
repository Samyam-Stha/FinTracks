import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatNPR } from '@/utils/formatCurrency';

const CategoryContributionToSavings = ({
  chartData = [],
  totalSavingsFromCategories = 0,
  otherSavings = 0,
  savingsData = {},
  categoryContributions = [],
  CHART_COLORS = [],
  selectedMonthSaving = null,
  savingsPercentage = 0
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Category Contribution to Savings
        </CardTitle>
        <CardDescription>
          Breakdown of how much of your savings came from under-spending in specific budget categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatNPR(totalSavingsFromCategories)}
              </div>
              <div className="text-sm text-green-600 font-medium">From Budget Categories</div>
              <div className="text-xs text-muted-foreground">
                {savingsData?.currentSavings > 0 
                  ? `${((totalSavingsFromCategories / savingsData.currentSavings) * 100).toFixed(1)}% of total savings`
                  : '0% of total savings'
                }
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-sm text-gray-500">Top Saving Category</div>
              <div className="text-2xl font-bold text-yellow-600">
                {categoryContributions.length > 0
                  ? `${categoryContributions[0].category} (+${formatNPR(categoryContributions[0].variance)})`
                  : 'N/A'}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {categoryContributions.length}
              </div>
              <div className="text-sm text-purple-600 font-medium">Categories Contributing</div>
              <div className="text-xs text-muted-foreground">
                Categories under budget
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [
                      `Rs. ${value.toLocaleString()}`,
                      'Savings Contribution'
                    ]}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Table */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Category Breakdown</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      Actual
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      Savings
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                      % of Total Savings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categoryContributions.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {formatNPR(item.budget)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {formatNPR(item.actual)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        +{formatNPR(item.variance)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {item.contributionPercentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {categoryContributions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No categories are currently under budget
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Savings Goal, Saved Amount, and Percentage Cards */}
          {selectedMonthSaving && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-sm text-gray-500">Savings Goal</div>
                <div className="text-2xl font-bold text-blue-600">{formatNPR(selectedMonthSaving.savingGoal)}</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-sm text-gray-500">Saved Amount</div>
                <div className="text-2xl font-bold text-green-600">{formatNPR(selectedMonthSaving.savedAmount)}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-sm text-gray-500">Savings Percentage</div>
                <div className="text-2xl font-bold text-purple-600">{savingsPercentage}%</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryContributionToSavings; 