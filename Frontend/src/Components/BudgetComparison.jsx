import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNPR } from '@/utils/formatCurrency';

function BudgetComparison({ currentBudget, selectedBudget, selectedLabel, onSelectMonth }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 items-stretch">
      <div className="flex flex-col h-full">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-xl text-blue-700">Current Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600 mb-2">
              {currentBudget && currentBudget > 0 ? formatNPR(currentBudget) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">This is your current active budget.</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col h-full border-l-2 border-dashed border-gray-300 pl-6">
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl text-purple-700">{selectedLabel || 'Selected Month Budget'}</CardTitle>
            {onSelectMonth && (
              <Button size="sm" variant="outline" onClick={onSelectMonth} className="ml-2">
                Select Month
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-600 mb-2">
              {selectedBudget && selectedBudget > 0
                ? formatNPR(selectedBudget)
                : (selectedLabel === 'Selected Month Budget'
                    ? 'Please select a month to view past records'
                    : 'No budget history for selected month')}
            </div>
            <p className="text-xs text-muted-foreground">This is the budget for the selected period.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BudgetComparison; 