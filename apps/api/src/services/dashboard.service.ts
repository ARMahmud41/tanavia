import type { PrismaClient } from '@prisma/client';

export class DashboardService {
  static async stats(prisma: PrismaClient) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const twoWeeksAgo = new Date(todayStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);

    // ============================================
    // KPI: Today vs Yesterday
    // ============================================
    const [todayOrders, yesterdayOrders] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: todayStart } },
        select: {
          id: true,
          total: true,
          status: true,
          paymentStatus: true,
          items: { select: { cost: true, qty: true } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
        select: {
          total: true,
          items: { select: { cost: true, qty: true } },
        },
      }),
    ]);

    function sumRevenue(orders: any[]) {
      return orders.reduce((s, o) => s + Number(o.total), 0);
    }
    function sumProfit(orders: any[]) {
      return orders.reduce((s, o) => {
        const cost = o.items.reduce(
          (c: number, it: any) => c + Number(it.cost) * it.qty,
          0
        );
        return s + (Number(o.total) - cost);
      }, 0);
    }

    const salesToday = sumRevenue(todayOrders);
    const salesYesterday = sumRevenue(yesterdayOrders);
    const profitToday = sumProfit(todayOrders);
    const profitYesterday = sumProfit(yesterdayOrders);
    const ordersToday = todayOrders.length;
    const ordersYesterday = yesterdayOrders.length;

    function pctChange(cur: number, prev: number): number {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    }

    // ============================================
    // Status + Counts
    // ============================================
    const statusGroups = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const statusBreakdown: Record<string, number> = {};
    statusGroups.forEach((g) => {
      statusBreakdown[g.status] = g._count.id;
    });

    const [totalOrders, waitingConfirmation, customersTotal, customersToday] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PLACED' } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.user.count({
          where: { role: 'CUSTOMER', createdAt: { gte: todayStart } },
        }),
      ]);

    // ============================================
    // Revenue last 7 days
    // ============================================
    const weekOrders = await prisma.order.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: {
        createdAt: true,
        total: true,
        items: { select: { cost: true, qty: true } },
      },
    });

    const days: Array<{
      date: string;
      label: string;
      revenue: number;
      profit: number;
      orders: number;
    }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const dayOrders = weekOrders.filter(
        (o) => o.createdAt >= d && o.createdAt < next
      );
      const revenue = dayOrders.reduce((s, o) => s + Number(o.total), 0);
      const profit = dayOrders.reduce((s, o) => {
        const cost = o.items.reduce(
          (c: number, it: any) => c + Number(it.cost) * it.qty,
          0
        );
        return s + (Number(o.total) - cost);
      }, 0);

      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue,
        profit,
        orders: dayOrders.length,
      });
    }

    // ============================================
    // Recent orders (5)
    // ============================================
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        paymentStatus: true,
        channel: true,
        createdAt: true,
      },
    });

    // ============================================
    // Top selling products
    // ============================================
    const topProducts = await prisma.product.findMany({
      take: 5,
      where: { soldCount: { gt: 0 } },
      orderBy: { soldCount: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        soldCount: true,
        price: true,
        productImages: {
          take: 1,
          where: { isPrimary: true },
          select: { url: true },
        },
      },
    });

    // ============================================
    // Low stock
    // ============================================
    const lowStockItems = await prisma.variant.findMany({
      where: { qty: { lte: 5 }, product: { active: true } },
      take: 5,
      orderBy: { qty: 'asc' },
      select: {
        id: true,
        size: true,
        color: true,
        qty: true,
        reorderLevel: true,
        product: { select: { id: true, name: true, slug: true } },
      },
    });

    const lowStockCount = await prisma.variant.count({
      where: { qty: { lte: 5 }, product: { active: true } },
    });

    // ============================================
    // Payment methods
    // ============================================
    const paymentGroups = await prisma.order.groupBy({
      by: ['paymentMethod'],
      _count: { id: true },
      _sum: { total: true },
    });
    const paymentBreakdown = paymentGroups.map((g) => ({
      method: g.paymentMethod,
      count: g._count.id,
      amount: Number(g._sum.total || 0),
    }));

    // ============================================
    // ANALYTICS: Week-over-week
    // ============================================
    const [thisWeekOrders, lastWeekOrders] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { total: true, items: { select: { cost: true, qty: true } } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
        select: { total: true, items: { select: { cost: true, qty: true } } },
      }),
    ]);

    const thisWeekRevenue = thisWeekOrders.reduce(
      (s, o) => s + Number(o.total),
      0
    );
    const lastWeekRevenue = lastWeekOrders.reduce(
      (s, o) => s + Number(o.total),
      0
    );
    const weekGrowth =
      lastWeekRevenue === 0
        ? thisWeekRevenue > 0
          ? 100
          : 0
        : Math.round(
            ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
          );

    // ============================================
    // ANALYTICS: Category performance
    // ============================================
    const categoryItems = await prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: weekAgo } } },
      select: {
        qty: true,
        price: true,
        cost: true,
        product: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const categoryMap: Record<
      string,
      { name: string; revenue: number; profit: number; qty: number }
    > = {};
    for (const item of categoryItems) {
      const cat = item.product?.category;
      const key = cat?.slug || 'uncategorized';
      if (!categoryMap[key]) {
        categoryMap[key] = {
          name: cat?.name || 'Uncategorized',
          revenue: 0,
          profit: 0,
          qty: 0,
        };
      }
      const rev = Number(item.price) * item.qty;
      const cost = Number(item.cost) * item.qty;
      categoryMap[key].revenue += rev;
      categoryMap[key].profit += rev - cost;
      categoryMap[key].qty += item.qty;
    }

    const categoryPerformance = Object.entries(categoryMap)
      .map(([slug, data]) => ({ slug, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // ============================================
    // ANALYTICS: Product performance
    // ============================================
    const productPerf = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: weekAgo } } },
      _sum: { qty: true, price: true, cost: true },
    });

    const productIds = productPerf.map((p) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, slug: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const productPerformance = productPerf
      .map((p) => {
        const rev = Number(p._sum.price || 0) * (p._sum.qty || 1) / (p._sum.qty || 1);
        // simpler: sum price already includes multiplication? Use qty × avg
        // Fallback: use raw sum
        const rawRev = Number(p._sum.price || 0);
        const rawCost = Number(p._sum.cost || 0);
        return {
          id: p.productId,
          name: productMap[p.productId]?.name || 'Unknown',
          slug: productMap[p.productId]?.slug || '',
          revenue: rawRev,
          profit: rawRev - rawCost,
          qty: p._sum.qty || 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const bestProduct = productPerformance[0] || null;
    const worstProduct =
      productPerformance.length > 1
        ? productPerformance[productPerformance.length - 1]
        : null;

    // ============================================
    // ANALYTICS: Hourly sales
    // ============================================
    const hourlyOrders = await prisma.order.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { createdAt: true, total: true },
    });

    const hourlyData: Array<{
      hour: number;
      label: string;
      revenue: number;
      orders: number;
    }> = [];
    for (let h = 0; h < 24; h++) {
      hourlyData.push({
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
        revenue: 0,
        orders: 0,
      });
    }
    for (const o of hourlyOrders) {
      const h = new Date(o.createdAt).getHours();
      hourlyData[h].revenue += Number(o.total);
      hourlyData[h].orders += 1;
    }

    const peakHour = hourlyData.reduce(
      (max, h) => (h.revenue > max.revenue ? h : max),
      hourlyData[0]
    );

    // ============================================
    // ANALYTICS: Forecast + Returns
    // ============================================
    const avgDailyRevenue = thisWeekRevenue / 7;
    const forecastMonthly = Math.round(avgDailyRevenue * 30);

    const [returnCount, deliveredCount] = await Promise.all([
      prisma.return.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.order.count({
        where: { createdAt: { gte: weekAgo }, status: 'DELIVERED' },
      }),
    ]);
    const returnRate =
      deliveredCount > 0
        ? Math.round((returnCount / deliveredCount) * 1000) / 10
        : 0;

    // ============================================
    // RETURN
    // ============================================
    return {
      kpis: {
        salesToday,
        salesYesterday,
        salesChange: pctChange(salesToday, salesYesterday),
        profitToday,
        profitYesterday,
        profitChange: pctChange(profitToday, profitYesterday),
        ordersToday,
        ordersYesterday,
        ordersChange: pctChange(ordersToday, ordersYesterday),
        totalOrders,
        waitingConfirmation,
        customersTotal,
        customersToday,
        lowStockCount,
      },
      revenue7d: days,
      recentOrders,
      topProducts: topProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        soldCount: p.soldCount,
        price: Number(p.price),
        image: p.productImages[0]?.url || null,
      })),
      lowStockItems,
      statusBreakdown,
      paymentBreakdown,
      analytics: {
        weekGrowth,
        thisWeekRevenue,
        lastWeekRevenue,
        categoryPerformance,
        bestProduct,
        worstProduct,
        topProducts: productPerformance.slice(0, 5),
        hourlyData,
        peakHour: {
          hour: peakHour.hour,
          label: peakHour.label,
          revenue: peakHour.revenue,
          orders: peakHour.orders,
        },
        forecastMonthly,
        avgDailyRevenue: Math.round(avgDailyRevenue),
        returnRate,
        returnCount,
      },
    };
  }
}