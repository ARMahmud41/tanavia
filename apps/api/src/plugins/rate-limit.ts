import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis: app.redis,
    nameSpace: 'tanavia:rl:',
    keyGenerator: (req) => {
      // Use authenticated user id if available, else IP
      return (req.user?.sub as string) || req.ip;
    },
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: `Too many requests. Please try again in ${Math.ceil(
        context.ttl / 1000
      )} seconds.`,
    }),
    skipOnError: false,
    enableDraftSpec: true,
  });

  app.log.info('✅ Rate limiting configured (Redis-backed)');
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  dependencies: ['redis'],
});