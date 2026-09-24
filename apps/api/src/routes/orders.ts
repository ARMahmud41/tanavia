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
  // GET /api/orders — admin: list with filters
  // ============================================
  app.get(
    '/',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const query = req.query as {
        status?: string;
        channel?: string;
        paymentStatus?: string;
        search?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };

      const filters = {
        status: query.status,
        channel: query.channel as any,
        paymentStatus: query.paymentStatus,
        search: query.search,
        from: query.from,
        to: query.to,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      };

      const result = await OrderService.list(filters, app.prisma);

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/orders/:id — admin: detail
  // ============================================
  app.get(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const order = await OrderService.getById(id, app.prisma);

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