import React from 'react';
import { formatNPR } from '@/utils/formatCurrency';

function getStatusBadge(budget, spent) {
  if (budget === 0) return <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs ml-2">No Budget</span>;
  if (spent > budget) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs ml-2">Over</span>;
  if (spent === budget) return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs ml-2">Exact</span>;
  return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs ml-2">Under</span>;
}

function getRowClass(budget, spent) {
  if (budget === 0) return '';
  if (spent > budget) return 'bg-red-50';
  if (spent === budget) return 'bg-yellow-50';
  return 'bg-green-50';
}

function getStatusTooltip(budget, spent) {
  if (budget === 0) return 'No budget set for this category.';
  if (spent > budget) return 'You are over budget for this category.';
  if (spent === budget) return 'You spent exactly your budget.';
  return 'You are under budget for this category.';
}

function BudgetCategoryComparison({ currentCategories = [], selectedCategories = [], currentLabel = 'Current Month', selectedLabel = 'Selected Month' }) {
  // Create a map for quick lookup
  const currentMap = Object.fromEntries(currentCategories.map(cat => [cat.name, cat]));
  const selectedMap = Object.fromEntries(selectedCategories.map(cat => [cat.name, cat]));
  // Get all unique category names, excluding 'Saving Goal'
  const allCategories = Array.from(new Set([
    ...currentCategories.map(c => c.name),
    ...selectedCategories.map(c => c.name)
  ])).filter(name => name !== 'Saving Goal');

  return (
    <div className="overflow-x-auto my-8 shadow-lg rounded-xl bg-white dark:bg-gray-900 p-4">
      <h2 className="text-lg font-bold mb-4">Category Budget Comparison</h2>
      <table className="min-w-full border rounded-lg">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="py-2 px-4 text-left">Category</th>
            <th className="py-2 px-4 text-center bg-blue-200 dark:bg-blue-900">{currentLabel} Budget</th>
            <th className="py-2 px-4 text-center bg-blue-200 dark:bg-blue-900">{currentLabel} Spent</th>
            <th className="py-2 px-4 text-center bg-purple-200 dark:bg-purple-900">{selectedLabel} Budget</th>
            <th className="py-2 px-4 text-center bg-purple-200 dark:bg-purple-900">{selectedLabel} Spent</th>
          </tr>
        </thead>
        <tbody>
          {allCategories.map(name => {
            const curr = currentMap[name] || { budget: 0, spent: 0 };
            const sel = selectedMap[name] || { budget: 0, spent: 0 };
            return (
              <tr key={name} className={`border-b hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors ${getRowClass(sel.budget, sel.spent)}`}>
                <td className="py-2 px-4 font-medium">{name}</td>
                <td className="py-2 px-4 text-center bg-blue-200 dark:bg-blue-900">{formatNPR(curr.budget)}</td>
                <td className={`py-2 px-4 text-center bg-blue-200 dark:bg-blue-900`} title={getStatusTooltip(curr.budget, curr.spent)}>
                  {formatNPR(Number(curr.spent) || 0)}
                  {getStatusBadge(curr.budget, curr.spent)}
                </td>
                <td className="py-2 px-4 text-center bg-purple-200 dark:bg-purple-900">{formatNPR(sel.budget)}</td>
                <td className={`py-2 px-4 text-center bg-purple-200 dark:bg-purple-900`} title={getStatusTooltip(sel.budget, sel.spent)}>
                  {formatNPR(Number(sel.spent) || 0)}
                  {getStatusBadge(sel.budget, sel.spent)}
                </td>
              </tr>
            );
          })}
          {/* Summary row */}
          <tr className="bg-blue-100 dark:bg-blue-900 font-bold">
            <td className="py-2 px-4 text-right">Total</td>
            <td className="py-2 px-4 text-center bg-blue-200 dark:bg-blue-900">{formatNPR(allCategories.reduce((sum, name) => sum + (currentMap[name]?.budget || 0), 0))}</td>
            <td className="py-2 px-4 text-center bg-blue-200 dark:bg-blue-900">{formatNPR(allCategories.reduce((sum, name) => sum + (Number(currentMap[name]?.spent) || 0), 0))}</td>
            <td className="py-2 px-4 text-center bg-purple-200 dark:bg-purple-900">{formatNPR(allCategories.reduce((sum, name) => sum + (selectedMap[name]?.budget || 0), 0))}</td>
            <td className="py-2 px-4 text-center bg-purple-200 dark:bg-purple-900">{formatNPR(allCategories.reduce((sum, name) => sum + (Number(selectedMap[name]?.spent) || 0), 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default BudgetCategoryComparison; 