-- CreateTable
CREATE TABLE "MonthlyBudgetHistory" (
    "id" SERIAL NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "MonthlyBudgetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBudgetHistory_userId_month_category_key" ON "MonthlyBudgetHistory"("userId", "month", "category");

-- AddForeignKey
ALTER TABLE "MonthlyBudgetHistory" ADD CONSTRAINT "MonthlyBudgetHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
