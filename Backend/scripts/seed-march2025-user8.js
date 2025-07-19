const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 8;
  const march = new Date(Date.UTC(2025, 2, 1, 0, 0, 0, 0)); // March 1, 2025

  // Transactions
  await prisma.transaction.createMany({
    data: [
      {
        date: new Date(Date.UTC(2025, 2, 5, 10)),
        description: 'Salary',
        amount: 10000,
        type: 'income',
        category: 'Salary',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 2, 10, 12)),
        description: 'Groceries',
        amount: 1800,
        type: 'expense',
        category: 'Groceries',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 2, 15, 15)),
        description: 'Utilities',
        amount: 900,
        type: 'expense',
        category: 'Utilities',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 2, 20, 18)),
        description: 'Dining Out',
        amount: 600,
        type: 'expense',
        category: 'Dining',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 2, 25, 9)),
        description: 'Freelance',
        amount: 1500,
        type: 'income',
        category: 'Freelance',
        account: 'Bank',
        userId,
      },
    ],
    skipDuplicates: true,
  });

  // Budgets (need categoryId, so upsert categories first)
  const categories = [
    { name: 'Groceries', account: 'Bank' },
    { name: 'Utilities', account: 'Bank' },
    { name: 'Dining', account: 'Bank' },
  ];
  const categoryIds = {};
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { userId_name_account: { userId, name: cat.name, account: cat.account } },
      update: {},
      create: { ...cat, userId },
    });
    categoryIds[cat.name] = category.id;
  }

  await prisma.budget.createMany({
    data: [
      {
        categoryId: categoryIds['Groceries'],
        budget: 2000,
        spent: 1800,
        userId,
      },
      {
        categoryId: categoryIds['Utilities'],
        budget: 1000,
        spent: 900,
        userId,
      },
      {
        categoryId: categoryIds['Dining'],
        budget: 700,
        spent: 600,
        userId,
      },
    ],
    skipDuplicates: true,
  });

  // MonthlyBudgetHistory
  await prisma.monthlyBudgetHistory.createMany({
    data: [
      {
        userId,
        month: march,
        category: 'Groceries',
        budget: 2000,
        spent: 1800,
        remaining: 200,
        createdAt: new Date(),
      },
      {
        userId,
        month: march,
        category: 'Utilities',
        budget: 1000,
        spent: 900,
        remaining: 100,
        createdAt: new Date(),
      },
      {
        userId,
        month: march,
        category: 'Dining',
        budget: 700,
        spent: 600,
        remaining: 100,
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // MonthlySavings
  await prisma.monthlySavings.upsert({
    where: { userId_month: { userId, month: march } },
    update: {},
    create: {
      userId,
      month: march,
      savedAmount: 4000,
      savingGoal: 4000,
      status: 'achieved',
      createdAt: new Date(),
    },
  });

  console.log('Dummy data for March 2025 (userId 8) inserted successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 