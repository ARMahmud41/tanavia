import type { PrismaClient } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Settlement Service
// ============================================
export class SettlementService {
  // ============================================
  // List settlements
  // ============================================
  static async list(
    filters: { courierId?: string; status?: string } = {},
    prisma: PrismaClient
  ) {
    const where: any = {};
    if (filters.courierId) where.courierId = filters.courierId;
    if (filters.status) where.status = filters.status;

    return prisma.courierSettlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        courier: {
          select: { id: true, name: true, slug: true, logo: true },
        },
        _count: { select: { orders: true } },
      },
    });
  }

  // ============================================
  // Stats
  // ============================================
  static async stats(prisma: PrismaClient) {
    const [pending, completed, totalPending, totalCompleted] = await Promise.all([
      prisma.courierSettlement.count({ where: { status: 'PENDING' } }),
      prisma.courierSettlement.count({ where: { status: 'COMPLETED' } }),
      prisma.courierSettlement.aggregate({
        where: { status: 'PENDING' },
        _sum: { netPayout: true },
      }),
      prisma.courierSettlement.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { netPayout: true },
      }),
    ]);

    return {
      pendingCount: pending,
      completedCount: completed,
      pendingAmount: Number(totalPending._sum.netPayout || 0),
      completedAmount: Number(totalCompleted._sum.netPayout || 0),
    };
  }

  // ============================================
  // Get by ID
  // ============================================
  static async getById(id: string, prisma: PrismaClient) {
    const s = await prisma.courierSettlement.findUnique({
      where: { id },
      include: {
        courier: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            district: true,
            total: true,
            codAmount: true,
            deliveredAt: true,
            courierDeliveredAt: true,
            status: true,
          },
        },
      },
    });
    if (!s) throw new NotFoundError('Settlement not found');
    return s;
  }

  // ============================================
  // Generate settlement from period
  // ============================================
  static async generate(
    input: {
      courierId: string;
      periodFrom: string;
      periodTo: string;
    },
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.courierId) throw new BadRequestError('Courier required');

    const courier = await prisma.courier.findUnique({
      where: { id: input.courierId },
      select: {
        id: true,
        name: true,
        codFeePercent: true,
        codFeeFixed: true,
      },
    });
    if (!courier) throw new NotFoundError('Courier not found');

    const from = new Date(input.periodFrom);
    const to = new Date(input.periodTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestError('Invalid date range');
    }
    if (from >= to) throw new BadRequestError('Invalid period');

    // Check overlapping settlement
    const overlap = await prisma.courierSettlement.findFirst({
      where: {
        courierId: courier.id,
        status: { not: 'COMPLETED' },
        OR: [
          { periodFrom: { lte: to }, periodTo: { gte: from } },
        ],
      },
    });
    if (overlap) {
      throw new ConflictError(
        `Overlaps with existing settlement ${overlap.settlementNo}`
      );
    }

    // Find delivered COD orders in period not yet settled
    const orders = await prisma.order.findMany({
      where: {
        courierId: courier.id,
        paymentMethod: 'COD',
        status: 'DELIVERED',
        settlementId: null,
        courierDeliveredAt: { gte: from, lte: to },
      },
      select: {
        id: true,
        total: true,
        codAmount: true,
        district: true,
      },
    });

    if (orders.length === 0) {
      throw new BadRequestError('No unsettled COD orders in this period');
    }

    // Calculate
    const grossCOD = orders.reduce(
      (s, o) => s + Number(o.codAmount || o.total),
      0
    );

    // Delivery fees from rates
    let deliveryFees = 0;
    for (const o of orders) {
      const rate = await prisma.courierRate.findFirst({
        where: {
          courierId: courier.id,
          district: o.district || 'Dhaka',
          active: true,
        },
      });
      if (rate) deliveryFees += Number(rate.deliveryFee);
    }

    // COD fee = % of gross + fixed per order
    const codFeePercent = Number(courier.codFeePercent) / 100;
    const codFees =
      grossCOD * codFeePercent +
      Number(courier.codFeeFixed) * orders.length;

    // Return fees in period
    const returns = await prisma.courierReturn.findMany({
      where: {
        courierId: courier.id,
        createdAt: { gte: from, lte: to },
      },
      select: { outboundFee: true, returnFee: true },
    });
    const returnFees = returns.reduce(
      (s, r) => s + Number(r.outboundFee) + Number(r.returnFee),
      0
    );

    const netPayout = grossCOD - deliveryFees - codFees - returnFees;

    // Generate settlement number
    const count = await prisma.courierSettlement.count();
    const settlementNo = `SETL-${String(count + 1).padStart(4, '0')}`;

    // Create settlement + link orders
    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.courierSettlement.create({
        data: {
          settlementNo,
          courierId: courier.id,
          periodFrom: from,
          periodTo: to,
          grossCOD,
          deliveryFees,
          codFees,
          returnFees,
          otherDeductions: 0,
          netPayout,
          status: 'PENDING',
        },
      });

      await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { settlementId: s.id },
      });

      return s;
    });

    // Audit
    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'SETTLEMENT_CREATE',
          detail: `${settlementNo} for ${courier.name}: ৳${netPayout}`,
        },
      });
    }

    return settlement;
  }

  // ============================================
  // Mark paid
  // ============================================
  static async markPaid(
    id: string,
    input: { reference?: string; notes?: string },
    prisma: PrismaClient,
    actorId?: string
  ) {
    const s = await prisma.courierSettlement.findUnique({
      where: { id },
    });
    if (!s) throw new NotFoundError('Settlement not found');
    if (s.status === 'COMPLETED') {
      throw new ConflictError('Already marked paid');
    }

    const updated = await prisma.courierSettlement.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        paidBy: actorId || null,
        reference: input.reference || null,
        notes: input.notes || null,
      },
    });

    // Update related orders
    await prisma.order.updateMany({
      where: { settlementId: s.id },
      data: { codSettledAt: new Date() },
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'SETTLEMENT_PAID',
          detail: `${s.settlementNo} marked paid`,
        },
      });
    }

    return updated;
  }
}