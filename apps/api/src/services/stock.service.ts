import type { Prisma, PrismaClient } from '@prisma/client';

type StockMoveType =
  | 'PURCHASE'
  | 'SALE_ONLINE'
  | 'SALE_OFFLINE'
  | 'RETURN'
  | 'DAMAGE'
  | 'ADJUSTMENT'
  | 'TRANSFER';

interface LogMovementInput {
  productId: string;
  variantId?: string | null;
  type: StockMoveType;
  qty: number;      // positive or negative
  before: number;   // qty before the change
  after: number;    // qty after the change
  reason?: string;
  refId?: string;   // orderId or purchaseId
  actorId?: string;
}

export class StockService {
  /**
   * Log a single stock movement.
   * Must be called INSIDE a transaction when possible.
   */
  static async log(
    input: LogMovementInput,
    prisma: PrismaClient | Prisma.TransactionClient
  ) {
    return prisma.stockMovement.create({
      data: {
        productId: input.productId,
        variantId: input.variantId || null,
        type: input.type,
        qty: input.qty,
        before: input.before,
        after: input.after,
        reason: input.reason || null,
        refId: input.refId || null,
        actorId: input.actorId || null,
      },
    });
  }

  /**
   * Get stock history for a product.
   */
  static async getHistory(
    productId: string,
    prisma: PrismaClient,
    options: { limit?: number; offset?: number } = {}
  ) {
    const limit = Math.min(200, Math.max(1, options.limit || 50));
    const offset = Math.max(0, options.offset || 0);

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.stockMovement.count({ where: { productId } }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Get low-stock products (qty <= threshold).
   */
  static async getLowStock(
    prisma: PrismaClient,
    threshold = 5
  ) {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        lowStockAt: true,
        category: true,
        variants: {
          select: { id: true, size: true, color: true, qty: true },
        },
      },
    });

    return products
      .map((p) => {
        const total = p.variants.reduce((sum, v) => sum + v.qty, 0);
        return { ...p, totalQty: total };
      })
      .filter((p) => p.totalQty <= (p.lowStockAt || threshold))
      .sort((a, b) => a.totalQty - b.totalQty);
  }
}