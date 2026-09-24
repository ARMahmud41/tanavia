import type { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

interface DateRange {
  from?: string;
  to?: string;
}

interface AddExpenseInput {
  category:
    | 'RENT'
    | 'UTILITIES'
    | 'SALARY'
    | 'PACKAGING'
    | 'MARKETING'
    | 'TRANSPORT'
    | 'OTHER';
  amount: number;
  description: string;
  receiptUrl?: string;
  spentAt?: string;
}

interface OpenDrawerInput {
  openingAmount: number;
  note?: string;
}

interface CloseDrawerInput {
  closingAmount: number;
  note?: string;
}

export class FinanceService {
  /**
   * Build a Prisma DateTimeFilter from from/to strings.
   */
  private static buildDateFilter(range: DateRange): Prisma.DateTimeFilter | undefined {
    if (!range.from && !range.to) return undefined;
    const filter: Prisma.DateTimeFilter = {};
    if (range.from) filter.gte = new Date(range.from);
    if (range.to) {
      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);
      filter.lte = to;
    }
    return filter;
  }

  /**
   * Compute revenue, cost, profit for a list of orders.
   */
  private static computeOrderStats(
    orders: Array<{
      channel: string;
      subtotal: unknown;
      discount: unknown;
      deliveryFee: unknown;
      total: unknown;
      items: Array<{ price: unknown; cost: unknown; qty: number }>;
    }>
  ) {
    let revenue = 0;
    let costOfGoods = 0;
    let discountGiven = 0;
    let deliveryCollected = 0;
    let itemsSold = 0;

    for (const order of orders) {
      const subtotal = Number(order.subtotal || 0);
      const discount = Number(order.discount || 0);
      const delivery = Number(order.deliveryFee || 0);

      revenue += subtotal - discount;
      discountGiven += discount;
      deliveryCollected += delivery;

      for (const item of order.items) {
        costOfGoods += Number(item.cost || 0) * item.qty;
        itemsSold += item.qty;
      }
    }

    const grossProfit = revenue - costOfGoods;

    return {
      revenue,
      costOfGoods,
      grossProfit,
      discountGiven,
      deliveryCollected,
      itemsSold,
      ordersCount: orders.length,
      margin:
        revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
    };
  }

  /**
   * Get a finance summary for a date range (online vs offline).
   */
  static async getSummary(range: DateRange, prisma: PrismaClient) {
    const dateFilter = this.buildDateFilter(range);

    const where: Prisma.OrderWhereInput = {
      status: { in: ['DELIVERED', 'SHIPPED', 'PACKED', 'CONFIRMED'] },
    };
    if (dateFilter) where.createdAt = dateFilter;

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        channel: true,
        status: true,
        subtotal: true,
        discount: true,
        deliveryFee: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        items: {
          select: {
            price: true,
            cost: true,
            qty: true,
          },
        },
      },
    });

    const online = orders.filter((o) => o.channel === 'ONLINE');
    const offline = orders.filter((o) => o.channel === 'OFFLINE');

    const onlineStats = this.computeOrderStats(online);
    const offlineStats = this.computeOrderStats(offline);
    const totalStats = this.computeOrderStats(orders);

    // Payment method breakdown
    const byPaymentMethod: Record<string, number> = {};
    for (const order of orders) {
      const amount = Number(order.subtotal || 0) - Number(order.discount || 0);
      byPaymentMethod[order.paymentMethod] =
        (byPaymentMethod[order.paymentMethod] || 0) + amount;
    }

    // Pending COD (waiting for delivery)
    const pendingCOD = await prisma.order.aggregate({
      where: {
        paymentMethod: 'COD',
        paymentStatus: 'WAITING',
        status: { in: ['CONFIRMED', 'PACKED', 'SHIPPED'] },
      },
      _sum: { total: true },
      _count: { id: true },
    });

    return {
      range: {
        from: range.from || null,
        to: range.to || null,
      },
      online: onlineStats,
      offline: offlineStats,
      total: totalStats,
      byPaymentMethod,
      pendingCOD: {
        amount: Number(pendingCOD._sum.total || 0),
        count: pendingCOD._count.id,
      },
    };
  }

  /**
   * List transactions (COD / payment records).
   */
  static async listTransactions(
    filters: {
      type?: string;
      status?: string;
      orderId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};
    if (filters.type) where.type = filters.type as any;
    if (filters.status) where.status = filters.status as any;
    if (filters.orderId) where.orderId = filters.orderId;

    const dateFilter = this.buildDateFilter({
      from: filters.from,
      to: filters.to,
    });
    if (dateFilter) where.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              channel: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
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
   * Add an expense.
   */
  static async addExpense(
    input: AddExpenseInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.amount || input.amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }
    if (!input.description || input.description.trim().length < 3) {
      throw new BadRequestError('Description is required');
    }

    const expense = await prisma.expense.create({
      data: {
        category: input.category,
        amount: input.amount,
        description: input.description.trim(),
        receiptUrl: input.receiptUrl,
        spentAt: input.spentAt ? new Date(input.spentAt) : new Date(),
        createdBy: actorId,
      },
    });

    return expense;
  }

  /**
   * List expenses with filters.
   */
  static async listExpenses(
    filters: {
      category?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};
    if (filters.category) where.category = filters.category as any;

    const dateFilter = this.buildDateFilter({
      from: filters.from,
      to: filters.to,
    });
    if (dateFilter) where.spentAt = dateFilter;

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { spentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
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
   * Get expense summary grouped by category.
   */
  static async getExpenseSummary(range: DateRange, prisma: PrismaClient) {
    const dateFilter = this.buildDateFilter(range);

    const where: Prisma.ExpenseWhereInput = {};
    if (dateFilter) where.spentAt = dateFilter;

    const grouped = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    const byCategory = grouped.map((g) => ({
      category: g.category,
      total: Number(g._sum.amount || 0),
      count: g._count.id,
    }));

    const grandTotal = byCategory.reduce((sum, c) => sum + c.total, 0);

    return {
      range: { from: range.from || null, to: range.to || null },
      byCategory,
      grandTotal,
    };
  }

  /**
   * Delete an expense (admin only).
   */
  static async deleteExpense(id: string, prisma: PrismaClient) {
    const existing = await prisma.expense.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundError('Expense not found');

    await prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }

  // ============================================
  // CASH DRAWER
  // ============================================

  /**
   * Open a cash drawer for the day.
   */
  static async openCashDrawer(
    userId: string,
    input: OpenDrawerInput,
    prisma: PrismaClient
  ) {
    if (typeof input.openingAmount !== 'number' || input.openingAmount < 0) {
      throw new BadRequestError('openingAmount must be a non-negative number');
    }

    const existing = await prisma.cashDrawer.findFirst({
      where: { userId, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestError(
        'You already have an open cash drawer. Close it first.'
      );
    }

    const drawer = await prisma.cashDrawer.create({
      data: {
        userId,
        status: 'OPEN',
        openingAmount: input.openingAmount,
        note: input.note,
      },
    });

    return drawer;
  }

  /**
   * Close the currently open cash drawer.
   * Computes expected = openingAmount + CASH sales during this drawer session.
   */
  static async closeCashDrawer(
    userId: string,
    input: CloseDrawerInput,
    prisma: PrismaClient
  ) {
    if (typeof input.closingAmount !== 'number' || input.closingAmount < 0) {
      throw new BadRequestError('closingAmount must be a non-negative number');
    }

    const drawer = await prisma.cashDrawer.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    if (!drawer) throw new NotFoundError('No open cash drawer found');

    // Sum CASH sales during the drawer window
    const cashOrders = await prisma.order.aggregate({
      where: {
        channel: 'OFFLINE',
        paymentMethod: 'CASH',
        status: { in: ['DELIVERED', 'CONFIRMED', 'PACKED'] },
        createdAt: { gte: drawer.openedAt },
      },
      _sum: { total: true },
    });

    const cashSales = Number(cashOrders._sum.total || 0);
    const expectedCash = Number(drawer.openingAmount) + cashSales;
    const difference = input.closingAmount - expectedCash;

    const updated = await prisma.cashDrawer.update({
      where: { id: drawer.id },
      data: {
        status: 'CLOSED',
        closingAmount: input.closingAmount,
        expectedCash,
        difference,
        closedAt: new Date(),
        note: input.note || drawer.note,
      },
    });

    return {
      ...updated,
      cashSales,
    };
  }

  /**
   * Get the currently open cash drawer for a user.
   */
  static async currentCashDrawer(userId: string, prisma: PrismaClient) {
    const drawer = await prisma.cashDrawer.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    return drawer;
  }

  /**
   * List cash drawer history (admin).
   */
  static async listCashDrawers(
    filters: {
      userId?: string;
      status?: 'OPEN' | 'CLOSED';
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CashDrawerWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;

    const dateFilter = this.buildDateFilter({
      from: filters.from,
      to: filters.to,
    });
    if (dateFilter) where.openedAt = dateFilter;

    const [items, total] = await Promise.all([
      prisma.cashDrawer.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.cashDrawer.count({ where }),
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
}