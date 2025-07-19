-- CreateTable
CREATE TABLE "MonthlySavings" (
    "id" SERIAL NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "MonthlySavings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySavings_userId_month_key" ON "MonthlySavings"("userId", "month");

-- AddForeignKey
ALTER TABLE "MonthlySavings" ADD CONSTRAINT "MonthlySavings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
