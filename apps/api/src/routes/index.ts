import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { productRoutes } from './products.js';
import { dropRoutes } from './drops.js';
import { orderRoutes } from './orders.js';
import { stockRoutes } from './stock.js';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(dropRoutes, { prefix: '/api/drops' });
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(stockRoutes, { prefix: '/api/stock' });
}