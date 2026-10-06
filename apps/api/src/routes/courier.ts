import type { FastifyInstance } from 'fastify';
import { CourierService } from '../services/courier.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function courierRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/courier - list (STAFF + ADMIN)
  // ============================================
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as { role?: string } | undefined;
      const role = user?.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
      const q = req.query as { active?: string; search?: string };

      const couriers = await CourierService.list(
        {
          active:
            q.active === 'true' ? true : q.active === 'false' ? false : undefined,
          search: q.search,
        },
        app.prisma,
        { role }
      );

      return reply.send({ success: true, data: couriers });
    }
  );

  // ============================================
  // GET /api/courier/stats - dashboard stats (ADMIN)
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const stats = await CourierService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // ============================================
  // GET /api/courier/:id - get by id (STAFF + ADMIN)
  // ============================================
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as { role?: string } | undefined;
      const role = user?.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
      const { id } = req.params as { id: string };

      const courier = await CourierService.getById(id, app.prisma, { role });
      return reply.send({ success: true, data: courier });
    }
  );

  // ============================================
  // POST /api/courier - create (ADMIN)
  // ============================================
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;

      const courier = await CourierService.create(
        req.body as any,
        app.prisma,
        user?.id
      );

      return reply.code(201).send({ success: true, data: courier });
    }
  );

  // ============================================
  // PATCH /api/courier/:id - update (ADMIN)
  // ============================================
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };

      const courier = await CourierService.update(
        id,
        req.body as any,
        app.prisma,
        user?.id
      );

      return reply.send({ success: true, data: courier });
    }
  );

  // ============================================
  // DELETE /api/courier/:id - remove (ADMIN)
  // ============================================
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };

      const result = await CourierService.remove(id, app.prisma, user?.id);
      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // GET /api/courier/:id/rates - list rates (STAFF + ADMIN)
  // ============================================
  app.get(
    '/:id/rates',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const rates = await CourierService.listRates(id, app.prisma);
      return reply.send({ success: true, data: rates });
    }
  );

  // ============================================
  // POST /api/courier/:id/rates - create rate (ADMIN)
  // ============================================
  app.post(
    '/:id/rates',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };

      const rate = await CourierService.createRate(
        id,
        req.body as any,
        app.prisma,
        user?.id
      );

      return reply.code(201).send({ success: true, data: rate });
    }
  );

  // ============================================
  // PATCH /api/courier/rates/:rateId - update rate (ADMIN)
  // ============================================
  app.patch(
    '/rates/:rateId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { rateId } = req.params as { rateId: string };

      const rate = await CourierService.updateRate(
        rateId,
        req.body as any,
        app.prisma,
        user?.id
      );

      return reply.send({ success: true, data: rate });
    }
  );

  // ============================================
  // DELETE /api/courier/rates/:rateId - delete rate (ADMIN)
  // ============================================
  app.delete(
    '/rates/:rateId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { rateId } = req.params as { rateId: string };

      const result = await CourierService.deleteRate(rateId, app.prisma);
      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/courier/:id/rates/import - bulk import (ADMIN)
  // ============================================
  app.post(
    '/:id/rates/import',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const body = req.body as { rows?: any[] };

      const result = await CourierService.importRates(
        id,
        body?.rows || [],
        app.prisma,
        user?.id
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/courier/:id/calculate - shipping charge (STAFF + ADMIN)
  // ============================================
  app.post(
    '/:id/calculate',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        district: string;
        weightKg: number;
        codAmount?: number;
      };

      const result = await CourierService.calculateCharge(
        id,
        body.district,
        body.weightKg,
        body.codAmount ?? 0,
        app.prisma
      );

      return reply.send({ success: true, data: result });
    }
  );
}