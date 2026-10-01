// ============================================
// Backfill Variant SKUs
// Usage: pnpm tsx scripts/backfill-variant-sku.ts
// ============================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateVariantSku(
  baseSku: string,
  size: string,
  color: string
): string {
  const sizeCode = size.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const colorCode = color.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  return `${baseSku}-${sizeCode}-${colorCode}`;
}

async function main() {
  console.log('🔄 Backfilling variant SKUs...\n');

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      variants: {
        select: { id: true, size: true, color: true, sku: true },
      },
    },
  });

  console.log(`Found ${products.length} products\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.sku) {
        console.log(
          `  ⏭  Skipped: ${product.name} (${variant.size}/${variant.color}) — already has ${variant.sku}`
        );
        skipped++;
        continue;
      }

      const newSku = generateVariantSku(
        product.sku,
        variant.size,
        variant.color
      );

      try {
        await prisma.variant.update({
          where: { id: variant.id },
          data: { sku: newSku },
        });
        console.log(
          `  ✅ Updated: ${product.name} (${variant.size}/${variant.color}) → ${newSku}`
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