import type { FastifyInstance } from 'fastify';
import { StaffService } from '../services/staff.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function staffRoutes(app: FastifyInstance) {
  // ============================================
  // STAFF MANAGEMENT (Admin only)
  // ============================================

  // GET /api/staff — list staff
  app.get(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as { role?: string; active?: string };
      const items = await StaffService.list(
        {
          role: q.role as any,
          active: q.active === 'true' ? true : q.active === 'false' ? false : undefined,
        },
        app.prisma
      );
      return reply.send({ success: true, data: items });
    }
  );

  // POST /api/staff — create staff
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const staff = await StaffService.create(req.body as any, app.prisma);
      return reply.code(201).send({ success: true, data: staff });
    }
  );

  // GET /api/staff/:id — staff detail
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const staff = await StaffService.getById(id, app.prisma);
      return reply.send({ success: true, data: staff });
    }
  );

  // PATCH /api/staff/:id — update staff
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const staff = await StaffService.update(id, req.body as any, app.prisma);
      return reply.send({ success: true, data: staff });
    }
  );

  // DELETE /api/staff/:id — deactivate staff
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const staff = await StaffService.deactivate(id, app.prisma);
      return reply.send({ success: true, data: staff });
    }
  );

  // ============================================
  // SHIFT MANAGEMENT (Staff+)
  // ============================================

  // POST /api/staff/shift/open — open shift
  app.post(
    '/shift/open',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const shift = await StaffService.openShift(
        req.user.sub,
        req.body as any,
        app.prisma
      );
      return reply.code(201).send({ success: true, data: shift });
    }
  );

  // POST /api/staff/shift/close — close shift
  app.post(
    '/shift/close',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const result = await StaffService.closeShift(
        req.user.sub,
        req.body as any,
        app.prisma
      );
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/staff/shift/current — current shift
  app.get(
    '/shift/current',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const shift = await StaffService.currentShift(req.user.sub, app.prisma);
      return reply.send({ success: true, data: shift });
    }
  );

  // GET /api/staff/shifts — all shifts (admin)
  app.get(
    '/shifts',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as {
        userId?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };
      const result = await StaffService.listShifts(
        {
          userId: q.userId,
          status: q.status as any,
          from: q.from,
          to: q.to,
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

  // ============================================
  // STAFF REPORTS
  // ============================================

  // POST /api/staff/report — create report (staff)
  app.post(
    '/report',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const report = await StaffService.createReport(
        req.user.sub,
        req.body as any,
        app.prisma
      );
      return reply.code(201).send({ success: true, data: report });
    }
  );

  // GET /api/staff/report/my — my reports (staff)
  app.get(
    '/report/my',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const reports = await StaffService.myReports(req.user.sub, app.prisma);
      return reply.send({ success: true, data: reports });
    }
  );

  // GET /api/staff/reports — all reports (admin)
  app.get(
    '/reports',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as {
        status?: string;
        type?: string;
        page?: string;
        limit?: string;
      };
      const result = await StaffService.listReports(
        {
          status: q.status,
          type: q.type,
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

  // PATCH /api/staff/reports/:id — resolve report (admin)
  app.patch(
    '/reports/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const report = await StaffService.resolveReport(
        id,
        req.user.sub,
        req.body as any,
        app.prisma
      );
      return reply.send({ success: true, data: report });
    }
  );
}