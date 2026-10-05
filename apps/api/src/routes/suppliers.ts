import type { FastifyInstance } from 'fastify';
import { SupplierService } from '../services/supplier.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function supplierRoutes(app: FastifyInstance) {
  // GET /api/suppliers
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const q = req.query as { active?: string; q?: string };
      const list = await SupplierService.list(
        {
          active: q.active === 'true' ? true : q.active === 'false' ? false : undefined,
          search: q.q,
        },
        app.prisma
      );
      return reply.send({ success: true, data: list });
    }
  );

  // POST /api/suppliers
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const user = req.user as any;
      const supplier = await SupplierService.create(body, app.prisma, user.sub);
      return reply.code(201).send({ success: true, data: supplier });
    }
  );

  // GET /api/suppliers/:id
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const supplier = await SupplierService.getById(id, app.prisma);
      return reply.send({ success: true, data: supplier });
    }
  );

  // PATCH /api/suppliers/:id
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const user = req.user as any;
      const supplier = await SupplierService.update(id, body, app.prisma, user.sub);
      return reply.send({ success: true, data: supplier });
    }
  );

  // DELETE /api/suppliers/:id
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;
      const result = await SupplierService.remove(id, app.prisma, user.sub);
      return reply.send({ success: true, data: result });
    }
  );
}