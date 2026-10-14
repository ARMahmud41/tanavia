-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    `emailVerified` DATETIME(3) NULL,
    `phoneVerified` DATETIME(3) NULL,
    `twoFactorOn` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` VARCHAR(191) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `failedLogins` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_phone_idx`(`phone`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `blockedAt` DATETIME(3) NULL,
    `blockedReason` TEXT NULL,
    `blockedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_phone_key`(`phone`),
    UNIQUE INDEX `Customer_userId_key`(`userId`),
    INDEX `Customer_phone_idx`(`phone`),
    INDEX `Customer_userId_idx`(`userId`),
    INDEX `Customer_createdAt_idx`(`createdAt`),
    INDEX `Customer_blockedAt_idx`(`blockedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerNote` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `pinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomerNote_customerId_idx`(`customerId`),
    INDEX `CustomerNote_authorId_idx`(`authorId`),
    INDEX `CustomerNote_pinned_idx`(`pinned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTag` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerTag_customerId_idx`(`customerId`),
    INDEX `CustomerTag_tag_idx`(`tag`),
    UNIQUE INDEX `CustomerTag_customerId_tag_key`(`customerId`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_refreshToken_key`(`refreshToken`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_refreshToken_idx`(`refreshToken`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL DEFAULT 'Home',
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Address_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shift` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openingCash` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `closingCash` DECIMAL(10, 2) NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Shift_userId_status_idx`(`userId`, `status`),
    INDEX `Shift_openedAt_idx`(`openedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameBn` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_slug_idx`(`slug`),
    INDEX `Category_position_idx`(`position`),
    INDEX `Category_featured_active_idx`(`featured`, `active`),
    INDEX `Category_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameBn` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `descriptionBn` TEXT NULL,
    `categoryId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NOT NULL DEFAULT 'TANAVIA',
    `sku` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `discount` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `tryable` BOOLEAN NOT NULL DEFAULT true,
    `freeDelivery` BOOLEAN NOT NULL DEFAULT false,
    `shape` VARCHAR(191) NOT NULL DEFAULT 'tee',
    `images` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `soldCount` INTEGER NOT NULL DEFAULT 0,
    `metaTitle` VARCHAR(191) NULL,
    `metaDescription` TEXT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedById` VARCHAR(191) NULL,
    `deletedReason` TEXT NULL,
    `lowStockAt` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    UNIQUE INDEX `Product_sku_key`(`sku`),
    UNIQUE INDEX `Product_barcode_key`(`barcode`),
    INDEX `Product_categoryId_active_idx`(`categoryId`, `active`),
    INDEX `Product_featured_active_idx`(`featured`, `active`),
    INDEX `Product_barcode_idx`(`barcode`),
    INDEX `Product_sku_idx`(`sku`),
    INDEX `Product_slug_idx`(`slug`),
    INDEX `Product_status_idx`(`status`),
    INDEX `Product_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductImage_productId_idx`(`productId`),
    INDEX `ProductImage_productId_color_idx`(`productId`, `color`),
    INDEX `ProductImage_productId_isPrimary_idx`(`productId`, `isPrimary`),
    INDEX `ProductImage_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Variant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `size` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL DEFAULT 0,
    `reserved` INTEGER NOT NULL DEFAULT 0,
    `reorderLevel` INTEGER NOT NULL DEFAULT 5,
    `cost` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Variant_sku_key`(`sku`),
    UNIQUE INDEX `Variant_barcode_key`(`barcode`),
    INDEX `Variant_productId_idx`(`productId`),
    INDEX `Variant_qty_idx`(`qty`),
    INDEX `Variant_barcode_idx`(`barcode`),
    UNIQUE INDEX `Variant_productId_size_color_key`(`productId`, `size`, `color`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Drop` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameBn` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `bannerUrl` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'LIVE', 'ENDED') NOT NULL DEFAULT 'DRAFT',
    `releaseAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `countdownOn` BOOLEAN NOT NULL DEFAULT true,
    `notifyOn` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Drop_slug_key`(`slug`),
    INDEX `Drop_status_releaseAt_idx`(`status`, `releaseAt`),
    INDEX `Drop_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DropProduct` (
    `id` VARCHAR(191) NOT NULL,
    `dropId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DropProduct_dropId_idx`(`dropId`),
    INDEX `DropProduct_productId_idx`(`productId`),
    UNIQUE INDEX `DropProduct_dropId_productId_key`(`dropId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `channel` ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'ONLINE',
    `userId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `shiftId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `status` ENUM('PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'PLACED',
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `district` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `deliveryFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `couponCode` VARCHAR(191) NULL,
    `paymentMethod` ENUM('COD', 'BKASH', 'NAGAD', 'ROCKET', 'CARD', 'CASH') NOT NULL,
    `paymentStatus` ENUM('UNPAID', 'PENDING', 'WAITING', 'REVIEW', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paymentTxId` VARCHAR(191) NULL,
    `senderPhone` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `codSettledAt` DATETIME(3) NULL,
    `cancelReason` TEXT NULL,
    `adminNote` TEXT NULL,
    `courier` VARCHAR(191) NULL,
    `consignmentId` VARCHAR(191) NULL,
    `courierStatus` VARCHAR(191) NULL,
    `trackingUrl` VARCHAR(191) NULL,
    `courierId` VARCHAR(191) NULL,
    `courierStatusDetail` VARCHAR(191) NULL,
    `courierBookedAt` DATETIME(3) NULL,
    `courierDeliveredAt` DATETIME(3) NULL,
    `courierAttempts` INTEGER NOT NULL DEFAULT 0,
    `codAmount` DECIMAL(10, 2) NULL,
    `settlementId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Order_channel_createdAt_idx`(`channel`, `createdAt`),
    INDEX `Order_customerPhone_idx`(`customerPhone`),
    INDEX `Order_orderNumber_idx`(`orderNumber`),
    INDEX `Order_userId_idx`(`userId`),
    INDEX `Order_customerId_idx`(`customerId`),
    INDEX `Order_shiftId_idx`(`shiftId`),
    INDEX `Order_courierId_idx`(`courierId`),
    INDEX `Order_courierStatus_idx`(`courierStatus`),
    INDEX `Order_consignmentId_idx`(`consignmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Return` (
    `id` VARCHAR(191) NOT NULL,
    `returnNumber` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `channel` ENUM('ONLINE', 'OFFLINE') NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `rejectedById` VARCHAR(191) NULL,
    `inspectedById` VARCHAR(191) NULL,
    `refundedById` VARCHAR(191) NULL,
    `shiftId` VARCHAR(191) NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTED', 'REFUNDED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `reason` ENUM('SIZE_WRONG', 'COLOR_WRONG', 'DAMAGED', 'DEFECTIVE', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'LATE_DELIVERY', 'WRONG_ITEM', 'OTHER') NOT NULL,
    `reasonNote` TEXT NULL,
    `refundAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `refundMethod` ENUM('CASH_BACK', 'BKASH_REFUND', 'NAGAD_REFUND', 'BANK_TRANSFER', 'STORE_CREDIT', 'EXCHANGE', 'NO_REFUND') NULL,
    `refundTxId` VARCHAR(191) NULL,
    `refundedAt` DATETIME(3) NULL,
    `courier` VARCHAR(191) NULL,
    `consignmentId` VARCHAR(191) NULL,
    `trackingUrl` VARCHAR(191) NULL,
    `inspectedAt` DATETIME(3) NULL,
    `inspectionNote` TEXT NULL,
    `rejectionNote` TEXT NULL,
    `notes` TEXT NULL,
    `adminNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Return_returnNumber_key`(`returnNumber`),
    INDEX `Return_orderId_idx`(`orderId`),
    INDEX `Return_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Return_returnNumber_idx`(`returnNumber`),
    INDEX `Return_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnItem` (
    `id` VARCHAR(191) NOT NULL,
    `returnId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `unitCost` DECIMAL(10, 2) NOT NULL,
    `condition` ENUM('PENDING', 'OK', 'DAMAGED', 'DEFECTIVE') NOT NULL DEFAULT 'PENDING',
    `restocked` BOOLEAN NOT NULL DEFAULT false,
    `restockedAt` DATETIME(3) NULL,

    INDEX `ReturnItem_returnId_idx`(`returnId`),
    INDEX `ReturnItem_productId_idx`(`productId`),
    INDEX `ReturnItem_orderItemId_idx`(`orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnEvent` (
    `id` VARCHAR(191) NOT NULL,
    `returnId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReturnEvent_returnId_idx`(`returnId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderEvent` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `actor` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderEvent_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `type` ENUM('PURCHASE', 'SALE_ONLINE', 'SALE_OFFLINE', 'RETURN', 'RETURN_DAMAGE', 'DAMAGE', 'ADJUSTMENT', 'TRANSFER', 'RESERVE', 'RESERVE_RELEASE') NOT NULL,
    `qty` INTEGER NOT NULL,
    `before` INTEGER NOT NULL,
    `after` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `refId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_productId_createdAt_idx`(`productId`, `createdAt`),
    INDEX `StockMovement_variantId_idx`(`variantId`),
    INDEX `StockMovement_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `type` ENUM('ONLINE_PAYMENT', 'OFFLINE_CASH', 'COD_RECEIVED', 'REFUND', 'COURIER_CHARGE') NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `confirmedBy` VARCHAR(191) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Transaction_type_status_idx`(`type`, `status`),
    INDEX `Transaction_orderId_idx`(`orderId`),
    INDEX `Transaction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('RENT', 'UTILITIES', 'SALARY', 'PACKAGING', 'MARKETING', 'TRANSPORT', 'SHOP_SUPPLIES', 'OTHER') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `spentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'POSTED', 'REJECTED', 'REVERSED') NOT NULL DEFAULT 'POSTED',
    `paidFrom` ENUM('CASH', 'BKASH', 'NAGAD', 'BANK') NOT NULL DEFAULT 'CASH',
    `reason` TEXT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `reversesId` VARCHAR(191) NULL,

    UNIQUE INDEX `Expense_reversesId_key`(`reversesId`),
    INDEX `Expense_category_spentAt_idx`(`category`, `spentAt`),
    INDEX `Expense_spentAt_idx`(`spentAt`),
    INDEX `Expense_status_idx`(`status`),
    INDEX `Expense_paidFrom_idx`(`paidFrom`),
    INDEX `Expense_status_spentAt_idx`(`status`, `spentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CashDrawer` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `shiftId` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `openingAmount` DECIMAL(10, 2) NOT NULL,
    `closingAmount` DECIMAL(10, 2) NULL,
    `expectedCash` DECIMAL(10, 2) NULL,
    `difference` DECIMAL(10, 2) NULL,
    `note` TEXT NULL,
    `openedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CashDrawer_userId_status_idx`(`userId`, `status`),
    INDEX `CashDrawer_openedAt_idx`(`openedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENT', 'FIXED', 'SHIPPING') NOT NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `minSpend` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `maxDiscount` DECIMAL(10, 2) NULL,
    `usageLimit` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `perUser` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    INDEX `Coupon_code_active_idx`(`code`, `active`),
    INDEX `Coupon_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `note` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Supplier_name_idx`(`name`),
    INDEX `Supplier_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `poNumber` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `paid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `due` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `orderedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PurchaseOrder_poNumber_key`(`poNumber`),
    INDEX `PurchaseOrder_supplierId_idx`(`supplierId`),
    INDEX `PurchaseOrder_status_idx`(`status`),
    INDEX `PurchaseOrder_poNumber_idx`(`poNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `qty` INTEGER NOT NULL,
    `unitCost` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `received` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PurchaseOrderItem_purchaseId_idx`(`purchaseId`),
    INDEX `PurchaseOrderItem_productId_idx`(`productId`),
    INDEX `PurchaseOrderItem_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `image` VARCHAR(191) NOT NULL,
    `mobileImage` VARCHAR(191) NULL,
    `link` VARCHAR(191) NULL,
    `ctaText` VARCHAR(191) NULL,
    `position` ENUM('HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'PRODUCT_SIDEBAR', 'POPUP', 'CHECKOUT') NOT NULL DEFAULT 'HOME_HERO',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,

    INDEX `Banner_position_active_idx`(`position`, `active`),
    INDEX `Banner_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    INDEX `Banner_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `images` JSON NOT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reply` TEXT NULL,
    `repliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Review_productId_status_idx`(`productId`, `status`),
    INDEX `Review_productId_approved_idx`(`productId`, `approved`),
    INDEX `Review_userId_idx`(`userId`),
    INDEX `Review_rating_idx`(`rating`),
    INDEX `Review_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Wishlist` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Wishlist_userId_idx`(`userId`),
    INDEX `Wishlist_productId_idx`(`productId`),
    UNIQUE INDEX `Wishlist_userId_productId_key`(`userId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `type` ENUM('ORDER', 'STOCK', 'COURIER', 'PAYMENT', 'SYSTEM', 'DROP', 'STAFF_REPORT') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_read_idx`(`userId`, `read`),
    INDEX `Notification_type_createdAt_idx`(`type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffReport` (
    `id` VARCHAR(191) NOT NULL,
    `reportedBy` VARCHAR(191) NOT NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `type` ENUM('WRONG_PRODUCT', 'DAMAGE', 'MISSING', 'PRICE_ERROR', 'CUSTOMER_ISSUE', 'LOW_STOCK', 'DAMAGED_ITEM', 'COUNT_MISMATCH', 'WRONG_BARCODE', 'OTHER') NOT NULL,
    `status` ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `productId` VARCHAR(191) NULL,
    `variantId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `proofUrl` VARCHAR(191) NULL,
    `adminNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffReport_reportedBy_idx`(`reportedBy`),
    INDEX `StaffReport_variantId_idx`(`variantId`),
    INDEX `StaffReport_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `StaffReport_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `actor` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Courier` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `apiBaseUrl` VARCHAR(191) NULL,
    `apiKey` VARCHAR(191) NULL,
    `apiSecret` VARCHAR(191) NULL,
    `apiToken` TEXT NULL,
    `apiTokenExpiresAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `codEnabled` BOOLEAN NOT NULL DEFAULT true,
    `codFeePercent` DECIMAL(5, 2) NOT NULL DEFAULT 1,
    `codFeeFixed` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `contactPerson` VARCHAR(191) NULL,
    `paymentCycle` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Courier_slug_key`(`slug`),
    INDEX `Courier_slug_idx`(`slug`),
    INDEX `Courier_active_idx`(`active`),
    INDEX `Courier_isDefault_idx`(`isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourierRate` (
    `id` VARCHAR(191) NOT NULL,
    `courierId` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `weightUpTo` DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
    `deliveryFee` DECIMAL(10, 2) NOT NULL,
    `extraPerKg` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `codFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `returnFee` DECIMAL(10, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CourierRate_courierId_idx`(`courierId`),
    INDEX `CourierRate_district_idx`(`district`),
    UNIQUE INDEX `CourierRate_courierId_district_weightUpTo_key`(`courierId`, `district`, `weightUpTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourierSettlement` (
    `id` VARCHAR(191) NOT NULL,
    `settlementNo` VARCHAR(191) NOT NULL,
    `courierId` VARCHAR(191) NOT NULL,
    `periodFrom` DATETIME(3) NOT NULL,
    `periodTo` DATETIME(3) NOT NULL,
    `grossCOD` DECIMAL(10, 2) NOT NULL,
    `deliveryFees` DECIMAL(10, 2) NOT NULL,
    `codFees` DECIMAL(10, 2) NOT NULL,
    `returnFees` DECIMAL(10, 2) NOT NULL,
    `otherDeductions` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `netPayout` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'COMPLETED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `paidBy` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CourierSettlement_settlementNo_key`(`settlementNo`),
    INDEX `CourierSettlement_courierId_status_idx`(`courierId`, `status`),
    INDEX `CourierSettlement_periodFrom_periodTo_idx`(`periodFrom`, `periodTo`),
    INDEX `CourierSettlement_settlementNo_idx`(`settlementNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourierReturn` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `courierId` VARCHAR(191) NOT NULL,
    `consignmentId` VARCHAR(191) NULL,
    `reason` ENUM('CUSTOMER_REFUSED', 'NOT_REACHABLE', 'WRONG_ADDRESS', 'CUSTOMER_CANCELLED', 'DAMAGED_IN_TRANSIT', 'LOST', 'OTHER') NOT NULL,
    `reasonNote` TEXT NULL,
    `outboundFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `returnFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalLoss` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `receivedAt` DATETIME(3) NULL,
    `receivedBy` VARCHAR(191) NULL,
    `inspectionNote` TEXT NULL,
    `itemsRestocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CourierReturn_orderId_key`(`orderId`),
    INDEX `CourierReturn_courierId_idx`(`courierId`),
    INDEX `CourierReturn_reason_idx`(`reason`),
    INDEX `CourierReturn_receivedAt_idx`(`receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_blockedById_fkey` FOREIGN KEY (`blockedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerNote` ADD CONSTRAINT `CustomerNote_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerNote` ADD CONSTRAINT `CustomerNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerTag` ADD CONSTRAINT `CustomerTag_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Address` ADD CONSTRAINT `Address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shift` ADD CONSTRAINT `Shift_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Variant` ADD CONSTRAINT `Variant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DropProduct` ADD CONSTRAINT `DropProduct_dropId_fkey` FOREIGN KEY (`dropId`) REFERENCES `Drop`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DropProduct` ADD CONSTRAINT `DropProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `Courier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `CourierSettlement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `Shift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Return` ADD CONSTRAINT `Return_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnEvent` ADD CONSTRAINT `ReturnEvent_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderEvent` ADD CONSTRAINT `OrderEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `Variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `Expense`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CashDrawer` ADD CONSTRAINT `CashDrawer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `Variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Wishlist` ADD CONSTRAINT `Wishlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Wishlist` ADD CONSTRAINT `Wishlist_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffReport` ADD CONSTRAINT `StaffReport_reportedBy_fkey` FOREIGN KEY (`reportedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffReport` ADD CONSTRAINT `StaffReport_resolvedBy_fkey` FOREIGN KEY (`resolvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffReport` ADD CONSTRAINT `StaffReport_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `Variant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourierRate` ADD CONSTRAINT `CourierRate_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `Courier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourierSettlement` ADD CONSTRAINT `CourierSettlement_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `Courier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourierReturn` ADD CONSTRAINT `CourierReturn_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourierReturn` ADD CONSTRAINT `CourierReturn_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `Courier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
