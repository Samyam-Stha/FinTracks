/*
  Warnings:

  - Made the column `status` on table `MonthlySavings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MonthlySavings" ALTER COLUMN "status" SET NOT NULL;
