import type { FastifyInstance } from 'fastify';
import { CustomerService } from '../services/customer.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function customerRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/customers — list (role-aware)
  // ============================================
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const q = req.query as Record<string, string | undefined>;

      const result = await CustomerService.list(
        {
          search: q.q,
          segment: q.segment,
          sort: q.sort as any,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 25,
          role: user.role,
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
  // GET /api/customers/segment-counts
  // ============================================
  app.get(
    '/segment-counts',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const q = req.query as Record<string, string | undefined>;

      const counts = await CustomerService.segmentCounts(
        { search: q.q, role: user.role },
        app.prisma
      );

      return reply.send({ success: true, data: counts });
    }
  );

  // ============================================
  // GET /api/customers/stats
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;

      const result = await CustomerService.stats(
        { role: user.role },
        app.prisma
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // GET /api/customers/export — CSV (ADMIN)
  // ============================================
  app.get(
    '/export',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as any;
      const q = req.query as Record<string, string | undefined>;

      const csv = await CustomerService.exportCsv(
        {
          search: q.q,
          segment: q.segment,
          sort: q.sort as any,
        },
        app.prisma,
        user.sub
      );

      const filename = `tanavia-customers-${new Date().toISOString().split('T')[0]}.csv`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csv);
    }
  );

  // ============================================
  // POST /api/customers — create
  // ============================================
  app.post(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const body = req.body as {
        name: string;
        phone: string;
        email?: string;
      };

      const customer = await CustomerService.create(body, app.prisma);

      return reply.code(201).send({
        success: true,
        data: customer,
      });
    }
  );

  // ============================================
  // GET /api/customers/:id
  // ============================================
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const customer = await CustomerService.getById(id, app.prisma, {
        role: user.role,
      });

      return reply.send({ success: true, data: customer });
    }
  );

  // ============================================
  // PATCH /api/customers/:id — update (ADMIN)
  // ============================================
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;

      const customer = await CustomerService.update(id, body, app.prisma);

      return reply.send({ success: true, data: customer });
    }
  );

  // ============================================
  // POST /api/customers/:id/block (ADMIN)
  // ============================================
  app.post(
    '/:id/block',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };
      const user = req.user as any;

      const customer = await CustomerService.block(
        id,
        reason,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: customer });
    }
  );

  // ============================================
  // POST /api/customers/:id/unblock (ADMIN)
  // ============================================
  app.post(
    '/:id/unblock',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason?: string };
      const user = req.user as any;

      const customer = await CustomerService.unblock(
        id,
        app.prisma,
        user.sub,
        reason
      );

      return reply.send({ success: true, data: customer });
    }
  );

  // ============================================
  // GET /api/customers/:id/orders
  // ============================================
  app.get(
    '/:id/orders',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const orders = await CustomerService.getOrders(id, app.prisma);

      return reply.send({ success: true, data: orders });
    }
  );

  // ============================================
  // GET /api/customers/:id/returns
  // ============================================
  app.get(
    '/:id/returns',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const returns = await CustomerService.getReturns(id, app.prisma, {
        role: user.role,
      });

      return reply.send({ success: true, data: returns });
    }
  );

  // ============================================
  // GET /api/customers/:id/addresses
  // ============================================
  app.get(
    '/:id/addresses',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const addresses = await CustomerService.getAddresses(id, app.prisma);

      return reply.send({ success: true, data: addresses });
    }
  );

  // ============================================
  // POST /api/customers/:id/notes — add note (STAFF + ADMIN)
  // ============================================
  app.post(
    '/:id/notes',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { text } = req.body as { text: string };
      const user = req.user as any;

      const note = await CustomerService.addNote(
        id,
        text,
        app.prisma,
        user.sub
      );

      return reply.code(201).send({ success: true, data: note });
    }
  );

  // ============================================
  // PATCH /api/customers/:id/notes/:noteId — pin (ADMIN)
  // ============================================
  app.patch(
    '/:id/notes/:noteId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id, noteId } = req.params as { id: string; noteId: string };
      const { pinned } = req.body as { pinned: boolean };
      const user = req.user as any;

      const note = await CustomerService.pinNote(
        id,
        noteId,
        !!pinned,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: note });
    }
  );

  // ============================================
  // DELETE /api/customers/:id/notes/:noteId (ADMIN)
  // ============================================
  app.delete(
    '/:id/notes/:noteId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id, noteId } = req.params as { id: string; noteId: string };
      const user = req.user as any;

      const result = await CustomerService.deleteNote(
        id,
        noteId,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/customers/:id/tags (ADMIN)
  // ============================================
  app.post(
    '/:id/tags',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { tag } = req.body as { tag: string };
      const user = req.user as any;

      const created = await CustomerService.addTag(
        id,
        tag,
        app.prisma,
        user.sub
      );

      return reply.code(201).send({ success: true, data: created });
    }
  );

  // ============================================
  // DELETE /api/customers/:id/tags/:tag (ADMIN)
  // ============================================
  app.delete(
    '/:id/tags/:tag',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id, tag } = req.params as { id: string; tag: string };
      const user = req.user as any;

      const result = await CustomerService.removeTag(
        id,
        tag,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: result });
    }
  );
}