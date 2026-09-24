import type { FastifyInstance } from 'fastify';
import { ProductService } from '../services/product.service.js';
import { requireAdmin } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import {
  ProductInputSchema,
  ProductFiltersSchema,
  type ProductInput,
  type ProductFiltersInput,
} from '@tanavia/shared';

export async function productRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/products — public list
  // ============================================
  app.get(
    '/',
    {
      preHandler: [validate(ProductFiltersSchema, 'query')],
    },
    async (req, reply) => {
      const filters = req.query as ProductFiltersInput;

      const result = await ProductService.list(filters, app.prisma, false);

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
      preHandler: [app.authenticate, requireAdmin, validate(ProductFiltersSchema, 'query')],
    },
    async (req, reply) => {
      const filters = req.query as ProductFiltersInput;

      const result = await ProductService.list(filters, app.prisma, true);

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

    const product = await ProductService.getBySlug(slug, app.prisma, false);

    return reply.send({
      success: true,
      data: product,
    });
  });

  // ============================================
  // GET /api/products/:id — admin detail (with cost)
  // ============================================
  app.get(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const product = await ProductService.getById(id, app.prisma, true);

      return reply.send({
        success: true,
        data: product,
      });
    }
  );

  // ============================================
  // POST /api/products — admin create
  // ============================================
  app.post(
    '/',
    {
      preHandler: [app.authenticate, requireAdmin, validate(ProductInputSchema, 'body')],
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
  // DELETE /api/products/:id — admin delete
  // ============================================
  app.delete(
    '/:id',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { hard } = req.query as { hard?: string };

      const result = await ProductService.remove(
        id,
        hard === 'true',
        app.prisma
      );

      return reply.send({
        success: true,
        data: result,
      });
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
}