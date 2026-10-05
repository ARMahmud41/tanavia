import type { FastifyInstance } from 'fastify';
import { CategoryService } from '../services/category.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function categoryRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/categories — public list
  // ============================================
  app.get('/', async (req, reply) => {
    const q = req.query as { active?: string; featured?: string };

    const categories = await CategoryService.list(
      {
        active: q.active === 'true' ? true : q.active === 'false' ? false : undefined,
        featured: q.featured === 'true' ? true : q.featured === 'false' ? false : undefined,
      },
      app.prisma
    );

    return reply.send({ success: true, data: categories });
  });

  // ============================================
  // GET /api/categories/staff — staff list (active only)
  // ============================================
  app.get(
    '/staff',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const categories = await CategoryService.list({}, app.prisma);
      return reply.send({ success: true, data: categories });
    }
  );

  // ============================================
  // GET /api/categories/slug/:slug — by slug
  // ============================================
  app.get('/slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const category = await CategoryService.getBySlug(slug, app.prisma);
    return reply.send({ success: true, data: category });
  });

  // ============================================
  // POST /api/categories/reorder — ADMIN (must be before /:id)
  // ============================================
  app.post(
    '/reorder',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { order } = req.body as {
        order: Array<{ id: string; position: number }>;
      };
      const user = req.user as any;

      const result = await CategoryService.reorder(
        order,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/categories — ADMIN create
  // ============================================
  app.post(
    '/',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const user = req.user as any;

      const category = await CategoryService.create(
        body,
        app.prisma,
        user.sub
      );

      return reply.code(201).send({ success: true, data: category });
    }
  );

  // ============================================
  // GET /api/categories/:id — detail
  // ============================================
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const category = await CategoryService.getById(id, app.prisma);
    return reply.send({ success: true, data: category });
  });

  // ============================================
  // PATCH /api/categories/:id — ADMIN update
  // ============================================
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      const user = req.user as any;

      const category = await CategoryService.update(
        id,
        body,
        app.prisma,
        user.sub
      );

      return reply.send({ success: true, data: category });
    }
  );

  // ============================================
  // DELETE /api/categories/:id — ADMIN delete
  // ============================================
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const result = await CategoryService.remove(id, app.prisma, user.sub);
      return reply.send({ success: true, data: result });
    }
  );
}