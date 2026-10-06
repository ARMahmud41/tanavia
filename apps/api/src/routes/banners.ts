import type { FastifyInstance } from 'fastify';
import { BannerService } from '../services/banner.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function bannerRoutes(app: FastifyInstance) {
  // GET /api/banners/stats (ADMIN)
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const stats = await BannerService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // GET /api/banners (STAFF + ADMIN)
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const role = user?.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
      const q = req.query as { position?: string; active?: string; search?: string };

      const list = await BannerService.list(
        {
          position: q.position,
          active: q.active === 'true' ? true : q.active === 'false' ? false : undefined,
          search: q.search,
        },
        app.prisma,
        { role }
      );
      return reply.send({ success: true, data: list });
    }
  );

  // POST /api/banners/:id/click (public — for tracking)
  app.post('/:id/click', async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await BannerService.trackClick(id, app.prisma);
    return reply.send({ success: true, data: result });
  });

  // POST /api/banners (ADMIN)
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const b = await BannerService.create(req.body as any, app.prisma, user?.id);
      return reply.code(201).send({ success: true, data: b });
    }
  );

  // GET /api/banners/:id (STAFF + ADMIN)
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const b = await BannerService.getById(id, app.prisma);
      return reply.send({ success: true, data: b });
    }
  );

  // PATCH /api/banners/:id (ADMIN)
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const b = await BannerService.update(
        id,
        req.body as any,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: b });
    }
  );

  // DELETE /api/banners/:id (ADMIN)
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const result = await BannerService.remove(id, app.prisma, user?.id);
      return reply.send({ success: true, data: result });
    }
  );
}