import type { FastifyInstance } from 'fastify';
import { CourierBookingService } from '../../services/courier-booking.service.js';

/**
 * Courier webhook receiver.
 * Couriers POST status updates here.
 * Configure URL in courier panel: https://your-domain.com/api/webhooks/courier/{slug}
 */
export async function courierWebhookRoutes(app: FastifyInstance) {
  // ============================================
  // Steadfast webhook
  // Header: Authorization: Bearer <apiSecret>
  // ============================================
  app.post('/steadfast', async (req, reply) => {
    try {
      const body = req.body as any;
      const authHeader = req.headers['authorization'] || '';
      const token = String(authHeader).replace('Bearer ', '').trim();

      // Find Steadfast courier
      const courier = await app.prisma.courier.findFirst({
        where: { slug: 'steadfast', active: true },
      });

      if (!courier) {
        return reply.code(200).send({ status: 'ignored' });
      }

      // Verify token matches apiSecret
      if (courier.apiSecret && token !== courier.apiSecret) {
        return reply.code(401).send({ status: 'unauthorized' });
      }

      // Extract fields (Steadfast format)
      const consignmentId = String(
        body.consignment_id || body.consignmentId || ''
      );
      const status = String(
        body.delivery_status || body.status || ''
      ).toLowerCase();

      if (!consignmentId) {
        return reply.code(200).send({ status: 'no_consignment' });
      }

      // Find order by consignment
      const order = await app.prisma.order.findFirst({
        where: { consignmentId },
      });

      if (!order) {
        return reply.code(200).send({ status: 'order_not_found' });
      }

      // Handle status transition
      await CourierBookingService.handleWebhookStatus(
        order.id,
        status,
        body,
        app.prisma
      );

      return reply.send({ status: 'ok' });
    } catch (err) {
      app.log.error('Steadfast webhook error:', err);
      return reply.code(200).send({ status: 'error' });
    }
  });

  // ============================================
  // Pathao webhook
  // Header: X-PATHAO-Signature
  // ============================================
  app.post('/pathao', async (req, reply) => {
    try {
      const body = req.body as any;

      const consignmentId = String(
        body.consignment_id || body.consignmentId || ''
      );
      const status = String(
        body.event || body.status || ''
      ).toLowerCase();

      if (!consignmentId) {
        return reply.code(200).send({ status: 'no_consignment' });
      }

      const order = await app.prisma.order.findFirst({
        where: { consignmentId },
      });

      if (!order) {
        return reply.code(200).send({ status: 'order_not_found' });
      }

      await CourierBookingService.handleWebhookStatus(
        order.id,
        status,
        body,
        app.prisma
      );

      return reply.send({ status: 'ok' });
    } catch (err) {
      app.log.error('Pathao webhook error:', err);
      return reply.code(200).send({ status: 'error' });
    }
  });

  // ============================================
  // RedX webhook
  // Header: API-ACCESS-TOKEN
  // ============================================
  app.post('/redx', async (req, reply) => {
    try {
      const body = req.body as any;

      const consignmentId = String(
        body.tracking_id || body.parcel_id || ''
      );
      const status = String(
        body.status || body.event || ''
      ).toLowerCase();

      if (!consignmentId) {
        return reply.code(200).send({ status: 'no_consignment' });
      }

      const order = await app.prisma.order.findFirst({
        where: { consignmentId },
      });

      if (!order) {
        return reply.code(200).send({ status: 'order_not_found' });
      }

      await CourierBookingService.handleWebhookStatus(
        order.id,
        status,
        body,
        app.prisma
      );

      return reply.send({ status: 'ok' });
    } catch (err) {
      app.log.error('RedX webhook error:', err);
      return reply.code(200).send({ status: 'error' });
    }
  });
}