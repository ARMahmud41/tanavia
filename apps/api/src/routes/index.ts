import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { productRoutes } from './products.js';
import { dropRoutes } from './drops.js';
import { orderRoutes } from './orders.js';
import { stockRoutes } from './stock.js';
import { staffRoutes } from './staff.js';
import { financeRoutes } from './finance.js';
import { courierRoutes } from './courier.js';
import { webhookRoutes } from './webhooks/index.js';

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
  await app.register(staffRoutes, { prefix: '/api/staff' });
  await app.register(financeRoutes, { prefix: '/api/finance' });
  await app.register(courierRoutes, { prefix: '/api/courier' });
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });
}