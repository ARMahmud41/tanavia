import type { FastifyInstance } from 'fastify';
import { StockService } from '../services/stock.service.js';
import { requireAdmin } from '../middleware/require-role.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export async function stockRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/stock/low — low stock alert
  // ============================================
  app.get(
    '/low',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const threshold = Number(
        (req.query as { threshold?: string }).threshold || 5
      );

      const items = await StockService.getLowStock(app.prisma, threshold);

      return reply.send({
        success: true,
        data: items,
        count: items.length,
      });
    }
  );

  // ============================================
  // GET /api/stock/summary — total stock value
  // ============================================
  app.get(
    '/summary',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (_req, reply) => {
      const products = await app.prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          cost: true,
          price: true,
          discount: true,
          variants: {
            select: { qty: true },
          },
        },
      });

      let totalQty = 0;
      let costValue = 0;
      let retailValue = 0;

      for (const p of products) {
        const qty = p.variants.reduce((sum, v) => sum + v.qty, 0);
        const cost = Number(p.cost);
        const basePrice = Number(p.price);
        const discountPct = Number(p.discount || 0);
        const sellPrice = Math.round(basePrice * (1 - discountPct / 100));

        totalQty += qty;
        costValue += qty * cost;
        retailValue += qty * sellPrice;
      }

      return reply.send({
        success: true,
        data: {
          productsCount: products.length,
          totalQty,
          costValue,
          retailValue,
          potentialProfit: retailValue - costValue,
        },
      });
    }
  );

  // ============================================
  // GET /api/stock/movements — all movements (filter)
  // ============================================
  app.get(
    '/movements',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const query = req.query as {
        productId?: string;
        type?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
      const skip = (page - 1) * limit;

      const where: any = {};
      if (query.productId) where.productId = query.productId;
      if (query.type) where.type = query.type;
      if (query.from || query.to) {
        where.createdAt = {};
        if (query.from) where.createdAt.gte = new Date(query.from);
        if (query.to) {
          const to = new Date(query.to);
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
      }

      const [items, total] = await Promise.all([
        app.prisma.stockMovement.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, size: true, color: true } },
          },
        }),
        app.prisma.stockMovement.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // ============================================
  // GET /api/stock/movements/:productId — per product history
  // ============================================
  app.get(
    '/movements/:productId',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { productId } = req.params as { productId: string };
      const query = req.query as { limit?: string; offset?: string };

      const result = await StockService.getHistory(productId, app.prisma, {
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      });

      return reply.send({
        success: true,
        data: result.items,
        total: result.total,
      });
    }
  );

  // ============================================
  // POST /api/stock/adjust — manual adjustment
  // ============================================
  app.post(
    '/adjust',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const body = req.body as {
        productId: string;
        size: string;
        color: string;
        newQty: number;
        reason: string;
      };

      if (!body.productId || !body.size || !body.color) {
        throw new BadRequestError('productId, size, color required');
      }
      if (typeof body.newQty !== 'number' || body.newQty < 0) {
        throw new BadRequestError('newQty must be a non-negative number');
      }
      if (!body.reason || body.reason.trim().length < 3) {
        throw new BadRequestError('reason is required');
      }

      const result = await app.prisma.$transaction(async (tx) => {
        const variant = await tx.variant.findUnique({
          where: {
            productId_size_color: {
              productId: body.productId,
              size: body.size,
              color: body.color,
            },
          },
        });

        if (!variant) throw new NotFoundError('Variant not found');

        const before = variant.qty;
        const after = body.newQty;
        const diff = after - before;

        if (diff === 0) {
          throw new BadRequestError('New qty is same as current qty');
        }

        await tx.variant.update({
          where: { id: variant.id },
          data: { qty: after },
        });

        await StockService.log(
          {
            productId: body.productId,
            variantId: variant.id,
            type: 'ADJUSTMENT',
            qty: diff,
            before,
            after,
            reason: body.reason.trim(),
            actorId: req.user.sub,
          },
          tx
        );

        return { before, after, diff };
      });

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // ============================================
  // POST /api/stock/purchase — add stock (from supplier)
  // ============================================
  app.post(
    '/purchase',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const body = req.body as {
        productId: string;
        size: string;
        color: string;
        qty: number;
        reason?: string;
      };

      if (!body.productId || !body.size || !body.color) {
        throw new BadRequestError('productId, size, color required');
      }
      if (typeof body.qty !== 'number' || body.qty <= 0) {
        throw new BadRequestError('qty must be a positive number');
      }

      const result = await app.prisma.$transaction(async (tx) => {
        const variant = await tx.variant.findUnique({
          where: {
            productId_size_color: {
              productId: body.productId,
              size: body.size,
              color: body.color,
            },
          },
        });

        if (!variant) throw new NotFoundError('Variant not found');

        const before = variant.qty;
        const after = before + body.qty;

        await tx.variant.update({
          where: { id: variant.id },
          data: { qty: after },
        });

        await StockService.log(
          {
            productId: body.productId,
            variantId: variant.id,
            type: 'PURCHASE',
            qty: body.qty,
            before,
            after,
            reason: body.reason || 'Stock purchase',
            actorId: req.user.sub,
          },
          tx
        );

        return { before, after, added: body.qty };
      });

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
}