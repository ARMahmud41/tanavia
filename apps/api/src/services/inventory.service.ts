import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import { StockService } from './stock.service.js';

// ============================================
// Types
// ============================================
interface ListFilters {
  search?: string;
  categoryId?: string;
  status?: 'ALL' | 'IN_STOCK' | 'LOW' | 'OUT';
  sort?: 'urgency' | 'name' | 'stock-asc' | 'stock-desc';
  page?: number;
  limit?: number;
  role?: 'STAFF' | 'ADMIN';
}

interface AdjustInput {
  variantId: string;
  change: number;
  reason: 'COUNT_CORRECTION' | 'DAMAGED' | 'LOST_MISSING' | 'FOUND' | 'OTHER';
  note?: string;
}

interface ReportInput {
  variantId: string;
  type:
    | 'LOW_STOCK'
    | 'DAMAGED_ITEM'
    | 'COUNT_MISMATCH'
    | 'WRONG_BARCODE';
  note?: string;
}

// ============================================
// Selects
// ============================================
const VARIANT_LIST_SELECT = {
  id: true,
  sku: true,
  barcode: true,
  size: true,
  color: true,
  qty: true,
  reserved: true,
  reorderLevel: true,
  cost: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true } },
      productImages: {
        where: { isPrimary: true },
        select: { url: true, alt: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.VariantSelect;

// ============================================
// Inventory Service
// ============================================
export class InventoryService {
  // ============================================
  // List (role-aware)
  // ============================================
  static async list(filters: ListFilters, prisma: PrismaClient) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const isAdmin = filters.role === 'ADMIN';

    const where: Prisma.VariantWhereInput = {};

    // Search
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { size: { contains: q, mode: 'insensitive' } },
        { color: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Category
    if (filters.categoryId) {
      where.product = { categoryId: filters.categoryId };
    }

    // Note: status filtering (LOW / OUT) must be done post-query
    // because it depends on `available = qty - reserved`

    // Sort
    let orderBy: Prisma.VariantOrderByWithRelationInput[] = [
      { product: { name: 'asc' } },
      { size: 'asc' },
    ];
    if (filters.sort === 'stock-asc') orderBy = [{ qty: 'asc' }];
    else if (filters.sort === 'stock-desc') orderBy = [{ qty: 'desc' }];

    const [items, total] = await Promise.all([
      prisma.variant.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: VARIANT_LIST_SELECT,
      }),
      prisma.variant.count({ where }),
    ]);

    // Enrich
    let enriched = items.map((v) => {
      const onHand = v.qty;
      const held = v.reserved;
      const available = Math.max(0, onHand - held);
      const status =
        available <= 0
          ? 'OUT'
          : available <= v.reorderLevel
          ? 'LOW'
          : 'IN_STOCK';

      const base = {
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        size: v.size,
        color: v.color,
        onHand,
        held,
        available,
        reorderLevel: v.reorderLevel,
        status,
        product: {
          id: v.product.id,
          name: v.product.name,
          slug: v.product.slug,
          category: v.product.category,
          image: v.product.productImages[0]?.url || null,
        },
      };

      // Admin-only fields
      if (isAdmin) {
        const cost = Number(v.cost || 0);
        return {
          ...base,
          cost,
          value: onHand * cost,
        };
      }

      return base;
    });

    // Post-query status filter
    if (filters.status && filters.status !== 'ALL') {
      enriched = enriched.filter((v) => v.status === filters.status);
    }

    // Urgency sort: OUT → LOW → IN_STOCK, then by available asc
    if (filters.sort === 'urgency' || !filters.sort) {
      const urgencyScore = (s: string) =>
        s === 'OUT' ? 0 : s === 'LOW' ? 1 : 2;
      enriched.sort((a, b) => {
        const sa = urgencyScore(a.status);
        const sb = urgencyScore(b.status);
        if (sa !== sb) return sa - sb;
        return a.available - b.available;
      });
    }

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Stats (dashboard cards)
  // ============================================
  static async stats(
    options: { role?: 'STAFF' | 'ADMIN' } = {},
    prisma: PrismaClient
  ) {
    const isAdmin = options.role === 'ADMIN';

    // Fetch all variants with qty, reserved, cost
    const variants = await prisma.variant.findMany({
      select: { qty: true, reserved: true, reorderLevel: true, cost: true, id: true },
    });

    let totalSkus = variants.length;
    let lowCount = 0;
    let outCount = 0;
    let held = 0;
    let stockValue = 0;

    for (const v of variants) {
      const available = Math.max(0, v.qty - v.reserved);
      const onHand = v.qty;
      held += v.reserved;

      if (available <= 0) outCount++;
      else if (available <= v.reorderLevel) lowCount++;

      if (isAdmin) {
        stockValue += onHand * Number(v.cost || 0);
      }
    }

    const base = {
      totalSkus,
      lowCount,
      outCount,
      held,
    };

    if (isAdmin) {
      // Dead stock value: no sales in 60 days (approximation — simplified)
      // For now, we'll skip precise dead stock — can add later
      return {
        ...base,
        stockValue,
        deadStockValue: 0, // TODO: compute properly
      };
    }

    return base;
  }

  // ============================================
  // Get variant detail (with held-by + movements)
  // ============================================
  static async getByVariantId(
    variantId: string,
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';

    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      select: VARIANT_LIST_SELECT,
    });

    if (!variant) throw new NotFoundError('Variant not found');

    const onHand = variant.qty;
    const held = variant.reserved;
    const available = Math.max(0, onHand - held);
    const status =
      available <= 0
        ? 'OUT'
        : available <= variant.reorderLevel
        ? 'LOW'
        : 'IN_STOCK';

    // Held-by: online orders with this variant, not yet shipped
    const heldOrders = await prisma.orderItem.findMany({
      where: {
        productId: variant.product.id,
        size: variant.size,
        color: variant.color,
        order: {
          status: { in: ['PLACED', 'CONFIRMED', 'PACKED'] },
        },
      },
      select: {
        qty: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      take: 10,
    });

    // Recent movements
    const movements = await prisma.stockMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        type: true,
        qty: true,
        before: true,
        after: true,
        reason: true,
        createdAt: true,
      },
    });

    // On order (from POs)
    const onOrderAgg = await prisma.purchaseOrderItem.aggregate({
      where: {
        variantId,
        purchase: {
          status: { in: ['ORDERED', 'PARTIAL'] },
        },
      },
      _sum: { qty: true, received: true },
    });
    const onOrder = Math.max(
      0,
      (onOrderAgg._sum.qty || 0) - (onOrderAgg._sum.received || 0)
    );

    const base = {
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      size: variant.size,
      color: variant.color,
      onHand,
      held,
      available,
      onOrder,
      reorderLevel: variant.reorderLevel,
      status,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        slug: variant.product.slug,
        category: variant.product.category,
        image: variant.product.productImages[0]?.url || null,
      },
      heldOrders: heldOrders.map((h) => ({
        orderNumber: h.order.orderNumber,
        status: h.order.status,
        qty: h.qty,
      })),
      movements,
    };

    if (isAdmin) {
      return {
        ...base,
        cost: Number(variant.cost || 0),
        value: onHand * Number(variant.cost || 0),
      };
    }

    return base;
  }

  // ============================================
  // Valuation (ADMIN)
  // ============================================
  static async valuation(prisma: PrismaClient) {
    // All variants with cost
    const variants = await prisma.variant.findMany({
      select: {
        id: true,
        size: true,
        color: true,
        qty: true,
        reserved: true,
        cost: true,
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalQty = 0;

    const byCategoryMap = new Map<
      string,
      { name: string; qty: number; costValue: number; retailValue: number }
    >();

    for (const v of variants) {
      const onHand = v.qty;
      const cost = Number(v.cost || 0);
      const price = Number(v.product.price || 0);
      const costValue = onHand * cost;
      const retailValue = onHand * price;

      totalCostValue += costValue;
      totalRetailValue += retailValue;
      totalQty += onHand;

      const catKey = v.product.category?.id || 'uncategorized';
      const catName = v.product.category?.name || 'Uncategorized';
      const existing = byCategoryMap.get(catKey) || {
        name: catName,
        qty: 0,
        costValue: 0,
        retailValue: 0,
      };
      existing.qty += onHand;
      existing.costValue += costValue;
      existing.retailValue += retailValue;
      byCategoryMap.set(catKey, existing);
    }

    const potentialProfit = totalRetailValue - totalCostValue;

    const byCategory = Array.from(byCategoryMap.values()).sort(
      (a, b) => b.costValue - a.costValue
    );

    // Dead stock: onHand > 0, no sale in last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const deadStockCandidates = variants.filter((v) => v.qty > 0);

    const deadStock: Array<{
      variantId: string;
      productName: string;
      size: string;
      color: string;
      qty: number;
      costValue: number;
    }> = [];

    for (const v of deadStockCandidates) {
      const soldCount = await prisma.orderItem.count({
        where: {
          productId: v.product.id,
          size: v.size,
          color: v.color,
          order: {
            createdAt: { gte: sixtyDaysAgo },
            status: { notIn: ['CANCELLED', 'RETURNED'] },
          },
        },
      });

      if (soldCount === 0) {
        deadStock.push({
          variantId: v.id,
          productName: v.product.name,
          size: v.size,
          color: v.color,
          qty: v.qty,
          costValue: v.qty * Number(v.cost || 0),
        });
      }
    }

    deadStock.sort((a, b) => b.costValue - a.costValue);

    const deadStockValue = deadStock.reduce((s, d) => s + d.costValue, 0);

    return {
      totalQty,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      byCategory,
      deadStock,
      deadStockValue,
      deadStockCount: deadStock.length,
    };
  }

  // ============================================
  // Low stock list (with suggestions for admin)
  // ============================================
  static async lowStock(
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';

    const variants = await prisma.variant.findMany({
      select: VARIANT_LIST_SELECT,
    });

    // Filter to LOW/OUT
    let filtered = variants.filter((v) => {
      const avail = Math.max(0, v.qty - v.reserved);
      return avail <= v.reorderLevel;
    });

    // Compute sold30 for each (admin only)
    const enriched = await Promise.all(
      filtered.map(async (v) => {
        const onHand = v.qty;
        const held = v.reserved;
        const available = Math.max(0, onHand - held);
        const status =
          available <= 0 ? 'OUT' : available <= v.reorderLevel ? 'LOW' : 'IN_STOCK';

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Sold in last 30 days
        const sold30Agg = await prisma.orderItem.aggregate({
          where: {
            productId: v.product.id,
            size: v.size,
            color: v.color,
            order: {
              createdAt: { gte: thirtyDaysAgo },
              status: { notIn: ['CANCELLED', 'RETURNED'] },
            },
          },
          _sum: { qty: true },
        });
        const sold30 = sold30Agg._sum.qty || 0;

        // On order
        const onOrderAgg = await prisma.purchaseOrderItem.aggregate({
          where: {
            variantId: v.id,
            purchase: { status: { in: ['ORDERED', 'PARTIAL'] } },
          },
          _sum: { qty: true, received: true },
        });
        const onOrder = Math.max(
          0,
          (onOrderAgg._sum.qty || 0) - (onOrderAgg._sum.received || 0)
        );

        const base = {
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          available,
          held,
          onOrder,
          sold30,
          status,
          product: {
            id: v.product.id,
            name: v.product.name,
            category: v.product.category,
            image: v.product.productImages[0]?.url || null,
          },
        };

        if (isAdmin) {
          // Suggested: ceil(sold30/30 * 21) - available - onOrder, min 0
          const dailySales = sold30 / 30;
          const targetStock = Math.ceil(dailySales * 21); // 21 = 7d delivery + 14d cover
          const suggested = Math.max(0, targetStock - available - onOrder);
          return { ...base, suggested };
        }

        return base;
      })
    );

    // Sort by urgency
    enriched.sort((a, b) => {
      const s = (x: string) => (x === 'OUT' ? 0 : 1);
      if (s(a.status) !== s(b.status)) return s(a.status) - s(b.status);
      return a.available - b.available;
    });

    return enriched;
  }

  // ============================================
  // Adjust stock (ADMIN, transaction-safe)
  // ============================================
  static async adjust(
    input: AdjustInput,
    prisma: PrismaClient,
    actorId: string
  ) {
    const { variantId, change, reason, note } = input;

    if (!variantId) throw new BadRequestError('variantId is required');
    if (!change || change === 0)
      throw new BadRequestError('Change cannot be zero');
    if (!reason) throw new BadRequestError('Reason is required');
    if (reason === 'OTHER' && !note?.trim())
      throw new BadRequestError('Note is required for Other');
    if (change < 0 && Math.abs(change) > 5 && !note?.trim())
      throw new BadRequestError('Note is required for removing more than 5');

    return prisma.$transaction(async (tx) => {
      // Row lock
      const variant = await tx.$queryRaw<
        Array<{ id: string; qty: number; reserved: number }>
      >`SELECT id, qty, reserved FROM "Variant" WHERE id = ${variantId} FOR UPDATE`;

      if (!variant || variant.length === 0) {
        throw new NotFoundError('Variant not found');
      }

      const v = variant[0];
      const newQty = v.qty + change;

      if (newQty < 0) {
        throw new ConflictError(
          `Stock would go negative (current: ${v.qty}, change: ${change})`
        );
      }

      if (newQty < v.reserved) {
        throw new ConflictError(
          `Cannot adjust below ${v.reserved} held for online orders`
        );
      }

      // Update variant
      await tx.variant.update({
        where: { id: variantId },
        data: { qty: newQty },
      });

      // Stock movement log
      await tx.stockMovement.create({
        data: {
          productId: (await tx.variant.findUnique({
            where: { id: variantId },
            select: { productId: true },
          }))!.productId,
          variantId,
          type: 'ADJUSTMENT',
          qty: change,
          before: v.qty,
          after: newQty,
          reason: note ? `${reason}: ${note}` : reason,
          actorId,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'STOCK_ADJUST',
          detail: `Adjusted variant ${variantId}: ${v.qty} → ${newQty} (${reason})`,
        },
      });

      // Auto-resolve open reports for this variant (LOW_STOCK + COUNT_MISMATCH)
      await tx.staffReport.updateMany({
        where: {
          variantId,
          status: 'OPEN',
          type: { in: ['LOW_STOCK', 'COUNT_MISMATCH'] },
        },
        data: {
          status: 'RESOLVED',
          resolvedBy: actorId,
          resolvedAt: new Date(),
          adminNote: `Auto-resolved by stock adjust (${change > 0 ? '+' : ''}${change})`,
        },
      });

      return {
        variantId,
        before: v.qty,
        after: newQty,
        change,
      };
    });
  }

  // ============================================
  // Bulk adjust (physical count — ADMIN)
  // ============================================
  static async bulkAdjust(
    entries: Array<{
      variantId: string;
      newQty: number;
      note?: string;
    }>,
    prisma: PrismaClient,
    actorId: string
  ) {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestError('No entries provided');
    }

    return prisma.$transaction(async (tx) => {
      const results: Array<{
        variantId: string;
        before: number;
        after: number;
        change: number;
      }> = [];

      for (const entry of entries) {
        if (!entry.variantId) continue;

        // Row lock
        const locked = await tx.$queryRaw<
          Array<{ id: string; qty: number; reserved: number; productId: string }>
        >`SELECT id, qty, reserved, "productId" FROM "Variant" WHERE id = ${entry.variantId} FOR UPDATE`;

        if (!locked || locked.length === 0) continue;

        const v = locked[0];
        const newQty = Math.max(0, Math.floor(entry.newQty));
        const change = newQty - v.qty;

        if (change === 0) continue;

        if (newQty < v.reserved) {
          throw new ConflictError(
            `Cannot set qty below ${v.reserved} held for one variant. Recount.`
          );
        }

        await tx.variant.update({
          where: { id: entry.variantId },
          data: { qty: newQty },
        });

        await tx.stockMovement.create({
          data: {
            productId: v.productId,
            variantId: entry.variantId,
            type: 'ADJUSTMENT',
            qty: change,
            before: v.qty,
            after: newQty,
            reason: entry.note
              ? `Count correction: ${entry.note}`
              : 'Count correction',
            actorId,
          },
        });

        results.push({
          variantId: entry.variantId,
          before: v.qty,
          after: newQty,
          change,
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'STOCK_COUNT',
          detail: `Bulk count correction: ${results.length} variants changed`,
        },
      });

      return {
        changed: results.length,
        results,
      };
    });
  }

  // ============================================
  // Report a problem (STAFF + ADMIN)
  // ============================================
  static async reportProblem(
    input: ReportInput,
    prisma: PrismaClient,
    reportedBy: string
  ) {
    if (!input.variantId) throw new BadRequestError('variantId is required');
    if (!input.type) throw new BadRequestError('Type is required');

    // Check duplicate open report
    const existing = await prisma.staffReport.findFirst({
      where: {
        variantId: input.variantId,
        type: input.type as any,
        status: 'OPEN',
      },
    });
    if (existing) {
      throw new ConflictError(
        'An open report already exists for this variant and type'
      );
    }

    const variant = await prisma.variant.findUnique({
      where: { id: input.variantId },
      select: {
        id: true,
        size: true,
        color: true,
        product: { select: { id: true, name: true } },
      },
    });
    if (!variant) throw new NotFoundError('Variant not found');

    const typeLabels: Record<string, string> = {
      LOW_STOCK: 'Low stock',
      DAMAGED_ITEM: 'Damaged item',
      COUNT_MISMATCH: 'Count mismatch',
      WRONG_BARCODE: 'Wrong barcode',
    };

    const report = await prisma.staffReport.create({
      data: {
        reportedBy,
        type: input.type as any,
        title: `${typeLabels[input.type] || input.type} — ${variant.product.name} ${variant.size}/${variant.color}`,
        description: input.note || typeLabels[input.type] || input.type,
        productId: variant.product.id,
        variantId: variant.id,
        status: 'OPEN',
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    return report;
  }

  // ============================================
  // List reports (ADMIN)
  // ============================================
  static async listReports(
    filters: { status?: string } = {},
    prisma: PrismaClient
  ) {
    const where: Prisma.StaffReportWhereInput = {};
    if (filters.status) where.status = filters.status as any;

    return prisma.staffReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        description: true,
        createdAt: true,
        resolvedAt: true,
        adminNote: true,
        variant: {
          select: {
            id: true,
            size: true,
            color: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  // ============================================
  // Resolve report (ADMIN)
  // ============================================
  static async resolveReport(
    reportId: string,
    note: string,
    prisma: PrismaClient,
    resolvedBy: string
  ) {
    const report = await prisma.staffReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundError('Report not found');
    if (report.status === 'RESOLVED')
      throw new BadRequestError('Report is already resolved');

    return prisma.staffReport.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
        adminNote: note || null,
      },
      select: {
        id: true,
        status: true,
        resolvedAt: true,
      },
    });
  }
}