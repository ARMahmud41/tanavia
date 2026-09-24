import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string; type: 'access' | 'refresh' };
    user: { sub: string; role: string; type: 'access' | 'refresh' };
  }
}

async function jwtPlugin(app: FastifyInstance) {
  // Cookie support (for httpOnly JWT cookies)
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET!,
    hook: 'onRequest',
  });

  // JWT setup
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: {
      expiresIn: '15m',
    },
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  // Auth decorator — use in routes: { preHandler: [app.authenticate] }
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      if (req.user.type !== 'access') {
        throw new Error('Invalid token type');
      }
    } catch (err) {
      reply.code(401).send({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Please log in again',
      });
    }
  });

  app.log.info('✅ JWT + Cookie configured');
}

export default fp(jwtPlugin, {
  name: 'jwt',
});