import type { FastifyInstance } from 'fastify';

import prismaPlugin from './prisma.js';
import redisPlugin from './redis.js';
import corsPlugin from './cors.js';
import helmetPlugin from './helmet.js';
import jwtPlugin from './jwt.js';
import rateLimitPlugin from './rate-limit.js';
import errorHandlerPlugin from './error-handler.js';

export async function registerPlugins(app: FastifyInstance) {
  // Order matters!
  // 1. Error handler first (catches everything)
  await app.register(errorHandlerPlugin);

  // 2. Security headers
  await app.register(helmetPlugin);

  // 3. CORS
  await app.register(corsPlugin);

  // 4. Databases (redis before rate-limit)
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

  // 5. Auth (cookie + jwt)
  await app.register(jwtPlugin);

  // 6. Rate limit (depends on redis)
  await app.register(rateLimitPlugin);
}