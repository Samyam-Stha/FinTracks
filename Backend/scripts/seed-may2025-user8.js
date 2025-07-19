const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 8;
  const may = new Date(Date.UTC(2025, 4, 1, 0, 0, 0, 0)); // May 1, 2025

  // Transactions
  await prisma.transaction.createMany({
    data: [
      {
        date: new Date(Date.UTC(2025, 4, 5, 10)),
        description: 'Salary',
        amount: 10000,
        type: 'income',
        category: 'Salary',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 4, 10, 12)),
        description: 'Groceries',
        amount: 2000,
        type: 'expense',
        category: 'Groceries',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 4, 15, 15)),
        description: 'Utilities',
        amount: 1000,
        type: 'expense',
        category: 'Utilities',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 4, 20, 18)),
        description: 'Dining Out',
        amount: 500,
        type: 'expense',
        category: 'Dining',
        account: 'Bank',
        userId,
      },
      {
        date: new Date(Date.UTC(2025, 4, 25, 9)),
        description: 'Freelance',
        amount: 2000,
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
        budget: 2500,
        spent: 2000,
        userId,
      },
      {
        categoryId: categoryIds['Utilities'],
        budget: 1200,
        spent: 1000,
        userId,
      },
      {
        categoryId: categoryIds['Dining'],
        budget: 800,
        spent: 500,
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
        month: may,
        category: 'Groceries',
        budget: 2500,
        spent: 2000,
        remaining: 500,
        createdAt: new Date(),
      },
      {
        userId,
        month: may,
        category: 'Utilities',
        budget: 1200,
        spent: 1000,
        remaining: 200,
        createdAt: new Date(),
      },
      {
        userId,
        month: may,
        category: 'Dining',
        budget: 800,
        spent: 500,
        remaining: 300,
        createdAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // MonthlySavings
  await prisma.monthlySavings.upsert({
    where: { userId_month: { userId, month: may } },
    update: {},
    create: {
      userId,
      month: may,
      savedAmount: 5000,
      savingGoal: 5000,
      status: 'achieved',
      createdAt: new Date(),
    },
  });

  console.log('Dummy data for May 2025 (userId 8) inserted successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 