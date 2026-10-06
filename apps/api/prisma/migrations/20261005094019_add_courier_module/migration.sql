-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CourierReturnReason" AS ENUM ('CUSTOMER_REFUSED', 'NOT_REACHABLE', 'WRONG_ADDRESS', 'CUSTOMER_CANCELLED', 'DAMAGED_IN_TRANSIT', 'LOST', 'OTHER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "codAmount" DECIMAL(10,2),
ADD COLUMN     "courierAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "courierBookedAt" TIMESTAMP(3),
ADD COLUMN     "courierDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "courierId" TEXT,
ADD COLUMN     "courierStatusDetail" TEXT,
ADD COLUMN     "settlementId" TEXT;

-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "apiBaseUrl" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "apiToken" TEXT,
    "apiTokenExpiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "codFeeFixed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "contactPerson" TEXT,
    "paymentCycle" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierRate" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "weightUpTo" DECIMAL(5,2) NOT NULL DEFAULT 0.5,
    "deliveryFee" DECIMAL(10,2) NOT NULL,
    "extraPerKg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "codFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "returnFee" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierSettlement" (
    "id" TEXT NOT NULL,
    "settlementNo" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "grossCOD" DECIMAL(10,2) NOT NULL,
    "deliveryFees" DECIMAL(10,2) NOT NULL,
    "codFees" DECIMAL(10,2) NOT NULL,
    "returnFees" DECIMAL(10,2) NOT NULL,
    "otherDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netPayout" DECIMAL(10,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierReturn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "consignmentId" TEXT,
    "reason" "CourierReturnReason" NOT NULL,
    "reasonNote" TEXT,
    "outboundFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "returnFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalLoss" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "inspectionNote" TEXT,
    "itemsRestocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Courier_slug_key" ON "Courier"("slug");

-- CreateIndex
CREATE INDEX "Courier_slug_idx" ON "Courier"("slug");

-- CreateIndex
CREATE INDEX "Courier_active_idx" ON "Courier"("active");

-- CreateIndex
CREATE INDEX "Courier_isDefault_idx" ON "Courier"("isDefault");

-- CreateIndex
CREATE INDEX "CourierRate_courierId_idx" ON "CourierRate"("courierId");

-- CreateIndex
CREATE INDEX "CourierRate_district_idx" ON "CourierRate"("district");

-- CreateIndex
CREATE UNIQUE INDEX "CourierRate_courierId_district_weightUpTo_key" ON "CourierRate"("courierId", "district", "weightUpTo");

-- CreateIndex
CREATE UNIQUE INDEX "CourierSettlement_settlementNo_key" ON "CourierSettlement"("settlementNo");

-- CreateIndex
CREATE INDEX "CourierSettlement_courierId_status_idx" ON "CourierSettlement"("courierId", "status");

-- CreateIndex
CREATE INDEX "CourierSettlement_periodFrom_periodTo_idx" ON "CourierSettlement"("periodFrom", "periodTo");

-- CreateIndex
CREATE INDEX "CourierSettlement_settlementNo_idx" ON "CourierSettlement"("settlementNo");

-- CreateIndex
CREATE UNIQUE INDEX "CourierReturn_orderId_key" ON "CourierReturn"("orderId");

-- CreateIndex
CREATE INDEX "CourierReturn_courierId_idx" ON "CourierReturn"("courierId");

-- CreateIndex
CREATE INDEX "CourierReturn_reason_idx" ON "CourierReturn"("reason");

-- CreateIndex
CREATE INDEX "CourierReturn_receivedAt_idx" ON "CourierReturn"("receivedAt");

-- CreateIndex
CREATE INDEX "Order_courierId_idx" ON "Order"("courierId");

-- CreateIndex
CREATE INDEX "Order_courierStatus_idx" ON "Order"("courierStatus");

-- CreateIndex
CREATE INDEX "Order_consignmentId_idx" ON "Order"("consignmentId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "CourierSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierRate" ADD CONSTRAINT "CourierRate_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierSettlement" ADD CONSTRAINT "CourierSettlement_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierReturn" ADD CONSTRAINT "CourierReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierReturn" ADD CONSTRAINT "CourierReturn_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
