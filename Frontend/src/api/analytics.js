import api from './axios';

export const analyticsAPI = {
  // Get spending trends
  getSpendingTrends: (period = '6months') => 
    api.get(`/analytics/trends?period=${period}`),

  // Get budget vs actual comparison
  getBudgetVsActual: (month = 'current') => 
    api.get(`/analytics/budget-vs-actual?month=${month}`),

  // Get seasonal analysis
  getSeasonalAnalysis: (years = 2) => 
    api.get(`/analytics/seasonal?years=${years}`),

  // Get category alerts
  getCategoryAlerts: () => 
    api.get('/analytics/alerts'),

  // Get financial health score
  getFinancialHealthScore: () => 
    api.get('/analytics/health-score'),
};

export default analyticsAPI; 