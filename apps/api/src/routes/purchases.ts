import type { FastifyInstance } from 'fastify';
import { PurchaseService } from '../services/purchase.service.js';
import { requireAdmin } from '../middleware/require-role.js';

export async function purchaseRoutes(app: FastifyInstance) {
  // GET /api/purchases
  app.get(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const result = await PurchaseService.list(
        {
          status: q.status,
          supplierId: q.supplierId,
          search: q.q,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 25,
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

  // GET /api/purchases/stats
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const stats = await PurchaseService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // POST /api/purchases
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const user = req.user as any;
      const po = await PurchaseService.create(body, app.prisma, user.sub);
      return reply.code(201).send({ success: true, data: po });
    }
  );

  // GET /api/purchases/:id
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const po = await PurchaseService.getById(id, app.prisma);
      return reply.send({ success: true, data: po });
    }
  );

  // PATCH /api/purchases/:id/status
  app.patch(
    '/:id/status',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status } = req.body as { status: 'ORDERED' | 'CANCELLED' };
      const user = req.user as any;
      const po = await PurchaseService.updateStatus(
        id,
        status,
        app.prisma,
        user.sub
      );
      return reply.send({ success: true, data: po });
    }
  );

  // POST /api/purchases/:id/receive
  app.post(
    '/:id/receive',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const user = req.user as any;
      const po = await PurchaseService.receive(id, body, app.prisma, user.sub);
      return reply.send({ success: true, data: po });
    }
  );
}