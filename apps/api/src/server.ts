import 'dotenv/config';
import { buildApp } from './app.js';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const app = await buildApp();

  // Health check route
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  }));

  // Root route
  app.get('/', async () => ({
    name: 'TANAVIA API',
    version: '0.1.0',
    docs: '/api',
    health: '/health',
  }));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 TANAVIA API running at http://localhost:${PORT}`);
    app.log.info(`📖 Health check: http://localhost:${PORT}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();