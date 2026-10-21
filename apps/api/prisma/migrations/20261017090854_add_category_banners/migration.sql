-- AlterTable
ALTER TABLE `category` ADD COLUMN `bannerColor` VARCHAR(191) NULL DEFAULT '#D2B48C',
    ADD COLUMN `bannerImage` VARCHAR(191) NULL,
    ADD COLUMN `bannerSubtitle` VARCHAR(191) NULL,
    ADD COLUMN `bannerTitle` VARCHAR(191) NULL;
