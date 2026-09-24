import type { FastifyInstance } from 'fastify';
import { steadfastWebhook } from './steadfast.js';

export async function webhookRoutes(app: FastifyInstance) {
  await app.register(steadfastWebhook);
}