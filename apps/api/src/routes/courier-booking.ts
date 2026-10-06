import type { FastifyInstance } from 'fastify';
import { CourierBookingService } from '../services/courier-booking.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function courierBookingRoutes(app: FastifyInstance) {
  // ============================================
  // POST /api/courier-booking/book
  // Book a courier for an order (ADMIN only)
  // ============================================
  app.post(
    '/book',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const body = req.body as {
        orderId: string;
        courierId: string;
        weightKg?: number;
        note?: string;
      };

      if (!body.orderId || !body.courierId) {
        return reply.code(400).send({
          success: false,
          error: 'BAD_REQUEST',
          message: 'orderId and courierId are required',
        });
      }

      const result = await CourierBookingService.book(
        {
          orderId: body.orderId,
          courierId: body.courierId,
          weightKg: body.weightKg ?? 0.5,
          note: body.note,
        },
        app.prisma,
        user?.id
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // POST /api/courier-booking/sync/:orderId
  // Sync status from courier (ADMIN only)
  // ============================================
  app.post(
    '/sync/:orderId',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { orderId } = req.params as { orderId: string };

      const updated = await CourierBookingService.syncStatus(
        orderId,
        app.prisma,
        user?.id
      );

      return reply.send({ success: true, data: updated });
    }
  );
}