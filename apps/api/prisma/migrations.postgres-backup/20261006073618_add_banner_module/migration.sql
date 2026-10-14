-- CreateEnum
CREATE TYPE "BannerPosition" AS ENUM ('HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'PRODUCT_SIDEBAR', 'POPUP', 'CHECKOUT');

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image" TEXT NOT NULL,
    "mobileImage" TEXT,
    "link" TEXT,
    "ctaText" TEXT,
    "position" "BannerPosition" NOT NULL DEFAULT 'HOME_HERO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Banner_position_active_idx" ON "Banner"("position", "active");

-- CreateIndex
CREATE INDEX "Banner_startsAt_endsAt_idx" ON "Banner"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Banner_sortOrder_idx" ON "Banner"("sortOrder");
