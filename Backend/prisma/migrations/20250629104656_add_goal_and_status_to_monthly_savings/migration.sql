/*
  Warnings:

  - Added the required column `goal` to the `MonthlySavings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `MonthlySavings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First add columns as nullable
ALTER TABLE "MonthlySavings" ADD COLUMN "goal" DOUBLE PRECISION,
ADD COLUMN "status" TEXT;

-- Update existing rows with default values
UPDATE "MonthlySavings" SET "goal" = 0.0, "status" = 'pending' WHERE "goal" IS NULL OR "status" IS NULL;

-- Make columns required
ALTER TABLE "MonthlySavings" ALTER COLUMN "goal" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL;
