import type { FastifyInstance } from 'fastify';
import { steadfastWebhook } from './steadfast.js';
import { smsWebhookRoutes } from './sms.js';

export async function webhookRoutes(app: FastifyInstance) {
  await app.register(steadfastWebhook);
  await app.register(smsWebhookRoutes, { prefix: '/sms' });
}