import type { FastifyInstance } from 'fastify';
import { ReviewService } from '../services/review.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';
import { randomUUID } from 'node:crypto';

export async function reviewRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/reviews/stats (ADMIN + STAFF)
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (_req, reply) => {
      const stats = await ReviewService.stats(app.prisma);
      return reply.send({ success: true, data: stats });
    }
  );

  // ============================================
  // GET /api/reviews — PUBLIC (For customers)
  // ============================================
  app.get('/', async (req, reply) => {
    const q = req.query as any;
    
    // Default: only show APPROVED reviews to public
    const status = q.status || 'APPROVED';

    const page = q.page ? Math.max(1, Number(q.page)) : 1;
    const limit = q.limit ? Math.min(100, Math.max(1, Number(q.limit))) : 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q.productId) where.productId = q.productId;
    if (status && status !== 'ALL') where.status = status;

    const [items, total] = await Promise.all([
      app.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      app.prisma.review.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ============================================
  // POST /api/reviews — Create review (PUBLIC)
  // ============================================
  app.post('/', async (req, reply) => {
    const body = req.body as {
      productId: string;
      name: string;
      rating: number;
      comment?: string;
    };

    if (!body.productId) {
      return reply.code(400).send({ success: false, message: 'Product ID is required' });
    }
    if (!body.name || body.name.trim().length < 2) {
      return reply.code(400).send({ success: false, message: 'Name is required' });
    }
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return reply.code(400).send({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check product exists
    const product = await app.prisma.product.findUnique({
      where: { id: body.productId },
      select: { id: true },
    });

    if (!product) {
      return reply.code(404).send({ success: false, message: 'Product not found' });
    }

    const review = await app.prisma.review.create({
      data: {
        id: randomUUID(),
        productId: body.productId,
        name: body.name.trim(),
        rating: body.rating,
        comment: body.comment?.trim() || null,
        status: 'PENDING',
        approved: false,
      },
    });

    return reply.code(201).send({ success: true, data: review });
  });

  // ============================================
  // GET /api/reviews/:id (ADMIN + STAFF)
  // ============================================
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const r = await ReviewService.getById(id, app.prisma);
      return reply.send({ success: true, data: r });
    }
  );

  // ============================================
  // PATCH /api/reviews/:id/status (ADMIN)
  // ============================================
  app.patch(
    '/:id/status',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const body = req.body as { status: 'PENDING' | 'APPROVED' | 'REJECTED' };
      const r = await ReviewService.updateStatus(
        id,
        body.status,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: r });
    }
  );

  // ============================================
  // POST /api/reviews/:id/reply (ADMIN + STAFF)
  // ============================================
  app.post(
    '/:id/reply',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const r = await ReviewService.reply(
        id,
        req.body as any,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: r });
    }
  );

  // ============================================
  // POST /api/reviews/bulk-status (ADMIN)
  // ============================================
  app.post(
    '/bulk-status',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const body = req.body as { ids: string[]; status: any };
      const result = await ReviewService.bulkUpdateStatus(
        body.ids,
        body.status,
        app.prisma,
        user?.id
      );
      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // DELETE /api/reviews/:id (ADMIN)
  // ============================================
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const result = await ReviewService.remove(id, app.prisma, user?.id);
      return reply.send({ success: true, data: result });
    }
  );
}