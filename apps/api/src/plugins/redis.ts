import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPlugin(app: FastifyInstance) {
  const redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: 10000, // Send keepalive every 10 seconds
    connectTimeout: 10000,
    commandTimeout: 5000,
    family: 4, // Force IPv4 (Upstash has IPv6 issues on some networks)
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        return true; // Reconnect
      }
      return false;
    },
  });

  redis.on('connect', () => {
    app.log.info('✅ Redis connected');
  });

  redis.on('ready', () => {
    app.log.info('✅ Redis ready');
  });

  redis.on('error', (err) => {
    // Only log non-ECONNRESET errors (ECONNRESET is normal for Upstash)
    if (!err.message.includes('ECONNRESET')) {
      app.log.error({ err }, 'Redis error');
    }
  });

  redis.on('reconnecting', () => {
    app.log.warn('Redis reconnecting...');
  });

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
    app.log.info('Redis disconnected');
  });
}

export default fp(redisPlugin, {
  name: 'redis',
});