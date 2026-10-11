import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/require-role.js';
import { DashboardService } from '../services/dashboard.service.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const data = await DashboardService.stats(app.prisma);
      return reply.send({ success: true, data });
    }
  );
}