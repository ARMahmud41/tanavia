import type { FastifyInstance } from 'fastify';
import { ReviewService } from '../services/review.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function reviewRoutes(app: FastifyInstance) {
  // GET /api/reviews/stats (ADMIN + STAFF)
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (_req, reply) => {
      const stats = await ReviewService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // GET /api/reviews (ADMIN + STAFF)
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const q = req.query as any;
      const result = await ReviewService.list(
        {
          productId: q.productId,
          status: q.status,
          rating: q.rating ? Number(q.rating) : undefined,
          search: q.search,
          page: q.page ? Number(q.page) : undefined,
          limit: q.limit ? Number(q.limit) : undefined,
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

  // GET /api/reviews/:id (ADMIN + STAFF)
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const r = await ReviewService.getById(id, app.prisma);
      return reply.send({ success: true, data: r });
    }
  );

  // PATCH /api/reviews/:id/status (ADMIN)
  app.patch(
    '/:id/status',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const body = req.body as { status: 'PENDING' | 'APPROVED' | 'REJECTED' };
      const r = await ReviewService.updateStatus(
        id,
        body.status,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: r });
    }
  );

  // POST /api/reviews/:id/reply (ADMIN + STAFF)
  app.post(
    '/:id/reply',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const r = await ReviewService.reply(
        id,
        req.body as any,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: r });
    }
  );

  // POST /api/reviews/bulk-status (ADMIN)
  app.post(
    '/bulk-status',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const body = req.body as { ids: string[]; status: any };
      const result = await ReviewService.bulkUpdateStatus(
        body.ids,
        body.status,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: result });
    }
  );

  // DELETE /api/reviews/:id (ADMIN)
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const result = await ReviewService.remove(id, app.prisma, user?.id);
      return reply.send({ success: true, data: result });
    }
  );
}