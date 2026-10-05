/**
 * Neon Keep-Alive Plugin
 *
 * Neon free tier databases sleep after inactivity (~5 min).
 * This plugin pings the DB every 4 minutes to keep it warm.
 *
 * Impact: first user request after idle no longer waits 3-5s
 *         for Neon to wake up.
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

async function keepAlivePlugin(app: FastifyInstance) {
  const FIVE_MINUTES = 5 * 60 * 1000;
  const FOUR_MINUTES = 4 * 60 * 1000;

  let timer: NodeJS.Timeout | null = null;

  // Start pinging after server boot
  app.addHook('onReady', async () => {
    // Initial warm-up
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      app.log.info('✅ DB warm-up ping OK');
    } catch (err) {
      app.log.warn({ err }, '⚠️  DB warm-up failed');
    }

    timer = setInterval(async () => {
      try {
        await app.prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        app.log.warn({ err }, '⚠️  Keep-alive ping failed');
      }
    }, FOUR_MINUTES);
  });

  app.addHook('onClose', async () => {
    if (timer) clearInterval(timer);
  });
}

export default fp(keepAlivePlugin, {
  name: 'keep-alive',
});