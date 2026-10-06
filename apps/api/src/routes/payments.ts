import type { FastifyInstance } from 'fastify';
import {
  requireAdmin,
  requireStaff,
} from '../middleware/require-role.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import crypto from 'node:crypto';

// ============================================
// Payment Settings (existing)
// ============================================
interface PaymentSettings {
  cod: boolean;
  bkash: { number: string; type: 'Merchant' | 'Personal'; on: boolean };
  nagad: { number: string; type: 'Merchant' | 'Personal'; on: boolean };
  rocket: { number: string; type: 'Merchant' | 'Personal'; on: boolean };
  card: {
    on: boolean;
    provider: 'SSLCommerz' | 'Stripe' | 'Manual';
    storeId: string;
    storePassword: string;
    sandbox: boolean;
  };
}

const DEFAULT_SETTINGS: PaymentSettings = {
  cod: true,
  bkash: { number: '01700000000', type: 'Merchant', on: true },
  nagad: { number: '01700000000', type: 'Merchant', on: true },
  rocket: { number: '017000000001', type: 'Merchant', on: true },
  card: {
    on: false,
    provider: 'SSLCommerz',
    storeId: '',
    storePassword: '',
    sandbox: true,
  },
};

export async function paymentRoutes(app: FastifyInstance) {
  // ============================================
  // SETTINGS — existing (admin)
  // ============================================

  // GET /api/payments/settings — admin
  app.get(
    '/settings',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const row = await app.prisma.setting.findUnique({
        where: { key: 'pay' },
      });

      const settings = (row?.value as PaymentSettings) || DEFAULT_SETTINGS;

      const masked: PaymentSettings = {
        ...settings,
        card: {
          ...settings.card,
          storePassword: settings.card.storePassword ? '••••••••' : '',
        },
      };

      return reply.send({ success: true, data: masked });
    }
  );

  // POST /api/payments/settings — admin
  app.post(
    '/settings',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const input = req.body as Partial<PaymentSettings>;

      const row = await app.prisma.setting.findUnique({
        where: { key: 'pay' },
      });
      const current = (row?.value as PaymentSettings) || DEFAULT_SETTINGS;

      const cardUpdate = input.card || {};
      const cardMerged = {
        ...current.card,
        ...cardUpdate,
      };
      if (cardUpdate.storePassword === '••••••••') {
        cardMerged.storePassword = current.card.storePassword;
      }

      const next: PaymentSettings = {
        cod: typeof input.cod === 'boolean' ? input.cod : current.cod,
        bkash: { ...current.bkash, ...(input.bkash || {}) },
        nagad: { ...current.nagad, ...(input.nagad || {}) },
        rocket: { ...current.rocket, ...(input.rocket || {}) },
        card: cardMerged,
      };

      await app.prisma.setting.upsert({
        where: { key: 'pay' },
        update: { value: next as any },
        create: { key: 'pay', value: next as any },
      });

      return reply.send({ success: true, data: next });
    }
  );

  // GET /api/payments/methods — public
  app.get('/methods', async (_req, reply) => {
    const row = await app.prisma.setting.findUnique({
      where: { key: 'pay' },
    });
    const settings = (row?.value as PaymentSettings) || DEFAULT_SETTINGS;

    const enabled = {
      COD: settings.cod,
      BKASH: settings.bkash.on,
      NAGAD: settings.nagad.on,
      ROCKET: settings.rocket.on,
      CARD: settings.card.on,
    };

    const numbers = {
      BKASH: settings.bkash.number,
      NAGAD: settings.nagad.number,
      ROCKET: settings.rocket.number,
    };

    return reply.send({
      success: true,
      data: { enabled, numbers, cardProvider: settings.card.provider },
    });
  });

  // POST /api/payments/init/:orderId — initiate payment
  app.post('/init/:orderId', async (req, reply) => {
    const { orderId } = req.params as { orderId: string };

    const order = await app.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return reply.code(404).send({
        success: false,
        error: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.paymentStatus === 'PAID') {
      return reply.code(400).send({
        success: false,
        error: 'ALREADY_PAID',
        message: 'Order is already paid',
      });
    }

    const row = await app.prisma.setting.findUnique({
      where: { key: 'pay' },
    });
    const settings = (row?.value as PaymentSettings) || DEFAULT_SETTINGS;

    if (order.paymentMethod === 'CARD') {
      if (!settings.card.on) {
        return reply.code(400).send({
          success: false,
          error: 'CARD_DISABLED',
          message: 'Card payments are not enabled',
        });
      }

      const sessionToken = crypto.randomBytes(16).toString('hex');

      return reply.send({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(order.total),
          provider: settings.card.provider,
          sandbox: settings.card.sandbox,
          sessionToken,
          paymentUrl: settings.card.sandbox
            ? `https://sandbox.sslcommerz.com/Ecommerce/checkout/${sessionToken}`
            : `https://securepay.sslcommerz.com/Ecommerce/checkout/${sessionToken}`,
        },
      });
    }

    const instructions: Record<string, { number: string; type: string }> = {};

    if (order.paymentMethod === 'BKASH') {
      instructions.bkash = {
        number: settings.bkash.number,
        type: settings.bkash.type,
      };
    } else if (order.paymentMethod === 'NAGAD') {
      instructions.nagad = {
        number: settings.nagad.number,
        type: settings.nagad.type,
      };
    } else if (order.paymentMethod === 'ROCKET') {
      instructions.rocket = {
        number: settings.rocket.number,
        type: settings.rocket.type,
      };
    }

    return reply.send({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.total),
        method: order.paymentMethod,
        instructions,
      },
    });
  });

  // ============================================
  // ADMIN — Payment verification (new)
  // ============================================

  // GET /api/payments — combined list (online + POS)
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const page = q.page ? Number(q.page) : 1;
      const limit = q.limit ? Number(q.limit) : 25;

      const where: any = {};
      if (q.channel && q.channel !== 'ALL') where.channel = q.channel;
      if (q.method) where.paymentMethod = q.method;
      if (q.status) where.paymentStatus = q.status;
      if (q.search?.trim()) {
        where.OR = [
          { orderNumber: { contains: q.search.trim(), mode: 'insensitive' } },
          { paymentTxId: { contains: q.search.trim(), mode: 'insensitive' } },
          { customerPhone: { contains: q.search.trim() } },
          { customerName: { contains: q.search.trim(), mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        app.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            orderNumber: true,
            channel: true,
            status: true,
            customerName: true,
            customerPhone: true,
            total: true,
            paymentMethod: true,
            paymentStatus: true,
            paymentTxId: true,
            senderPhone: true,
            verifiedAt: true,
            adminNote: true,
            createdAt: true,
            userId: true,
          },
        }),
        app.prisma.order.count({ where }),
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

  // GET /api/payments/stats — summary
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (_req, reply) => {
      const [waiting, review, problems, verified] = await Promise.all([
        app.prisma.order.count({ where: { paymentStatus: 'PENDING' } }),
        app.prisma.order.count({ where: { paymentStatus: 'REVIEW' } }),
        app.prisma.order.count({ where: { paymentStatus: 'FAILED' } }),
        app.prisma.order.aggregate({
          where: {
            paymentStatus: 'PAID',
            verifiedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          _sum: { total: true },
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          waiting,
          review,
          problems,
          verified24h: Number(verified._sum.total || 0),
        },
      });
    }
  );

  // PATCH /api/payments/:id/verify (ADMIN)
  app.patch(
    '/:id/verify',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;
      const actorId = user?.id || user?.sub;

      const order = await app.prisma.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundError('Order not found');
      if (order.paymentStatus === 'PAID') {
        throw new BadRequestError('Already verified');
      }

      const updated = await app.prisma.order.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          verifiedAt: new Date(),
        },
      });

      await app.prisma
        .$executeRaw`
          INSERT INTO "OrderEvent" (id, "orderId", status, note, actor, "createdAt")
          VALUES (gen_random_uuid()::text, ${id}, 'PAYMENT_VERIFIED',
                  'bKash/Nagad payment verified', ${actorId || 'system'}, NOW())
        `
        .catch(() => {});

      return reply.send({ success: true, data: updated });
    }
  );

  // PATCH /api/payments/:id/reject (ADMIN)
  app.patch(
    '/:id/reject',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { reason?: string };
      const user = req.user as any;
      const actorId = user?.id || user?.sub;

      if (!body.reason?.trim()) {
        throw new BadRequestError('Rejection reason is required');
      }

      const order = await app.prisma.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundError('Order not found');

      const updated = await app.prisma.order.update({
        where: { id },
        data: {
          paymentStatus: 'FAILED',
          adminNote: body.reason.trim(),
        },
      });

      await app.prisma
        .$executeRaw`
          INSERT INTO "OrderEvent" (id, "orderId", status, note, actor, "createdAt")
          VALUES (gen_random_uuid()::text, ${id}, 'PAYMENT_REJECTED',
                  ${body.reason.trim()}, ${actorId || 'system'}, NOW())
        `
        .catch(() => {});

      return reply.send({ success: true, data: updated });
    }
  );
}