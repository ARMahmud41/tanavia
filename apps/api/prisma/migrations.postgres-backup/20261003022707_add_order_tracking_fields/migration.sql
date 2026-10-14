-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'UNPAID';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "codSettledAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "senderPhone" TEXT,
ADD COLUMN     "trackingUrl" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
