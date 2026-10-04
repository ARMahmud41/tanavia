import type { FastifyInstance } from 'fastify';
import { OrderService } from '../services/order.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import { PlaceOrderSchema } from '@tanavia/shared';

export async function orderRoutes(app: FastifyInstance) {
  // ============================================
  // POST /api/orders — public: place online order
  // ============================================
  app.post(
    '/',
    {
      preHandler: [validate(PlaceOrderSchema, 'body')],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 hour',
        },
      },
    },
    async (req, reply) => {
      const input = req.body as any;

      const order = await OrderService.placeOnlineOrder(input, app.prisma);

      return reply.code(201).send({
        success: true,
        data: order,
      });
    }
  );

  // ============================================
  // POST /api/orders/offline — staff: POS sale
  // ============================================
  app.post(
    '/offline',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const input = req.body as any;

      const order = await OrderService.placeOfflineOrder(
        input,
        app.prisma,
        req.user.sub
      );

      return reply.code(201).send({
        success: true,
        data: order,
      });
    }
  );

  // ============================================
  // GET /api/orders/track/:orderNumber — public
  // ============================================
  app.get('/track/:orderNumber', async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string };

    const order = await OrderService.getByOrderNumber(
      orderNumber.toUpperCase(),
      app.prisma
    );

    return reply.send({
      success: true,
      data: order,
    });
  });

  // ============================================
  // GET /api/orders/my — customer's orders
  // ============================================
  app.get(
    '/my',
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const query = req.query as { page?: string; limit?: string };
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;

      const result = await OrderService.getMyOrders(
        req.user.sub,
        app.prisma,
        page,
        limit
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/orders — list with filters (role-aware)
  // ============================================
  app.get(
    '/',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const user = req.user as any;

      const result = await OrderService.list(
        {
          status: q.status,
          channel: q.channel as any,
          paymentStatus: q.paymentStatus,
          paymentMethod: q.paymentMethod,
          search: q.q,
          from: q.from,
          to: q.to,
          sort: q.sort as any,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 25,
          role: user.role,
          userId: user.sub,
        },
        app.prisma
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/orders/counts — channel counts for segmented control
  // ============================================
  app.get(
    '/counts',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const user = req.user as any;
      const isAdmin = user.role === 'ADMIN';
      const q = req.query as Record<string, string | undefined>;

      // Build base where from query (excluding channel)
      const baseWhere: any = {};
      if (q.status) baseWhere.status = q.status;
      if (q.paymentStatus) baseWhere.paymentStatus = q.paymentStatus;
      if (q.paymentMethod) baseWhere.paymentMethod = q.paymentMethod;
      if (q.q) {
        baseWhere.OR = [
          { orderNumber: { contains: q.q, mode: 'insensitive' } },
          { customerName: { contains: q.q, mode: 'insensitive' } },
          { customerPhone: { contains: q.q, mode: 'insensitive' } },
        ];
      }
      if (q.from || q.to) {
        baseWhere.createdAt = {};
        if (q.from) baseWhere.createdAt.gte = new Date(q.from);
        if (q.to) {
          const to = new Date(q.to);
          to.setHours(23, 59, 59, 999);
          baseWhere.createdAt.lte = to;
        }
      }

      const [all, online, offline] = await Promise.all([
        isAdmin
          ? app.prisma.order.count({ where: { ...baseWhere } })
          : app.prisma.order.count({
              where: { ...baseWhere, channel: 'OFFLINE', createdById: user.sub },
            }),
        app.prisma.order.count({
          where: { ...baseWhere, channel: 'ONLINE' },
        }),
        app.prisma.order.count({
          where: isAdmin
            ? { ...baseWhere, channel: 'OFFLINE' }
            : { ...baseWhere, channel: 'OFFLINE', createdById: user.sub },
        }),
      ]);

      return reply.send({
        success: true,
        data: { all, online, offline },
      });
    }
  );

  // ============================================
  // GET /api/orders/stats — dashboard stats
  // ============================================
  app.get(
    '/stats',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [todayOrders, needsAction, todayRevenue, codToCollect] =
        await Promise.all([
          // Today's order count
          app.prisma.order.count({
            where: { createdAt: { gte: startOfDay } },
          }),

          // Needs action: PLACED or REVIEW payment
          app.prisma.order.count({
            where: {
              OR: [
                { status: 'PLACED' },
                { paymentStatus: 'REVIEW' },
              ],
            },
          }),

          // Today's revenue: PAID or DELIVERED today
          app.prisma.order.aggregate({
            where: {
              createdAt: { gte: startOfDay },
              OR: [
                { paymentStatus: 'PAID' },
                { status: 'DELIVERED' },
              ],
            },
            _sum: { total: true },
          }),

          // COD to collect: DELIVERED but not settled
          app.prisma.order.aggregate({
            where: {
              paymentMethod: 'COD',
              status: 'DELIVERED',
              codSettledAt: null,
            },
            _sum: { total: true },
          }),
        ]);

      return reply.send({
        success: true,
        data: {
          todayOrders,
          needsAction,
          todayRevenue: Number(todayRevenue._sum.total || 0),
          codToCollect: Number(codToCollect._sum.total || 0),
        },
      });
    }
  );

  // ============================================
  // GET /api/orders/:id — staff: role-aware detail
  // ============================================
  app.get(
    '/:id',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const user = req.user as any;
      console.log('[DEBUG] getById route - user:', JSON.stringify({
        sub: user?.sub,
        id: user?.id,
        role: user?.role,
        email: user?.email,
      }));

      const order = await OrderService.getById(id, app.prisma, {
        role: user.role,
        userId: user.sub,
      });

      return reply.send({
        success: true,
        data: order,
      });
    }
  );

  // ============================================
  // PATCH /api/orders/:id/status — admin: change status
  // ============================================
  app.patch(
    '/:id/status',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status, note } = req.body as { status: string; note?: string };

      const order = await OrderService.updateStatus(
        id,
        status,
        note,
        app.prisma,
        req.user.sub
      );

      return reply.send({
        success: true,
        data: order,
      });
    }
  );

  // ============================================
  // PATCH /api/orders/:id/payment — admin: mark paid
  // ============================================
  app.patch(
    '/:id/payment',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const order = await OrderService.markPaid(
        id,
        app.prisma,
        req.user.sub
      );

      return reply.send({
        success: true,
        data: order,
      });
    }
  );
}