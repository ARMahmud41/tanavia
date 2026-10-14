/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `Variant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Variant_barcode_key" ON "Variant"("barcode");

-- CreateIndex
CREATE INDEX "Variant_barcode_idx" ON "Variant"("barcode");
