import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../utils/errors.js';

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    // Zod validation errors
    if (err instanceof ZodError) {
      return reply.code(422).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.flatten().fieldErrors,
      });
    }

    // Custom app errors
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        success: false,
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }

    // Prisma known errors
    if (err.code === 'P2002') {
      return reply.code(409).send({
        success: false,
        error: 'CONFLICT',
        message: 'This record already exists',
      });
    }
    if (err.code === 'P2025') {
      return reply.code(404).send({
        success: false,
        error: 'NOT_FOUND',
        message: 'Record not found',
      });
    }

    // Rate limit error
    if (err.statusCode === 429) {
      return reply.code(429).send({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: err.message,
      });
    }

    // Unknown error — log full details but don't leak to client
    req.log.error({ err }, 'Unhandled error');

    const statusCode = err.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Something went wrong'
          : err.message,
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      success: false,
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    });
  });

  app.log.info('✅ Error handler configured');
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});