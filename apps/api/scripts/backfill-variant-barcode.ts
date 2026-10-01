// ============================================
// Backfill Variant Barcodes
// Format: [Product Barcode]-[2-digit Serial]
// Usage: pnpm tsx scripts/backfill-variant-barcode.ts
// ============================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateVariantBarcode(
  productBarcode: string,
  index: number
): string {
  const serial = (index + 1).toString().padStart(2, '0');
  return `${productBarcode}-${serial}`;
}

async function main() {
  console.log('🔄 Backfilling variant barcodes...\n');

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      variants: {
        select: {
          id: true,
          size: true,
          color: true,
          sku: true,
          barcode: true,
        },
      },
    },
  });

  console.log(`Found ${products.length} products\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    if (!product.barcode) {
      console.log(`  ⚠ Product ${product.name} has no barcode — skipping`);
      continue;
    }

    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];

      if (variant.barcode) {
        console.log(
          `  ⏭  Skipped: ${product.name} (${variant.size}/${variant.color}) — already has ${variant.barcode}`
        );
        skipped++;
        continue;
      }

      const newBarcode = generateVariantBarcode(product.barcode, i);

      try {
        await prisma.variant.update({
          where: { id: variant.id },
          data: { barcode: newBarcode },
        });
        console.log(
          `  ✅ Updated: ${product.name} (${variant.size}/${variant.color}) → ${newBarcode}`
        );
        updated++;
      } catch (err) {
        console.error(
          `  ❌ Failed: ${product.name} (${variant.size}/${variant.color})`,
          err instanceof Error ? err.message : err
        );
        failed++;
      }
    }
  }

  console.log(`\n============================================`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭  Skipped: ${skipped}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`============================================\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());