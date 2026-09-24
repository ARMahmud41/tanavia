import Fastify, { type FastifyInstance } from 'fastify';
import { registerPlugins } from './plugins/index.js';
import { logger } from './utils/logger.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
  });

  await registerPlugins(app);

  return app;
}