-- AlterTable
ALTER TABLE `customer` ADD COLUMN `lastOrderAt` DATETIME(3) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `totalOrders` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalSpent` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Customer_source_idx` ON `Customer`(`source`);
