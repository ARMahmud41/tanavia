import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Cash-Out Approval + Account Service
// ============================================
export class CashOutService {
  // ============================================
  // STAFF creates cash-out request (PENDING)
  // ============================================
  static async create(
    input: { amount: number; description: string; category?: string },
    prisma: PrismaClient,
    actorId?: string
  ) {
    const amount = Number(input.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }
    if (amount > 1000) {
      throw new BadRequestError('Cash-out cannot exceed ৳1,000');
    }
    if (!input.description?.trim()) {
      throw new BadRequestError('Description is required');
    }

    const expense = await prisma.expense.create({
      data: {
        category: (input.category as any) || 'SHOP_SUPPLIES',
        amount,
        description: input.description.trim(),
        status: 'PENDING',
        paidFrom: 'CASH',
        createdBy: actorId || null,
      },
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CASH_OUT_REQUEST',
          detail: `Requested ৳${amount}: ${input.description}`,
        },
      });
    }

    return expense;
  }

  // ============================================
  // ADMIN approves cash-out (PENDING → POSTED)
  // ============================================
  static async approve(
    id: string,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError('Cash-out not found');
    if (expense.status !== 'PENDING') {
      throw new ConflictError(
        `Cannot approve — current status is ${expense.status}`
      );
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: 'POSTED',
        approvedBy: actorId || null,
        approvedAt: new Date(),
      },
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CASH_OUT_APPROVE',
          detail: `Approved ৳${expense.amount}: ${expense.description}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // ADMIN rejects cash-out (PENDING → REJECTED)
  // ============================================
  static async reject(
    id: string,
    reason: string,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!reason?.trim()) {
      throw new BadRequestError('Reason is required');
    }

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError('Cash-out not found');
    if (expense.status !== 'PENDING') {
      throw new ConflictError(
        `Cannot reject — current status is ${expense.status}`
      );
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: actorId || null,
        rejectedAt: new Date(),
        reason: reason.trim(),
      },
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CASH_OUT_REJECT',
          detail: `Rejected ৳${expense.amount}: ${reason}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // List pending cash-outs (for admin inbox)
  // ============================================
  static async listPending(prisma: PrismaClient) {
    const items = await prisma.expense.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    // Attach user names
    const userIds = [...new Set(items.map((i) => i.createdBy).filter(Boolean))];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds as string[] } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return items.map((i) => ({
      ...i,
      user: i.createdBy ? userMap[i.createdBy] || null : null,
    }));
  }

  // ============================================
  // Expense reversal (append-only ledger)
  // ============================================
  static async reverse(
    expenseId: string,
    reason: string,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!reason?.trim()) {
      throw new BadRequestError('Reason is required');
    }

    const original = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!original) throw new NotFoundError('Expense not found');
    if (original.status === 'REVERSED') {
      throw new ConflictError('Expense is already reversed');
    }
    if (original.status !== 'POSTED') {
      throw new ConflictError('Only POSTED expenses can be reversed');
    }

    const result = await prisma.$transaction(async (tx) => {
      const original2 = await tx.expense.update({
        where: { id: expenseId },
        data: { status: 'REVERSED' },
      });

      const reversal = await tx.expense.create({
        data: {
          category: original2.category,
          amount: original2.amount,
          description: `REVERSAL: ${original2.description}`,
          status: 'POSTED',
          paidFrom: original2.paidFrom,
          reason: reason.trim(),
          reversesId: original2.id,
          createdBy: actorId || null,
        },
      });

      return { original: original2, reversal };
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'EXPENSE_REVERSE',
          detail: `Reversed ৳${original.amount}: ${reason}`,
        },
      });
    }

    return result;
  }

  // ============================================
  // STAFF: My shift data
  // ============================================
  static async myShift(userId: string, prisma: PrismaClient) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales (this user)
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        confirmedBy: userId,
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, customerName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sales = todayTransactions.filter((t) => t.status === 'COMPLETED');
    const refunds = todayTransactions.filter((t) => t.type === 'REFUND');

    const todayTotal = sales.reduce((s, t) => s + Number(t.amount), 0);
    const refundsTotal = refunds.reduce((s, t) => s + Number(t.amount), 0);

    // Current cash drawer
    const drawer = await prisma.cashDrawer.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    // Sales by payment method
    const byMethod: Record<string, number> = {};
    for (const t of sales) {
      const method = (t.method || 'CASH').toUpperCase();
      byMethod[method] = (byMethod[method] || 0) + Number(t.amount);
    }

    // My cash-out pending
    const myPendingCashOuts = await prisma.expense.findMany({
      where: {
        createdBy: userId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      todaySales: {
        count: sales.length,
        total: todayTotal,
      },
      totalSales: todayTotal,
      refundsIGave: refundsTotal,
      openingAmount: drawer ? Number(drawer.openingAmount) : 0,
      cashIShouldHave: drawer
        ? Number(drawer.openingAmount) + todayTotal - refundsTotal
        : 0,
      salesByPaymentMethod: byMethod,
      pendingCashOuts: myPendingCashOuts,
    };
  }

  // ============================================
  // ADMIN: Where the money is (account balances)
  // ============================================
  static async accounts(prisma: PrismaClient) {
    // Total POSTED expenses by account (money OUT)
    const expensesByAccount = await prisma.expense.groupBy({
      by: ['paidFrom'],
      where: { status: 'POSTED' },
      _sum: { amount: true },
    });

    // Total sales by method (money IN)
    const salesByMethod = await prisma.transaction.groupBy({
      by: ['method'],
      where: { status: 'COMPLETED', type: { in: ['ONLINE_PAYMENT', 'OFFLINE_CASH', 'COD_RECEIVED'] } },
      _sum: { amount: true },
    });

    // COD held with couriers
    const codHeld = await prisma.order.aggregate({
      where: {
        paymentMethod: 'COD',
        paymentStatus: 'WAITING',
        status: { in: ['CONFIRMED', 'PACKED', 'SHIPPED'] },
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const accountsMap: Record<string, number> = {
      CASH: 0,
      BKASH: 0,
      NAGAD: 0,
      BANK: 0,
    };

    // Money IN
    for (const s of salesByMethod) {
      const method = (s.method || 'CASH').toUpperCase();
      if (method in accountsMap) {
        accountsMap[method] += Number(s._sum.amount || 0);
      }
    }

    // Money OUT
    for (const e of expensesByAccount) {
      const account = (e.paidFrom || 'CASH').toUpperCase();
      if (account in accountsMap) {
        accountsMap[account] -= Number(e._sum.amount || 0);
      }
    }

    return {
      cash: Math.max(0, accountsMap.CASH),
      bkash: Math.max(0, accountsMap.BKASH),
      nagad: Math.max(0, accountsMap.NAGAD),
      bank: Math.max(0, accountsMap.BANK),
      withCouriers: Number(codHeld._sum.total || 0),
      withCouriersCount: codHeld._count.id,
    };
  }
}