import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  }));

  // Auth routes
  await app.register(authRoutes, { prefix: '/api/auth' });

  // More routes will be added here:
  // await app.register(productRoutes, { prefix: '/api/products' });
  // await app.register(orderRoutes, { prefix: '/api/orders' });
  // await app.register(stockRoutes, { prefix: '/api/stock' });
  // await app.register(dropRoutes, { prefix: '/api/drops' });
}