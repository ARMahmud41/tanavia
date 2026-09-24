import type { FastifyInstance } from 'fastify';
import { CourierService } from '../services/courier.service.js';
import { requireAdmin } from '../middleware/require-role.js';

export async function courierRoutes(app: FastifyInstance) {
  // GET /api/courier/settings — admin
  app.get(
    '/settings',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const settings = await CourierService.getSettings(app.prisma);

      // Mask keys in response
      const masked = {
        active: settings.active,
        steadfast: {
          enabled: settings.steadfast.enabled,
          baseUrl: settings.steadfast.baseUrl,
          hasApiKey: !!settings.steadfast.apiKey,
          hasSecretKey: !!settings.steadfast.secretKey,
        },
        pathao: {
          enabled: settings.pathao.enabled,
          baseUrl: settings.pathao.baseUrl,
          storeId: settings.pathao.storeId,
          hasClientId: !!settings.pathao.clientId,
          hasClientSecret: !!settings.pathao.clientSecret,
        },
      };

      return reply.send({ success: true, data: masked });
    }
  );

  // POST /api/courier/settings — admin
  app.post(
    '/settings',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const settings = await CourierService.saveSettings(
        req.body as any,
        app.prisma
      );
      return reply.send({ success: true, data: settings });
    }
  );

  // POST /api/courier/book/:orderId — admin
  app.post(
    '/book/:orderId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { orderId } = req.params as { orderId: string };
      const result = await CourierService.book(orderId, app.prisma);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/courier/cancel/:orderId — admin
  app.post(
    '/cancel/:orderId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { orderId } = req.params as { orderId: string };
      const result = await CourierService.cancel(orderId, app.prisma);
      return reply.send({ success: true, data: result });
    }
  );
}