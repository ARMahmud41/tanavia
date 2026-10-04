-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUNDED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('SIZE_WRONG', 'COLOR_WRONG', 'DAMAGED', 'DEFECTIVE', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'LATE_DELIVERY', 'WRONG_ITEM', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('CASH_BACK', 'BKASH_REFUND', 'NAGAD_REFUND', 'BANK_TRANSFER', 'STORE_CREDIT', 'EXCHANGE', 'NO_REFUND');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('PENDING', 'OK', 'DAMAGED', 'DEFECTIVE');

-- AlterEnum
ALTER TYPE "StockMoveType" ADD VALUE 'RETURN_DAMAGE';

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "inspectedById" TEXT,
    "refundedById" TEXT,
    "shiftId" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "reasonNote" TEXT,
    "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refundMethod" "RefundMethod",
    "refundTxId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "courier" TEXT,
    "consignmentId" TEXT,
    "trackingUrl" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "inspectionNote" TEXT,
    "rejectionNote" TEXT,
    "notes" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "condition" "ItemCondition" NOT NULL DEFAULT 'PENDING',
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "restockedAt" TIMESTAMP(3),

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnEvent" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Return_returnNumber_key" ON "Return"("returnNumber");

-- CreateIndex
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");

-- CreateIndex
CREATE INDEX "Return_status_createdAt_idx" ON "Return"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Return_returnNumber_idx" ON "Return"("returnNumber");

-- CreateIndex
CREATE INDEX "Return_createdById_idx" ON "Return"("createdById");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "ReturnItem_productId_idx" ON "ReturnItem"("productId");

-- CreateIndex
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");

-- CreateIndex
CREATE INDEX "ReturnEvent_returnId_idx" ON "ReturnEvent"("returnId");

-- AddForeignKey
ALTER TABLE "Return" ADD CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvent" ADD CONSTRAINT "ReturnEvent_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;
