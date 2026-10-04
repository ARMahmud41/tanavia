import type { FastifyInstance } from 'fastify';
import { ReturnService } from '../services/return.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function returnRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/returns — list (role-aware)
  // ============================================
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const q = req.query as Record<string, string | undefined>;

      const result = await ReturnService.list(
        {
          status: q.status,
          channel: q.channel,
          search: q.q,
          sort: q.sort as any,
          from: q.from,
          to: q.to,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 25,
          role: user.role,
          userId: user.sub,
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
  // GET /api/returns/stats — dashboard cards
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;

      const result = await ReturnService.stats(
        { role: user.role, userId: user.sub },
        app.prisma
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // GET /api/returns/export — CSV export (ADMIN only)
  // ============================================
  app.get(
    '/export',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;

      const result = await ReturnService.list(
        {
          status: q.status,
          channel: q.channel as any,
          search: q.q,
          sort: q.sort as any,
          from: q.from,
          to: q.to,
          page: 1,
          limit: 10000, // Large limit for export
          role: 'ADMIN',
        },
        app.prisma
      );

      // Build CSV
      const headers = [
        'Return #',
        'Order #',
        'Channel',
        'Customer Name',
        'Customer Phone',
        'Reason',
        'Items Count',
        'Refund Amount',
        'Refund Method',
        'Status',
        'Created At',
        'Refunded At',
      ];

      const rows = result.items.map((r: any) => {
        const itemsCount = r.items.reduce(
          (s: number, it: any) => s + it.qty,
          0
        );
        return [
          r.returnNumber,
          r.order?.orderNumber || '',
          r.channel,
          r.order?.customerName || '',
          r.order?.customerPhone || '',
          r.reason,
          String(itemsCount),
          String(r.refundAmount),
          r.refundMethod || '',
          r.status,
          new Date(r.createdAt).toISOString(),
          r.refundedAt ? new Date(r.refundedAt).toISOString() : '',
        ];
      });

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const s = String(cell ?? '');
              if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
              }
              return s;
            })
            .join(',')
        )
        .join('\n');

      const filename = `tanavia-returns-${new Date().toISOString().split('T')[0]}.csv`;

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(csv);
    }
  );

  // ============================================
  // GET /api/returns/:id — detail
  // ============================================
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const ret = await ReturnService.getById(id, app.prisma, {
        role: user.role,
        userId: user.sub,
      });

      return reply.send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns — create request (STAFF allowed)
  // ============================================
  app.post(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const body = req.body as any;

      // Staff must have open shift for OFFLINE returns
      let shiftId: string | undefined;
      if (body.orderNumber) {
        const shift = await app.prisma.shift.findFirst({
          where: { userId: user.sub, status: 'OPEN' },
          select: { id: true },
        });
        shiftId = shift?.id;
      }

      const ret = await ReturnService.create(body, app.prisma, user.sub, shiftId);

      return reply.code(201).send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns/:id/approve — ADMIN only
  // ============================================
  app.post(
    '/:id/approve',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { note } = req.body as { note?: string };
      const user = req.user as any;

      const ret = await ReturnService.approve(id, app.prisma, user.sub, note);
      return reply.send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns/:id/reject — ADMIN only
  // ============================================
  app.post(
    '/:id/reject',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };
      const user = req.user as any;

      const ret = await ReturnService.reject(id, app.prisma, user.sub, reason);
      return reply.send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns/:id/in-transit — mark in transit
  // ============================================
  app.post(
    '/:id/in-transit',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { courier, consignmentId, trackingUrl } = req.body as any;
      const user = req.user as any;

      const ret = await ReturnService.markInTransit(
        id,
        app.prisma,
        user.sub,
        courier,
        consignmentId,
        trackingUrl
      );
      return reply.send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns/:id/receive — mark received
  // ============================================
  app.post(
    '/:id/receive',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { note } = req.body as { note?: string };
      const user = req.user as any;

      const ret = await ReturnService.markReceived(id, app.prisma, user.sub, note);
      return reply.send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns/:id/inspect — ADMIN only
  // ============================================
  app.post(
    '/:id/inspect',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const user = req.user as any;

      const ret = await ReturnService.inspect(id, body, app.prisma, user.sub);
      return reply.send({ success: true, data: ret });
    }
  );

  // ============================================
  // POST /api/returns/:id/refund — ADMIN only
  // ============================================
  app.post(
    '/:id/refund',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const user = req.user as any;

      const ret = await ReturnService.issueRefund(id, body, app.prisma, user.sub);
      return reply.send({ success: true, data: ret });
    }
  );
}