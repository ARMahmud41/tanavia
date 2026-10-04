import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { StockService } from './stock.service.js';
import { TelegramService } from './telegram.service.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTED'
  | 'REFUNDED'
  | 'COMPLETED'
  | 'REJECTED';

type ReturnReason =
  | 'SIZE_WRONG'
  | 'COLOR_WRONG'
  | 'DAMAGED'
  | 'DEFECTIVE'
  | 'NOT_AS_DESCRIBED'
  | 'CHANGED_MIND'
  | 'LATE_DELIVERY'
  | 'WRONG_ITEM'
  | 'OTHER';

type RefundMethod =
  | 'CASH_BACK'
  | 'BKASH_REFUND'
  | 'NAGAD_REFUND'
  | 'BANK_TRANSFER'
  | 'STORE_CREDIT'
  | 'EXCHANGE'
  | 'NO_REFUND';

type ItemCondition = 'PENDING' | 'OK' | 'DAMAGED' | 'DEFECTIVE';

interface CreateReturnInput {
  orderNumber: string;
  reason: ReturnReason;
  reasonNote?: string;
  items: Array<{
    orderItemId: string;
    qty: number;
    condition?: ItemCondition;
  }>;
  notes?: string;
  courier?: string;
  consignmentId?: string;
  trackingUrl?: string;
}

interface InspectInput {
  items: Array<{
    returnItemId: string;
    condition: ItemCondition;
  }>;
  inspectionNote?: string;
}

interface RefundInput {
  refundMethod: RefundMethod;
  refundTxId?: string;
  adminNote?: string;
}

// ============================================
// Selects
// ============================================
const RETURN_ITEM_SELECT = {
  id: true,
  orderItemId: true,
  productId: true,
  variantId: true,
  name: true,
  size: true,
  color: true,
  qty: true,
  unitPrice: true,
  unitCost: true,
  condition: true,
  restocked: true,
  restockedAt: true,
  orderItem: {
    select: {
      id: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
        },
      },
    },
  },
};

const RETURN_SELECT = {
  id: true,
  returnNumber: true,
  orderId: true,
  channel: true,
  status: true,
  reason: true,
  reasonNote: true,
  refundAmount: true,
  refundMethod: true,
  refundTxId: true,
  refundedAt: true,
  courier: true,
  consignmentId: true,
  trackingUrl: true,
  inspectedAt: true,
  inspectionNote: true,
  rejectionNote: true,
  notes: true,
  adminNote: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  approvedById: true,
  rejectedById: true,
  inspectedById: true,
  refundedById: true,
  shiftId: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      channel: true,
      customerName: true,
      customerPhone: true,
      total: true,
      paymentMethod: true,
    },
  },
  items: { select: RETURN_ITEM_SELECT },
  events: { orderBy: { createdAt: 'asc' as const } },
};

// ============================================
// Return Service
// ============================================
export class ReturnService {
  /**
   * Generate unique return number: RT-######
   */
  private static async generateReturnNumber(
    prisma: PrismaClient | Prisma.TransactionClient
  ): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const num = 'RT-' + String(Math.floor(100000 + Math.random() * 900000));
      const existing = await prisma.return.findUnique({
        where: { returnNumber: num },
        select: { id: true },
      });
      if (!existing) return num;
    }
    throw new Error('Failed to generate unique return number');
  }

  /**
   * List returns (role-aware).
   */
  static async list(
    filters: {
      status?: string;
      channel?: string;
      search?: string;
      sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      role?: 'STAFF' | 'ADMIN';
      userId?: string;
    },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const isAdmin = filters.role === 'ADMIN';

    const where: Prisma.ReturnWhereInput = {};

    // Staff sees only their own
    if (!isAdmin && filters.userId) {
      where.createdById = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status as any;
    }
    if (filters.channel) {
      where.channel = filters.channel as any;
    }
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { returnNumber: { contains: q, mode: 'insensitive' } },
        {
          order: {
            orderNumber: { contains: q, mode: 'insensitive' },
          },
        },
        {
          order: {
            customerName: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }
    if (filters.from || filters.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
      where.createdAt = createdAt;
    }

    // Sort
    let orderBy: Prisma.ReturnOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (filters.sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (filters.sort === 'highest') orderBy = { refundAmount: 'desc' };
    else if (filters.sort === 'lowest') orderBy = { refundAmount: 'asc' };

    const [items, total] = await Promise.all([
      prisma.return.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: RETURN_SELECT,
      }),
      prisma.return.count({ where }),
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

  /**
   * Stats for dashboard cards (role-aware).
   */
  static async stats(
    options: { role?: 'STAFF' | 'ADMIN'; userId?: string },
    prisma: PrismaClient
  ) {
    const isAdmin = options.role === 'ADMIN';
    const baseWhere: Prisma.ReturnWhereInput = !isAdmin && options.userId
      ? { createdById: options.userId }
      : {};

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [myReturnsToday, waitingAdmin, refunded24h, damagedCount] =
      await Promise.all([
        prisma.return.count({
          where: { ...baseWhere, createdAt: { gte: startOfDay } },
        }),
        isAdmin
          ? prisma.return.count({ where: { status: 'REQUESTED' } })
          : prisma.return.count({
              where: { ...baseWhere, status: 'REQUESTED' },
            }),
        prisma.return.aggregate({
          where: {
            ...baseWhere,
            status: { in: ['REFUNDED', 'COMPLETED'] },
            refundedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          _sum: { refundAmount: true },
        }),
        prisma.returnItem.count({
          where: {
            return: baseWhere,
            condition: { in: ['DAMAGED', 'DEFECTIVE'] },
          },
        }),
      ]);

    return {
      myReturnsToday,
      waitingAdmin,
      refunded24h: Number(refunded24h._sum.refundAmount || 0),
      damagedCount,
    };
  }

  /**
   * Get by id (role-aware).
   */
  static async getById(
    id: string,
    prisma: PrismaClient,
    options?: { role?: 'STAFF' | 'ADMIN'; userId?: string }
  ) {
    const isAdmin = options?.role === 'ADMIN';

    const ret = await prisma.return.findUnique({
      where: { id },
      select: RETURN_SELECT,
    });

    if (!ret) throw new NotFoundError('Return not found');

    // Staff can only see their own
    if (!isAdmin && options?.userId && ret.createdById !== options.userId) {
      throw new NotFoundError('Return not found');
    }

    return ret;
  }

  /**
   * Create return request.
   */
  static async create(
    input: CreateReturnInput,
    prisma: PrismaClient,
    actorId: string,
    shiftId?: string
  ) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('At least one item is required');
    }

    return prisma.$transaction(async (tx) => {
      // Find order
      const order = await tx.order.findUnique({
        where: { orderNumber: input.orderNumber.toUpperCase() },
        select: {
          id: true,
          orderNumber: true,
          channel: true,
          status: true,
          customerName: true,
          customerPhone: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              name: true,
              size: true,
              color: true,
              qty: true,
              price: true,
              cost: true,
            },
          },
        },
      });

      if (!order) throw new NotFoundError('Order not found');

      // Check order is returnable
      if (order.status === 'CANCELLED') {
        throw new BadRequestError('Cannot return a cancelled order');
      }

      // Check no existing active return for this order
      const existingReturn = await tx.return.findFirst({
        where: {
          orderId: order.id,
          status: { notIn: ['REJECTED', 'COMPLETED'] },
        },
      });
      if (existingReturn) {
        throw new ConflictError(
          'An active return already exists for this order'
        );
      }

      // Build return items and validate
      const returnItems: Array<{
        orderItemId: string;
        productId: string;
        variantId: string | null;
        name: string;
        size: string;
        color: string;
        qty: number;
        unitPrice: number;
        unitCost: number;
      }> = [];

      let refundAmount = 0;

      for (const reqItem of input.items) {
        const orderItem = order.items.find(
          (i) => i.id === reqItem.orderItemId
        );
        if (!orderItem) {
          throw new BadRequestError(
            `Order item not found: ${reqItem.orderItemId}`
          );
        }
        if (reqItem.qty <= 0 || reqItem.qty > orderItem.qty) {
          throw new BadRequestError(
            `Invalid qty for ${orderItem.name} (max ${orderItem.qty})`
          );
        }

        // Find variant for stock restore later
        const variant = await tx.variant.findFirst({
          where: {
            productId: orderItem.productId,
            size: orderItem.size,
            color: orderItem.color,
          },
          select: { id: true },
        });

        const lineTotal = Number(orderItem.price) * reqItem.qty;
        refundAmount += lineTotal;

        returnItems.push({
          orderItemId: orderItem.id,
          productId: orderItem.productId,
          variantId: variant?.id || null,
          name: orderItem.name,
          size: orderItem.size,
          color: orderItem.color,
          qty: reqItem.qty,
          unitPrice: Number(orderItem.price),
          unitCost: Number(orderItem.cost),
        });
      }

      const returnNumber = await this.generateReturnNumber(tx);

      const created = await tx.return.create({
        data: {
          returnNumber,
          orderId: order.id,
          channel: order.channel,
          createdById: actorId,
          shiftId: shiftId || null,
          status: 'REQUESTED',
          reason: input.reason as any,
          reasonNote: input.reasonNote || null,
          refundAmount,
          notes: input.notes || null,
          courier: input.courier || null,
          consignmentId: input.consignmentId || null,
          trackingUrl: input.trackingUrl || null,
          items: {
            create: returnItems.map((ri) => ({
              orderItemId: ri.orderItemId,
              productId: ri.productId,
              variantId: ri.variantId,
              name: ri.name,
              size: ri.size,
              color: ri.color,
              qty: ri.qty,
              unitPrice: ri.unitPrice,
              unitCost: ri.unitCost,
              condition: 'PENDING' as const,
            })),
          },
          events: {
            create: {
              status: 'REQUESTED',
              note: `Return requested: ${input.reason}`,
              actorId,
            },
          },
        },
        select: RETURN_SELECT,
      });

      // Fire-and-forget Telegram notification
      const createdItems = returnItems.map((it) => ({
        name: it.name,
        size: it.size,
        color: it.color,
        qty: it.qty,
      }));

      const totalQty = returnItems.reduce((s, it) => s + it.qty, 0);

      TelegramService.notifyNewReturn({
        returnNumber: created.returnNumber,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        channel: order.channel,
        reason: input.reason,
        reasonNote: input.reasonNote || null,
        refundAmount,
        itemsCount: totalQty,
        items: createdItems,
      }).catch((err) => {
        console.error('[Return] Telegram notification failed:', err);
      });

      return created;
    });
  }

  /**
   * Approve return (ADMIN only).
   */
  static async approve(
    id: string,
    prisma: PrismaClient,
    actorId: string,
    note?: string
  ) {
    const ret = await prisma.return.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!ret) throw new NotFoundError('Return not found');

    if (ret.status !== 'REQUESTED') {
      throw new BadRequestError(
        `Cannot approve return in status ${ret.status}`
      );
    }

    const updated = await prisma.return.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actorId,
        events: {
          create: {
            status: 'APPROVED',
            note: note || 'Return approved',
            actorId,
          },
        },
      },
      select: RETURN_SELECT,
    });

    // Telegram notify
    TelegramService.notifyReturnStatusChange({
      returnNumber: updated.returnNumber,
      orderNumber: updated.order?.orderNumber || '—',
      status: 'APPROVED',
      note: note || 'Approved by admin',
    }).catch((err) => {
      console.error('[Return] Telegram notify failed:', err);
    });

    return updated;
  }

  /**
   * Reject return (ADMIN only).
   */
  static async reject(
    id: string,
    prisma: PrismaClient,
    actorId: string,
    reason: string
  ) {
    if (!reason.trim()) {
      throw new BadRequestError('Rejection reason is required');
    }

    const ret = await prisma.return.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!ret) throw new NotFoundError('Return not found');

    if (['REFUNDED', 'COMPLETED', 'REJECTED'].includes(ret.status)) {
      throw new BadRequestError(
        `Cannot reject return in status ${ret.status}`
      );
    }

    const updated = await prisma.return.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById: actorId,
        rejectionNote: reason,
        events: {
          create: {
            status: 'REJECTED',
            note: reason,
            actorId,
          },
        },
      },
      select: RETURN_SELECT,
    });

    // Telegram notify (fire-and-forget)
    TelegramService.notifyReturnStatusChange({
      returnNumber: updated.returnNumber,
      orderNumber: updated.order?.orderNumber || '—',
      status: 'REJECTED',
      note: reason,
    }).catch((err) => {
      console.error('[Return] Telegram notify failed:', err);
    });

    return updated;
  }

  /**
   * Mark in transit (ONLINE only).
   */
  static async markInTransit(
    id: string,
    prisma: PrismaClient,
    actorId: string,
    courier?: string,
    consignmentId?: string,
    trackingUrl?: string
  ) {
    const ret = await prisma.return.findUnique({
      where: { id },
      select: { id: true, status: true, channel: true },
    });
    if (!ret) throw new NotFoundError('Return not found');

    if (ret.channel !== 'ONLINE') {
      throw new BadRequestError('Only online returns can be in transit');
    }
    if (ret.status !== 'APPROVED') {
      throw new BadRequestError(
        `Cannot mark in-transit from status ${ret.status}`
      );
    }

    return prisma.return.update({
      where: { id },
      data: {
        status: 'IN_TRANSIT',
        courier: courier || null,
        consignmentId: consignmentId || null,
        trackingUrl: trackingUrl || null,
        events: {
          create: {
            status: 'IN_TRANSIT',
            note: `Parcel in transit${consignmentId ? ` (${consignmentId})` : ''}`,
            actorId,
          },
        },
      },
      select: RETURN_SELECT,
    });
  }

  /**
   * Mark received (item arrived at shop).
   */
  static async markReceived(
    id: string,
    prisma: PrismaClient,
    actorId: string,
    note?: string
  ) {
    const ret = await prisma.return.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!ret) throw new NotFoundError('Return not found');

    const allowedFrom = ['APPROVED', 'IN_TRANSIT'];
    if (!allowedFrom.includes(ret.status)) {
      throw new BadRequestError(
        `Cannot mark received from status ${ret.status}`
      );
    }

    const updated = await prisma.return.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        events: {
          create: {
            status: 'RECEIVED',
            note: note || 'Items received at shop',
            actorId,
          },
        },
      },
      select: RETURN_SELECT,
    });

    // Telegram notify (fire-and-forget)
    TelegramService.notifyReturnStatusChange({
      returnNumber: updated.returnNumber,
      orderNumber: updated.order?.orderNumber || '—',
      status: 'RECEIVED',
      note: note || 'Items received at shop',
    }).catch((err) => {
      console.error('[Return] Telegram notify failed:', err);
    });

    return updated;
  }

  /**
   * Inspect items (ADMIN only).
   * Restores stock for items marked OK.
   */
  static async inspect(
    id: string,
    input: InspectInput,
    prisma: PrismaClient,
    actorId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const ret = await tx.return.findUnique({
        where: { id },
        select: {
          id: true,
          returnNumber: true,
          status: true,
          items: true,
        },
      });
      if (!ret) throw new NotFoundError('Return not found');

      if (ret.status !== 'RECEIVED') {
        throw new BadRequestError(
          `Can only inspect returns in RECEIVED status (current: ${ret.status})`
        );
      }

      // Update each item's condition + restore stock if OK
      for (const insp of input.items) {
        const retItem = ret.items.find((i) => i.id === insp.returnItemId);
        if (!retItem) {
          throw new BadRequestError(
            `Return item not found: ${insp.returnItemId}`
          );
        }

        await tx.returnItem.update({
          where: { id: insp.returnItemId },
          data: {
            condition: insp.condition as any,
            restocked: insp.condition === 'OK',
            restockedAt: insp.condition === 'OK' ? new Date() : null,
          },
        });

        // Restore stock only if OK
        if (insp.condition === 'OK' && retItem.variantId) {
          const variant = await tx.variant.findUnique({
            where: { id: retItem.variantId },
            select: { id: true, qty: true },
          });

          if (variant) {
            const before = variant.qty;
            const after = before + retItem.qty;

            await tx.variant.update({
              where: { id: variant.id },
              data: { qty: after },
            });

            await StockService.log(
              {
                productId: retItem.productId,
                variantId: variant.id,
                type: 'RETURN',
                qty: retItem.qty,
                before,
                after,
                reason: `Return ${ret.returnNumber} — item OK`,
                refId: id,
                actorId,
              },
              tx
            );
          }
        } else if (
          (insp.condition === 'DAMAGED' ||
            insp.condition === 'DEFECTIVE') &&
          retItem.variantId
        ) {
          // Log damage (no stock change)
          await StockService.log(
            {
              productId: retItem.productId,
              variantId: retItem.variantId,
              type: 'RETURN_DAMAGE',
              qty: 0,
              before: 0,
              after: 0,
              reason: `Return ${ret.returnNumber} — ${insp.condition.toLowerCase()}`,
              refId: id,
              actorId,
            },
            tx
          );
        }
      }

      return tx.return.update({
        where: { id },
        data: {
          status: 'INSPECTED',
          inspectedAt: new Date(),
          inspectedById: actorId,
          inspectionNote: input.inspectionNote || null,
          events: {
            create: {
              status: 'INSPECTED',
              note:
                input.inspectionNote ||
                `Inspection complete: ${input.items.length} item(s)`,
              actorId,
            },
          },
        },
        select: RETURN_SELECT,
      });
    });
  }

  /**
   * Issue refund (ADMIN only).
   */
  static async issueRefund(
    id: string,
    input: RefundInput,
    prisma: PrismaClient,
    actorId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const ret = await tx.return.findUnique({
        where: { id },
        select: {
          id: true,
          returnNumber: true,
          status: true,
          refundAmount: true,
        },
      });
      if (!ret) throw new NotFoundError('Return not found');

      if (ret.status !== 'INSPECTED') {
        throw new BadRequestError(
          `Can only refund returns in INSPECTED status (current: ${ret.status})`
        );
      }

      const updated = await tx.return.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          refundMethod: input.refundMethod as any,
          refundTxId: input.refundTxId || null,
          refundedAt: new Date(),
          refundedById: actorId,
          adminNote: input.adminNote || null,
          events: {
            create: {
              status: 'COMPLETED',
              note: `Refund issued: ${input.refundMethod}${
                input.refundTxId ? ` (${input.refundTxId})` : ''
              }`,
              actorId,
            },
          },
        },
        select: RETURN_SELECT,
      });

      // Telegram notify (fire-and-forget)
      TelegramService.notifyReturnStatusChange({
        returnNumber: updated.returnNumber,
        orderNumber: updated.order?.orderNumber || '—',
        status: 'COMPLETED',
        note: `Refund issued: ${input.refundMethod}${
          input.refundTxId ? ` (${input.refundTxId})` : ''
        }`,
      }).catch((err) => {
        console.error('[Return] Telegram notify failed:', err);
      });

      return updated;
    });
  }
}