import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Utility to merge categories for chart
function mergeCategories(currentCategories, selectedCategories, valueType) {
  const allNames = Array.from(new Set([
    ...currentCategories.map(c => c.name),
    ...selectedCategories.map(c => c.name)
  ]));
  return allNames.map(name => {
    const curr = currentCategories.find(c => c.name === name) || { budget: 0, spent: 0 };
    const sel = selectedCategories.find(c => c.name === name) || { budget: 0, spent: 0 };
    return {
      category: name,
      current: valueType === 'budget' ? curr.budget : curr.spent,
      selected: valueType === 'budget' ? sel.budget : sel.spent
    };
  });
}

const BudgetComparisonChart = ({ currentCategories = [], selectedCategories = [], currentLabel = 'Current Month', selectedLabel = 'Selected Month' }) => {
  const [valueType, setValueType] = useState('budget'); // 'budget' or 'spent'
  const data = mergeCategories(currentCategories, selectedCategories, valueType);

  return (
    <div className="my-8 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Budget Comparison Chart</h2>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium border ${valueType === 'budget' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
            onClick={() => setValueType('budget')}
          >
            Budget
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium border ${valueType === 'spent' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
            onClick={() => setValueType('spent')}
          >
            Spent
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={v => `Rs. ${v}`} />
          <Tooltip formatter={v => `Rs. ${v}`} />
          <Legend />
          <Bar dataKey="current" name={currentLabel} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="selected" name={selectedLabel} fill="#a21caf" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BudgetComparisonChart; 