import type { FastifyInstance } from 'fastify';
import { ProductService } from '../services/product.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import {
  ProductInputSchema,
  ProductFiltersSchema,
  type ProductInput,
  type ProductFiltersInput,
} from '@tanavia/shared';

export async function productRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/products — public list (storefront)
  // ============================================
  app.get(
    '/',
    {
      preHandler: [validate(ProductFiltersSchema, 'query')],
    },
    async (req, reply) => {
      const filters = req.query as ProductFiltersInput;

      const result = await ProductService.list(filters, app.prisma, 'PUBLIC');

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/products/stats — dashboard cards (STAFF + ADMIN)
  // ============================================
  app.get(
    '/stats',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const user = req.user as any;
      const stats = await ProductService.stats(user.role, app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // ============================================
  // GET /api/products/staff — staff list (no cost)
  // ============================================
  app.get(
    '/staff',
    {
      preHandler: [
        app.authenticate,
        requireStaff,
        validate(ProductFiltersSchema, 'query'),
      ],
    },
    async (req, reply) => {
      const filters = req.query as ProductFiltersInput;
      const user = req.user as any;

      const result = await ProductService.list(
        filters,
        app.prisma,
        user.role === 'ADMIN' ? 'ADMIN' : 'STAFF'
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/products/admin — admin list (with cost)
  // ============================================
  app.get(
    '/admin',
    {
      preHandler: [
        app.authenticate,
        requireAdmin,
        validate(ProductFiltersSchema, 'query'),
      ],
    },
    async (req, reply) => {
      const filters = req.query as ProductFiltersInput;

      const result = await ProductService.list(filters, app.prisma, 'ADMIN');

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/products/slug/:slug — public by slug
  // ============================================
  app.get('/slug/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };

    const product = await ProductService.getBySlug(
      slug,
      app.prisma,
      'PUBLIC'
    );

    return reply.send({
      success: true,
      data: product,
    });
  });

  // ============================================
  // POST /api/products — admin create
  // ============================================
  app.post(
    '/',
    {
      preHandler: [
        app.authenticate,
        requireAdmin,
        validate(ProductInputSchema, 'body'),
      ],
    },
    async (req, reply) => {
      const input = req.body as ProductInput;

      const product = await ProductService.create(input, app.prisma);

      return reply.code(201).send({
        success: true,
        data: product,
      });
    }
  );

  // ============================================
  // GET /api/products/:id/movements — stock history (STAFF + ADMIN)
  // ============================================
  app.get(
    '/:id/movements',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { limit } = req.query as { limit?: string };

      const movements = await ProductService.getMovements(
        id,
        { limit: limit ? Number(limit) : 50 },
        app.prisma
      );

      return reply.send({ success: true, data: movements });
    }
  );

  // ============================================
  // POST /api/products/:id/duplicate — admin duplicate
  // ============================================
  app.post(
    '/:id/duplicate',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const duplicate = await ProductService.duplicate(
        id,
        app.prisma,
        user.sub
      );

      return reply.code(201).send({ success: true, data: duplicate });
    }
  );

  // ============================================
  // POST /api/products/:id/barcode — regenerate
  // ============================================
  app.post(
    '/:id/barcode',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const product = await ProductService.regenerateBarcode(id, app.prisma);

      return reply.send({
        success: true,
        data: product,
      });
    }
  );

  // ============================================
  // GET /api/products/:id — role-aware detail
  // ============================================
  app.get(
    '/:id',
    {
      preHandler: [app.authenticate, requireStaff],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const role = user.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
      const product = await ProductService.getById(id, app.prisma, role);

      return reply.send({
        success: true,
        data: product,
      });
    }
  );

  // ============================================
  // PATCH /api/products/:id — admin update
  // ============================================
  app.patch(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const input = req.body as Partial<ProductInput>;

      const product = await ProductService.update(id, input, app.prisma);

      return reply.send({
        success: true,
        data: product,
      });
    }
  );

  // ============================================
  // DELETE /api/products/:id — admin archive (soft) or delete (hard)
  // ============================================
  app.delete(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { hard } = req.query as { hard?: string };
      const user = req.user as any;

      const result = await ProductService.remove(
        id,
        hard === 'true',
        app.prisma,
        user.sub
      );

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
}