import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss' },
            }
          : undefined,
    },
    trustProxy: true,
  });

  // ============================================
  // Prisma
  // ============================================
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  await prisma.$connect();
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
  app.log.info('✅ Prisma connected to database');

  // Neon keep-alive removed — local MySQL has no cold start

  // ============================================
  // Security / Core plugins
  // ============================================
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  app.log.info('✅ Helmet security headers configured');

  // ============================================
  // SECURITY: Rate Limiting
  // ============================================
  await app.register(rateLimit, {
    max: 100, // Max 100 requests per minute per IP
    timeWindow: '1 minute',
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please try again after ${context.after}.`,
    }),
  });

  // ============================================
  // SECURITY: Strict CORS (Only allowed domains)
  // ============================================
  await app.register(cors, {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://tanavia.com',
      'https://www.tanavia.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.log.info('✅ CORS & Rate Limit configured');

  await app.register(cookie, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  });
  app.log.info('✅ Cookie plugin configured');

  // ============================================
  // JWT
  // ============================================
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
  });

  // Decorate request.user typing + authenticate guard
  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Please log in again',
      });
    }
  });

  app.log.info('✅ JWT + authenticate configured');

  // ============================================
  // Multipart (file uploads)
  // ============================================
  await app.register(multipart, {
    limits: {
      fileSize: Number(process.env.UPLOAD_MAX_MB || 5) * 1024 * 1024,
      files: 10,
    },
  });
  app.log.info('✅ Multipart upload configured');

  // ============================================
  // Static file serving (uploads)
  // ============================================
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), uploadDir),
    prefix: `/${uploadDir}/`,
    decorateReply: false,
  });
  app.log.info(`✅ Static uploads served at /${uploadDir}/`);

  // ============================================
  // Error handler
  // ============================================
  app.setErrorHandler(errorHandler);
  app.log.info('✅ Error handler configured');

  // ============================================
  // Routes
  // ============================================
  await registerRoutes(app);

  return app;
}