/*
  Warnings:

  - A unique constraint covering the columns `[reversesId]` on the table `Expense` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'POSTED', 'REJECTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PaidFrom" AS ENUM ('CASH', 'BKASH', 'NAGAD', 'BANK');

-- AlterEnum
ALTER TYPE "ExpenseCategory" ADD VALUE 'SHOP_SUPPLIES';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "paidFrom" "PaidFrom" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "reversesId" TEXT,
ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'POSTED';

-- CreateIndex
CREATE UNIQUE INDEX "Expense_reversesId_key" ON "Expense"("reversesId");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_paidFrom_idx" ON "Expense"("paidFrom");

-- CreateIndex
CREATE INDEX "Expense_status_spentAt_idx" ON "Expense"("status", "spentAt");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
