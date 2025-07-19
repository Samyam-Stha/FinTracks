/*
  Warnings:

  - Changed the type of `status` on the `MonthlySavings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SavingsStatus" AS ENUM ('achieved', 'in_progress', 'not_achieved', 'pending');

-- 1. Add a temporary column
ALTER TABLE "MonthlySavings" ADD COLUMN "status_tmp" "SavingsStatus";

-- 2. Migrate existing values (map old to new)
UPDATE "MonthlySavings" SET "status_tmp" =
  CASE
    WHEN "status" = 'achieved' THEN 'achieved'
    WHEN "status" = 'in-progress' THEN 'in_progress'
    WHEN "status" = 'not-achieved' THEN 'not_achieved'
    WHEN "status" = 'in_progress' THEN 'in_progress'
    WHEN "status" = 'not_achieved' THEN 'not_achieved'
    ELSE 'pending'
  END::"SavingsStatus";

-- 3. Drop the old column
ALTER TABLE "MonthlySavings" DROP COLUMN "status";

-- 4. Rename the new column
ALTER TABLE "MonthlySavings" RENAME COLUMN "status_tmp" TO "status";
