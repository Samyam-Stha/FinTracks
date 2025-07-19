import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Target } from 'lucide-react';
import axios from 'axios';
import { formatNPR } from '@/utils/formatCurrency';

const SetSavingsGoalModal = ({ isOpen, onClose, onGoalSet, currentGoal = 0 }) => {
    const [goal, setGoal] = useState(currentGoal.toString());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const token = localStorage.getItem("token");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post("http://localhost:5000/api/savings/goal", {
                initialGoal: parseFloat(goal)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onGoalSet(response.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to set savings goal');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Set Savings Goal
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="goal">Monthly Savings Goal</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    id="goal"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    placeholder="Enter your savings goal"
                                    className="pl-10"
                                    required
                                />
                            </div>
                            {goal && (
                                <p className="text-sm text-gray-500">
                                    Goal: {formatNPR(parseFloat(goal) || 0)}
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !goal}
                            >
                                {isLoading ? 'Setting...' : 'Set Goal'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default SetSavingsGoalModal; 