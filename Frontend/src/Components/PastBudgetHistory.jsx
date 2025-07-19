import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatNPR } from '../utils/formatCurrency';

const PastBudgetHistory = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`http://localhost:5000/api/budget/history?month=${selectedMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(res.data);
      } catch (err) {
        setError('Failed to fetch budget history');
        setHistory(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedMonth, token]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mt-10 border border-gray-200 dark:border-gray-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Past Budget History</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="month" className="font-medium text-gray-700 dark:text-gray-300">Select Month:</label>
          <input
            id="month"
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border px-2 py-1 rounded focus:ring-2 focus:ring-blue-400 transition"
            max={new Date().toISOString().slice(0, 7)}
          />
        </div>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-600 py-8">{error}</div>
      ) : history && history.budgets && history.budgets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Category</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Budget</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Spent</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Remaining</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              {history.budgets.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{item.category}</td>
                  <td className="px-4 py-2">{formatNPR(item.budget)}</td>
                  <td className="px-4 py-2">{formatNPR(item.spent)}</td>
                  <td className="px-4 py-2">{formatNPR(item.remaining)}</td>
                  <td className="px-4 py-2">
                    <span className={
                      item.status === 'over'
                        ? 'text-red-600 font-semibold'
                        : 'text-green-600 font-semibold'
                    }>
                      {item.status === 'over' ? 'Over Budget' : 'Under Budget'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">No budget history found for this month.</div>
      )}
    </div>
  );
};

export default PastBudgetHistory; 