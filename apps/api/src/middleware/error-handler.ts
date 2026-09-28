import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export function errorHandler(
  error: FastifyError | AppError | ZodError,
  req: FastifyRequest,
  reply: FastifyReply
) {
  req.log.error(
    { err: error, url: req.url, method: req.method },
    'Request error'
  );

  // ── Zod validation error ──
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_';
      if (!details[key]) details[key] = [];
      details[key].push(issue.message);
    }
    return reply.code(400).send({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      details,
    });
  }

  // ── Custom AppError with statusCode ──
  const appError = error as AppError;
  if (appError.statusCode) {
    return reply.code(appError.statusCode).send({
      success: false,
      error: appError.code || 'ERROR',
      message: appError.message,
      details: appError.details,
    });
  }

  // ── Fastify validation error ──
  if ((error as FastifyError).validation) {
    return reply.code(400).send({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
    });
  }

  // ── Prisma known errors ──
  const prismaCode = (error as { code?: string }).code;
  if (prismaCode === 'P2002') {
    return reply.code(409).send({
      success: false,
      error: 'CONFLICT',
      message: 'A record with this value already exists',
    });
  }
  if (prismaCode === 'P2025') {
    return reply.code(404).send({
      success: false,
      error: 'NOT_FOUND',
      message: 'Record not found',
    });
  }

  // ── Default 500 ──
  const statusCode = (error as FastifyError).statusCode || 500;
  return reply.code(statusCode).send({
    success: false,
    error: 'INTERNAL_ERROR',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : error.message,
  });
}