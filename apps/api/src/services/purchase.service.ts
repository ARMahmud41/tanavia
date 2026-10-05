import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface CreatePurchaseInput {
  supplierId: string;
  note?: string;
  items: Array<{
    variantId: string;
    qty: number;
    unitCost: number;
  }>;
}

interface ReceiveInput {
  lines: Array<{
    itemId: string;
    receivedQty: number;
  }>;
  note?: string;
}

// ============================================
// Selects
// ============================================
const PO_ITEM_SELECT = {
  id: true,
  productId: true,
  variantId: true,
  qty: true,
  unitCost: true,
  total: true,
  received: true,
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      productImages: {
        where: { isPrimary: true },
        select: { url: true },
        take: 1,
      },
    },
  },
  variant: {
    select: { id: true, size: true, color: true, sku: true, qty: true },
  },
};

const PO_SELECT = {
  id: true,
  poNumber: true,
  supplierId: true,
  status: true,
  subtotal: true,
  paid: true,
  due: true,
  note: true,
  orderedAt: true,
  receivedAt: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: { id: true, name: true, phone: true },
  },
  items: { select: PO_ITEM_SELECT },
};

// ============================================
// Purchase Service
// ============================================
export class PurchaseService {
  // ============================================
  // Generate unique PO number: PO-####
  // ============================================
  private static async generatePoNumber(
    prisma: PrismaClient | Prisma.TransactionClient
  ): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const num = 'PO-' + String(Math.floor(1000 + Math.random() * 9000));
      const existing = await prisma.purchaseOrder.findUnique({
        where: { poNumber: num },
        select: { id: true },
      });
      if (!existing) return num;
    }
    throw new Error('Failed to generate unique PO number');
  }

  // ============================================
  // List
  // ============================================
  static async list(
    filters: {
      status?: string;
      supplierId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.supplierId) where.supplierId = filters.supplierId;

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { poNumber: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: PO_SELECT,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Stats
  // ============================================
  static async stats(prisma: PrismaClient) {
    const [draft, ordered, partial, received, cancelled] = await Promise.all([
      prisma.purchaseOrder.count({ where: { status: 'DRAFT' } }),
      prisma.purchaseOrder.count({ where: { status: 'ORDERED' } }),
      prisma.purchaseOrder.count({ where: { status: 'PARTIAL' } }),
      prisma.purchaseOrder.count({ where: { status: 'RECEIVED' } }),
      prisma.purchaseOrder.count({ where: { status: 'CANCELLED' } }),
    ]);

    const pendingValue = await prisma.purchaseOrder.aggregate({
      where: { status: { in: ['ORDERED', 'PARTIAL'] } },
      _sum: { due: true },
    });

    return {
      draft,
      ordered,
      partial,
      received,
      cancelled,
      pendingValue: Number(pendingValue._sum.due || 0),
    };
  }

  // ============================================
  // Get by ID
  // ============================================
  static async getById(id: string, prisma: PrismaClient) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: PO_SELECT,
    });
    if (!po) throw new NotFoundError('Purchase order not found');
    return po;
  }

  // ============================================
  // Create (DRAFT)
  // ============================================
  static async create(
    input: CreatePurchaseInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.supplierId) {
      throw new BadRequestError('Supplier is required');
    }
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('At least one item is required');
    }

    // Validate supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: input.supplierId },
      select: { id: true, name: true },
    });
    if (!supplier) throw new NotFoundError('Supplier not found');

    // Validate variants + calculate totals
    let subtotal = 0;
    const lineData: Array<{
      productId: string;
      variantId: string;
      qty: number;
      unitCost: number;
      total: number;
    }> = [];

    for (const item of input.items) {
      if (!item.variantId) throw new BadRequestError('Variant is required');
      if (!item.qty || item.qty <= 0) {
        throw new BadRequestError('Quantity must be greater than zero');
      }
      if (!item.unitCost || item.unitCost <= 0) {
        throw new BadRequestError('Unit cost must be greater than zero');
      }

      const variant = await prisma.variant.findUnique({
        where: { id: item.variantId },
        select: { id: true, productId: true },
      });
      if (!variant) throw new NotFoundError(`Variant not found: ${item.variantId}`);

      const lineTotal = item.qty * item.unitCost;
      subtotal += lineTotal;

      lineData.push({
        productId: variant.productId,
        variantId: variant.id,
        qty: item.qty,
        unitCost: item.unitCost,
        total: lineTotal,
      });
    }

    const poNumber = await this.generatePoNumber(prisma);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: input.supplierId,
        status: 'DRAFT',
        subtotal,
        due: subtotal,
        note: input.note?.trim() || null,
        createdBy: actorId || null,
        items: {
          create: lineData,
        },
      },
      select: PO_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'PO_CREATE',
          detail: `Created PO ${po.poNumber} for ${supplier.name} (${lineData.length} lines)`,
        },
      });
    }

    return po;
  }

  // ============================================
  // Update Status (DRAFT → ORDERED, cancel)
  // ============================================
  static async updateStatus(
    id: string,
    status: 'ORDERED' | 'CANCELLED',
    prisma: PrismaClient,
    actorId?: string
  ) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, poNumber: true, status: true },
    });
    if (!po) throw new NotFoundError('Purchase order not found');

    // Validate transitions
    if (status === 'ORDERED' && po.status !== 'DRAFT') {
      throw new BadRequestError('Only DRAFT orders can be marked ORDERED');
    }
    if (status === 'CANCELLED') {
      if (!['DRAFT', 'ORDERED'].includes(po.status)) {
        throw new BadRequestError(
          'Only DRAFT or ORDERED orders can be cancelled'
        );
      }
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...(status === 'ORDERED' && { orderedAt: new Date() }),
      },
      select: PO_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'PO_STATUS',
          detail: `${po.poNumber}: ${po.status} → ${status}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // Receive (partial or full) — the core flow
  // ============================================
  static async receive(
    id: string,
    input: ReceiveInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.lines || input.lines.length === 0) {
      throw new BadRequestError('Receiving lines are required');
    }

    return prisma.$transaction(async (tx) => {
      // Fetch PO with items
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        select: {
          id: true,
          poNumber: true,
          status: true,
          items: {
            select: {
              id: true,
              qty: true,
              received: true,
              unitCost: true,
              productId: true,
              variantId: true,
            },
          },
        },
      });

      if (!po) throw new NotFoundError('Purchase order not found');
      if (!['ORDERED', 'PARTIAL'].includes(po.status)) {
        throw new BadRequestError(
          'Only ORDERED or PARTIAL orders can be received'
        );
      }

      let anyReceived = false;

      for (const line of input.lines) {
        if (!line.receivedQty || line.receivedQty <= 0) continue;

        const item = po.items.find((i) => i.id === line.itemId);
        if (!item) {
          throw new BadRequestError(`Item not found: ${line.itemId}`);
        }
        if (!item.variantId) {
          throw new BadRequestError(
            `Item has no variant — cannot update stock`
          );
        }

        const remaining = item.qty - item.received;
        if (line.receivedQty > remaining) {
          throw new ConflictError(
            `Cannot receive ${line.receivedQty} — only ${remaining} remaining`
          );
        }

        // Row lock on variant
        const locked = await tx.$queryRaw<
          Array<{
            id: string;
            qty: number;
            reserved: number;
            cost: number | null;
          }>
        >`SELECT id, qty, reserved, cost FROM "Variant" WHERE id = ${item.variantId} FOR UPDATE`;

        if (!locked || locked.length === 0) {
          throw new NotFoundError('Variant not found');
        }

        const v = locked[0];
        const oldCost = Number(v.cost || 0);
        const onHand = v.qty;
        const unitCost = Number(item.unitCost);

        // Moving average cost
        const newCost =
          onHand + line.receivedQty > 0
            ? (onHand * oldCost + line.receivedQty * unitCost) /
              (onHand + line.receivedQty)
            : unitCost;

        const newQty = onHand + line.receivedQty;

        await tx.variant.update({
          where: { id: item.variantId },
          data: {
            qty: newQty,
            cost: newCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: 'PURCHASE',
            qty: line.receivedQty,
            before: onHand,
            after: newQty,
            reason: `Received from PO ${po.poNumber}`,
            refId: po.id,
            actorId: actorId || null,
          },
        });

        // Update item received count
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { received: { increment: line.receivedQty } },
        });

        anyReceived = true;
      }

      if (!anyReceived) {
        throw new BadRequestError('No quantities entered to receive');
      }

      // Re-fetch items to determine new status
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseId: id },
        select: { qty: true, received: true },
      });

      const allReceived = updatedItems.every((i) => i.received >= i.qty);
      const anyPartial = updatedItems.some((i) => i.received > 0);

      const newStatus = allReceived
        ? 'RECEIVED'
        : anyPartial
        ? 'PARTIAL'
        : 'ORDERED';

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          ...(allReceived && { receivedAt: new Date() }),
          ...(input.note && { note: input.note }),
        },
        select: PO_SELECT,
      });

      if (actorId) {
        await tx.auditLog.create({
          data: {
            userId: actorId,
            actor: actorId,
            action: 'PO_RECEIVE',
            detail: `Received stock for ${po.poNumber} → status: ${newStatus}`,
          },
        });
      }

      return updated;
    });
  }
}