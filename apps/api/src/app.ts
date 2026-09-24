import Fastify, { type FastifyInstance } from 'fastify';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  });

  // Register plugins first (DB, Redis, Auth, etc.)
  await registerPlugins(app);

  // Register routes
  await registerRoutes(app);

  return app;
}