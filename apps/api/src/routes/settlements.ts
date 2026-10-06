import type { FastifyInstance } from 'fastify';
import { SettlementService } from '../services/settlement.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function settlementRoutes(app: FastifyInstance) {
  // GET /api/settlements/stats
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const stats = await SettlementService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // GET /api/settlements
  app.get(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as { courierId?: string; status?: string };
      const list = await SettlementService.list(
        { courierId: q.courierId, status: q.status },
        app.prisma
      );
      return reply.send({ success: true, data: list });
    }
  );

  // POST /api/settlements/generate
  app.post(
    '/generate',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const body = req.body as {
        courierId: string;
        periodFrom: string;
        periodTo: string;
      };
      const settlement = await SettlementService.generate(
        body,
        app.prisma,
        user?.id
      );
      return reply.code(201).send({ success: true, data: settlement });
    }
  );

  // GET /api/settlements/:id
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const s = await SettlementService.getById(id, app.prisma);
      return reply.send({ success: true, data: s });
    }
  );

  // POST /api/settlements/:id/paid
  app.post(
    '/:id/paid',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const body = req.body as { reference?: string; notes?: string };
      const s = await SettlementService.markPaid(
        id,
        body,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: s });
    }
  );
}