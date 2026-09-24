import type { FastifyInstance } from 'fastify';
import { CourierService } from '../../services/courier.service.js';

export async function steadfastWebhook(app: FastifyInstance) {
  app.post('/steadfast', async (req, reply) => {
    const body = req.body as {
      consignment_id?: string;
      status?: string;
      note?: string;
    };

    if (!body.consignment_id || !body.status) {
      return reply.code(400).send({ error: 'Missing consignment_id or status' });
    }

    // TODO: verify signature in production
    const result = await CourierService.updateStatusFromWebhook(
      body.consignment_id,
      body.status,
      body.note,
      app.prisma
    );

    return reply.send({ success: true, ...result });
  });
}