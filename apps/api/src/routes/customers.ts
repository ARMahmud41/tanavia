import type { FastifyInstance } from 'fastify';
import { CustomerService } from '../services/customer.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';

export async function customerRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/customers
  // ============================================
  app.get(
    '/',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const q = req.query as any;
      const user = req.user as any;
      const isAdmin = user?.role === 'ADMIN';

      const data = await CustomerService.list(
        {
          search: q.q,
          segment: q.segment,
          source: q.source,
          sort: q.sort,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 25,
          role: isAdmin ? 'ADMIN' : 'STAFF',
        },
        app.prisma
      );
      // 🟢 data হিসেবে র‍্যাপ করা হলো
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/customers/stats
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as any;
      const isAdmin = user?.role === 'ADMIN';

      const data = await CustomerService.stats(
        { role: isAdmin ? 'ADMIN' : 'STAFF' },
        app.prisma
      );
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/customers/segment-counts
  // ============================================
  app.get(
    '/segment-counts',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = req.user as any;
      const isAdmin = user?.role === 'ADMIN';
      const q = req.query as any;

      const data = await CustomerService.segmentCounts(
        { search: q.q, role: isAdmin ? 'ADMIN' : 'STAFF' },
        app.prisma
      );
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/customers/analytics
  // ============================================
  app.get(
    '/analytics',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const data = await CustomerService.getAnalytics(app.prisma);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/customers/export
  // ============================================
  app.get(
    '/export',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as any;
      const user = req.user as any;

      const csv = await CustomerService.exportCsv(
        {
          search: q.q,
          segment: q.segment,
          source: q.source,
          sort: q.sort,
        },
        app.prisma,
        user.id
      );

      reply.header('Content-Type', 'text/csv');
      reply.header(
        'Content-Disposition',
        `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`
      );
      return reply.send(csv);
    }
  );

  // ============================================
  // GET /api/customers/:id
  // ============================================
  app.get(
    '/:id',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;
      const isAdmin = user?.role === 'ADMIN';

      const data = await CustomerService.getById(id, app.prisma, {
        role: isAdmin ? 'ADMIN' : 'STAFF',
      });
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // GET /api/customers/:id/addresses
  // ============================================
  app.get(
    '/:id/addresses',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const data = await CustomerService.getAddresses(id, app.prisma);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // POST /api/customers
  // ============================================
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const data = await CustomerService.create(body, app.prisma);
      return reply.code(201).send({ success: true, data });
    }
  );

  // ============================================
  // PATCH /api/customers/:id
  // ============================================
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const data = await CustomerService.update(id, body, app.prisma);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // POST /api/customers/:id/block
  // ============================================
  app.post(
    '/:id/block',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };
      const user = req.user as any;

      const data = await CustomerService.block(id, reason, app.prisma, user.id);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // POST /api/customers/:id/unblock
  // ============================================
  app.post(
    '/:id/unblock',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const data = await CustomerService.unblock(id, app.prisma, user.id);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // POST /api/customers/:id/notes
  // ============================================
  app.post(
    '/:id/notes',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { text } = req.body as { text: string };
      const user = req.user as any;

      const data = await CustomerService.addNote(id, text, app.prisma, user.id);
      return reply.code(201).send({ success: true, data });
    }
  );

  // ============================================
  // POST /api/customers/:id/tags
  // ============================================
  app.post(
    '/:id/tags',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { tag } = req.body as { tag: string };
      const user = req.user as any;

      const data = await CustomerService.addTag(id, tag, app.prisma, user.id);
      return reply.code(201).send({ success: true, data });
    }
  );

  // ============================================
  // DELETE /api/customers/:id/tags/:tag
  // ============================================
  app.delete(
    '/:id/tags/:tag',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id, tag } = req.params as { id: string; tag: string };
      const user = req.user as any;

      const data = await CustomerService.removeTag(id, tag, app.prisma, user.id);
      return reply.send({ success: true, data });
    }
  );
}