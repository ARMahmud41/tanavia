import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/require-role.js';
import { DashboardService } from '../services/dashboard.service.js';

export async function dashboardRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/admin/dashboard/stats — existing
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const data = await DashboardService.stats(app.prisma);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/admin/dashboard/analytics — custom date range
  // ============================================
  app.get(
    '/analytics',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as {
        from?: string;
        to?: string;
        period?: string;
      };

      let from: Date;
      let to: Date = new Date();

      if (q.from && q.to) {
        from = new Date(q.from);
        to = new Date(q.to);
        to.setHours(23, 59, 59, 999);
      } else {
        const days = q.period === '1d' ? 1 : q.period === '30d' ? 30 : 7;
        from = new Date();
        from.setDate(from.getDate() - days);
      }

      // Orders in date range
      const orders = await app.prisma.order.findMany({
        where: {
          createdAt: { gte: from, lte: to },
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          total: true,
          status: true,
          paymentMethod: true,
          channel: true,
          createdAt: true,
          items: {
            select: {
              price: true,
              cost: true,
              qty: true,
            },
          },
        },
      });

      // Aggregate by day
      const byDay: Record<
        string,
        { revenue: number; profit: number; orders: number }
      > = {};

      for (const order of orders) {
        const day = order.createdAt.toISOString().split('T')[0];
        if (!byDay[day]) byDay[day] = { revenue: 0, profit: 0, orders: 0 };

        byDay[day].revenue += Number(order.total);
        byDay[day].orders += 1;

        for (const item of order.items) {
          byDay[day].profit +=
            (Number(item.price) - Number(item.cost || 0)) * item.qty;
        }
      }

      // Totals
      let totalRevenue = 0;
      let totalProfit = 0;
      let totalOrders = 0;
      let totalItems = 0;

      for (const order of orders) {
        totalRevenue += Number(order.total);
        totalOrders += 1;
        for (const item of order.items) {
          totalProfit +=
            (Number(item.price) - Number(item.cost || 0)) * item.qty;
          totalItems += item.qty;
        }
      }

      // Payment breakdown
      const paymentBreakdown: Record<string, number> = {};
      for (const order of orders) {
        paymentBreakdown[order.paymentMethod] =
          (paymentBreakdown[order.paymentMethod] || 0) + Number(order.total);
      }

      // Channel breakdown
      const channelBreakdown: Record<string, number> = {
        ONLINE: 0,
        OFFLINE: 0,
      };
      for (const order of orders) {
        channelBreakdown[order.channel] =
          (channelBreakdown[order.channel] || 0) + Number(order.total);
      }

      // Daily trend (sorted)
      const dailyTrend = Object.entries(byDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return reply.send({
        success: true,
        data: {
          range: { from, to },
          totals: {
            revenue: totalRevenue,
            profit: totalProfit,
            orders: totalOrders,
            items: totalItems,
            avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          },
          dailyTrend,
          paymentBreakdown,
          channelBreakdown,
        },
      });
    }
  );
}