import type { PrismaClient } from '@prisma/client';

export class BarcodeService {
  /**
   * Generate a unique 12-digit barcode.
   * Format: 88 (Bangladesh) + YYMMDD + 4 random digits
   * Example: 882609241234
   */
  static async generateBarcode(prisma: PrismaClient): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const barcode = this.buildBarcode();
      const existing = await prisma.product.findUnique({
        where: { barcode },
        select: { id: true },
      });

      if (!existing) return barcode;
      attempts++;
    }

    throw new Error('Failed to generate unique barcode after 10 attempts');
  }

  /**
   * Build a 12-digit barcode string.
   */
  private static buildBarcode(): string {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    return `88${yy}${mm}${dd}${rand}`;
  }

  /**
   * Generate a unique SKU for a product.
   * Format: TN-<CATEGORY>-<4-digit-serial>
   * Example: TN-MEN-0001
   */
  static async generateSku(
    category: string,
    prisma: PrismaClient
  ): Promise<string> {
    const prefix = 'TN-' + category.slice(0, 3).toUpperCase() + '-';

    // Find the last product with this category prefix
    const lastProduct = await prisma.product.findFirst({
      where: { sku: { startsWith: prefix } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    let nextNumber = 1;
    if (lastProduct) {
      const parts = lastProduct.sku.split('-');
      const lastNumber = parseInt(parts[parts.length - 1] || '0', 10);
      nextNumber = lastNumber + 1;
    }

    let sku = prefix + String(nextNumber).padStart(4, '0');

    // Ensure uniqueness (in case of race condition)
    let attempts = 0;
    while (attempts < 20) {
      const existing = await prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });
      if (!existing) return sku;

      nextNumber++;
      sku = prefix + String(nextNumber).padStart(4, '0');
      attempts++;
    }

    throw new Error('Failed to generate unique SKU after 20 attempts');
  }

  /**
   * Generate a URL-safe slug from product name.
   */
  static generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80) +
      '-' +
      Math.random().toString(36).substring(2, 6)
    );
  }

  /**
   * Validate a barcode string (12 digits).
   */
  static isValidBarcode(barcode: string): boolean {
    return /^\d{12}$/.test(barcode);
  }
}