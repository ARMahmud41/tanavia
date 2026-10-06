import type { FastifyInstance } from 'fastify';
import { CouponService } from '../services/coupon.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function couponRoutes(app: FastifyInstance) {
  // GET /api/coupons/stats (ADMIN)
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const stats = await CouponService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // GET /api/coupons (STAFF + ADMIN)
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const role = user?.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
      const q = req.query as { search?: string; status?: string };

      const list = await CouponService.list(
        { search: q.search, status: q.status },
        app.prisma,
        { role }
      );
      return reply.send({ success: true, data: list });
    }
  );

  // POST /api/coupons/validate (public — for checkout)
  app.post('/validate', async (req, reply) => {
    const body = req.body as { code: string; orderTotal: number };
    if (!body.code || body.orderTotal == null) {
      return reply.code(400).send({
        success: false,
        error: 'BAD_REQUEST',
        message: 'code and orderTotal required',
      });
    }
    const result = await CouponService.validate(
      { code: body.code, orderTotal: Number(body.orderTotal) },
      app.prisma
    );
    return reply.send({ success: true, data: result });
  });

  // GET /api/coupons/code/:code (ADMIN)
  app.get(
    '/code/:code',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { code } = req.params as { code: string };
      const c = await CouponService.getByCode(code, app.prisma);
      return reply.send({ success: true, data: c });
    }
  );

  // POST /api/coupons (ADMIN)
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const c = await CouponService.create(
        req.body as any,
        app.prisma,
        user?.id
      );
      return reply.code(201).send({ success: true, data: c });
    }
  );

  // GET /api/coupons/:id (ADMIN)
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const c = await CouponService.getById(id, app.prisma);
      return reply.send({ success: true, data: c });
    }
  );

  // PATCH /api/coupons/:id (ADMIN)
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const c = await CouponService.update(
        id,
        req.body as any,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: c });
    }
  );

  // DELETE /api/coupons/:id (ADMIN)
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const result = await CouponService.remove(id, app.prisma, user?.id);
      return reply.send({ success: true, data: result });
    }
  );
}