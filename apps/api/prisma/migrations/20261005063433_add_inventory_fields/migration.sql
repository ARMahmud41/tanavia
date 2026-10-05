-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportType" ADD VALUE 'LOW_STOCK';
ALTER TYPE "ReportType" ADD VALUE 'DAMAGED_ITEM';
ALTER TYPE "ReportType" ADD VALUE 'COUNT_MISMATCH';
ALTER TYPE "ReportType" ADD VALUE 'WRONG_BARCODE';

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "StaffReport" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "cost" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_variantId_idx" ON "PurchaseOrderItem"("variantId");

-- CreateIndex
CREATE INDEX "StaffReport_variantId_idx" ON "StaffReport"("variantId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReport" ADD CONSTRAINT "StaffReport_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
