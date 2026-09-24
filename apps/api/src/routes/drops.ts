import type { FastifyInstance } from 'fastify';
import { DropService } from '../services/drop.service.js';
import { requireAdmin } from '../middleware/require-role.js';

export async function dropRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/drops — public list (LIVE + SCHEDULED)
  // ============================================
  app.get('/', async (req, reply) => {
    const query = req.query as {
      status?: string;
      isFeatured?: string;
      page?: string;
      limit?: string;
    };

    const filters = {
      status: query.status as any,
      isFeatured: query.isFeatured === 'true' ? true : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    };

    const result = await DropService.list(filters, app.prisma, false);

    return reply.send({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  });

  // ============================================
  // GET /api/drops/admin — admin list (all)
  // ============================================
  app.get(
    '/admin',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const query = req.query as {
        status?: string;
        isFeatured?: string;
        page?: string;
        limit?: string;
      };

      const filters = {
        status: query.status as any,
        isFeatured: query.isFeatured === 'true' ? true : undefined,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      };

      const result = await DropService.list(filters, app.prisma, true);

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/drops/slug/:slug — public by slug
  // ============================================
  app.get('/slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };

    const drop = await DropService.getBySlug(slug, app.prisma);

    return reply.send({
      success: true,
      data: drop,
    });
  });

  // ============================================
  // GET /api/drops/:id — admin detail
  // ============================================
  app.get(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const drop = await DropService.getById(id, app.prisma);

      return reply.send({
        success: true,
        data: drop,
      });
    }
  );

  // ============================================
  // POST /api/drops — admin create
  // ============================================
  app.post(
    '/',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const input = req.body as any;

      const drop = await DropService.create(input, app.prisma);

      return reply.code(201).send({
        success: true,
        data: drop,
      });
    }
  );

  // ============================================
  // PATCH /api/drops/:id — admin update
  // ============================================
  app.patch(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const input = req.body as any;

      const drop = await DropService.update(id, input, app.prisma);

      return reply.send({
        success: true,
        data: drop,
      });
    }
  );

  // ============================================
  // POST /api/drops/:id/products — admin add products
  // ============================================
  app.post(
    '/:id/products',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { productIds } = req.body as { productIds: string[] };

      const drop = await DropService.addProducts(id, productIds, app.prisma);

      return reply.send({
        success: true,
        data: drop,
      });
    }
  );

  // ============================================
  // DELETE /api/drops/:id/products/:productId
  // ============================================
  app.delete(
    '/:id/products/:productId',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id, productId } = req.params as {
        id: string;
        productId: string;
      };

      const result = await DropService.removeProduct(
        id,
        productId,
        app.prisma
      );

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // ============================================
  // DELETE /api/drops/:id — admin delete
  // ============================================
  app.delete(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const result = await DropService.remove(id, app.prisma);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
}