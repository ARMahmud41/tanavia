import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/require-role.js';
import crypto from 'node:crypto';

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
  // GET /api/payments/settings — admin
  // ============================================
  app.get(
    '/settings',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const row = await app.prisma.setting.findUnique({
        where: { key: 'pay' },
      });

      const settings = (row?.value as PaymentSettings) || DEFAULT_SETTINGS;

      // Mask sensitive keys
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

  // ============================================
  // POST /api/payments/settings — admin
  // ============================================
  app.post(
    '/settings',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const input = req.body as Partial<PaymentSettings>;

      const row = await app.prisma.setting.findUnique({
        where: { key: 'pay' },
      });
      const current = (row?.value as PaymentSettings) || DEFAULT_SETTINGS;

      // Merge card settings carefully — don't overwrite password if masked
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

  // ============================================
  // GET /api/payments/methods — public
  // ============================================
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

  // ============================================
  // POST /api/payments/init/:orderId — initiate payment
  // ============================================
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

    // For CARD payments
    if (order.paymentMethod === 'CARD') {
      if (!settings.card.on) {
        return reply.code(400).send({
          success: false,
          error: 'CARD_DISABLED',
          message: 'Card payments are not enabled',
        });
      }

      // TODO: real SSLCommerz API call
      // For now, generate a fake session token
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
          // In production this URL comes from SSLCommerz response
          paymentUrl: settings.card.sandbox
            ? `https://sandbox.sslcommerz.com/Ecommerce/checkout/${sessionToken}`
            : `https://securepay.sslcommerz.com/Ecommerce/checkout/${sessionToken}`,
        },
      });
    }

    // For other methods — return instructions
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
}