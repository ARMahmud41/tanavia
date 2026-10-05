import type { FastifyInstance } from 'fastify';
import { InventoryService } from '../services/inventory.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function inventoryRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/inventory — list (role-aware)
  // ============================================
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const q = req.query as Record<string, string | undefined>;

      const result = await InventoryService.list(
        {
          search: q.q,
          categoryId: q.categoryId,
          status: q.status as any,
          sort: q.sort as any,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 50,
          role: user.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
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
  // GET /api/inventory/stats — dashboard cards
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const stats = await InventoryService.stats(
        { role: user.role === 'ADMIN' ? 'ADMIN' : 'STAFF' },
        app.prisma
      );
      return reply.send({ success: true, data: stats });
    }
  );

  // ============================================
  // GET /api/inventory/valuation — ADMIN
  // ============================================
  app.get(
    '/valuation',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const data = await InventoryService.valuation(app.prisma);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/inventory/low-stock — low + out
  // ============================================
  app.get(
    '/low-stock',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const list = await InventoryService.lowStock(app.prisma, {
        role: user.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
      });
      return reply.send({ success: true, data: list });
    }
  );

  // ============================================
  // GET /api/inventory/reports — list reports (ADMIN)
  // ============================================
  app.get(
    '/reports',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as { status?: string };
      const reports = await InventoryService.listReports(
        { status: q.status },
        app.prisma
      );
      return reply.send({ success: true, data: reports });
    }
  );

  // ============================================
  // PATCH /api/inventory/reports/:id/resolve (ADMIN)
  // ============================================
  app.patch(
    '/reports/:id/resolve',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { note } = req.body as { note?: string };
      const user = req.user as any;

      const report = await InventoryService.resolveReport(
        id,
        note || '',
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: report });
    }
  );

  // ============================================
  // POST /api/inventory/bulk-adjust — ADMIN (physical count)
  // ============================================
  app.post(
    '/bulk-adjust',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { entries } = req.body as { entries: any[] };
      const user = req.user as any;

      const result = await InventoryService.bulkAdjust(
        entries,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/inventory/adjust — ADMIN only
  // ============================================
  app.post(
    '/adjust',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const user = req.user as any;

      const result = await InventoryService.adjust(
        body,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/inventory/report — STAFF + ADMIN
  // ============================================
  app.post(
    '/report',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const body = req.body as any;
      const user = req.user as any;

      const report = await InventoryService.reportProblem(
        body,
        app.prisma,
        user.sub
      );

      return reply.code(201).send({ success: true, data: report });
    }
  );

  // ============================================
  // GET /api/inventory/:variantId — detail
  // ============================================
  app.get(
    '/:variantId',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { variantId } = req.params as { variantId: string };
      const user = req.user as any;

      const variant = await InventoryService.getByVariantId(
        variantId,
        app.prisma,
        { role: user.role === 'ADMIN' ? 'ADMIN' : 'STAFF' }
      );

      return reply.send({ success: true, data: variant });
    }
  );
}