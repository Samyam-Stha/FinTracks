# Savings Goal Feature

## Overview
The savings goal feature allows users to set a monthly savings target. The progress bar shows 100% when the current balance meets or exceeds the goal, and decreases as the balance drops below the goal due to expenses.

## How It Works

### Setting a Savings Goal
1. Navigate to the Savings page
2. Click "Set Goal" or "Update Goal" button
3. Enter your desired monthly savings amount
4. The goal is set for the current month

### Goal Behavior
- **Savings Goal**: The amount you set as your savings target
- **Current Balance**: Your actual balance (income - expenses)
- **Progress**: Shows what percentage of your goal you've maintained
  - 100% when balance ≥ goal
  - Decreases as balance drops below goal

### Progress Bar Logic
- **100% (Green)**: Current balance meets or exceeds savings goal
- **75-99% (Green)**: Maintaining most of your savings goal
- **50-74% (Amber)**: Savings goal is being reduced
- **25-49% (Orange)**: Savings goal is significantly reduced
- **0-24% (Red)**: Savings goal is severely impacted

### Automatic Updates
- Progress updates automatically when transactions are added
- Goals are reset monthly (new month = new goal opportunity)

## API Endpoints

### Set Savings Goal
```
POST /api/savings/goal
Body: { "initialGoal": number }
```

### Get Savings Goal Status
```
GET /api/savings/goal
Response: {
  hasGoal: boolean,
  initialGoal: number,
  currentGoal: number,
  currentBalance: number,
  totalIncome: number,
  totalExpenses: number,
  progress: number
}
```

## Database Schema

### SavingsGoal Model
```prisma
model SavingsGoal {
  id              Int      @id @default(autoincrement())
  initialGoal     Float    // Original goal amount
  currentGoal     Float    // Remaining goal after expenses
  month           DateTime // Month this goal applies to
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
  userId          Int

  @@unique([userId, month])
}
```

## Frontend Components

### SetSavingsGoalModal
- Modal for setting/updating savings goals
- Form validation and error handling
- Real-time goal amount preview

### Updated SavingPage
- Shows goal maintenance with visual indicators
- Displays savings goal, current balance, and goal status
- Progress bar showing percentage of goal maintained
- Conditional messaging based on goal status

## Integration Points

### Transaction Controller
- Automatically calls `updateSavingsGoalOnExpense` when expenses are added
- Updates the current goal in real-time

### Budget Controller
- No longer handles savings goals (moved to dedicated savings controller)
- Focuses on category-based budgets

## User Experience

### Visual Indicators
- **Green**: Goal is maintained or exceeded (75-100%)
- **Amber**: Moderate goal reduction (50-74%)
- **Orange**: High goal reduction (25-49%)
- **Red**: Critical goal reduction (0-24%)

### Messages
- Encouraging messages when goal is maintained
- Warning messages when goal is being reduced
- Critical alerts when goal is severely impacted

## Benefits
1. **Clear visualization**: See immediately if you're maintaining your savings goal
2. **Motivation**: Visual progress helps stay motivated to save
3. **Awareness**: Better understanding of spending impact on savings
4. **Flexibility**: Goals reset monthly, allowing fresh starts
5. **Transparency**: Clear view of goal vs. actual balance 