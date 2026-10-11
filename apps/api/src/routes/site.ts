import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/require-role.js';
import { SiteService } from '../services/site.service.js';

export async function siteRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/site/content — public
  // ============================================
  app.get('/content', async (_req, reply) => {
    const data = await SiteService.get(app.prisma);
    return reply.send({ success: true, data });
  });

  // ============================================
  // PATCH /api/site/content — admin
  // ============================================
  app.patch(
    '/content',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const data = await SiteService.update(body, app.prisma);
      return reply.send({ success: true, data });
    }
  );
}