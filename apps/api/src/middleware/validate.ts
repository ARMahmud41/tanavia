import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema, ZodTypeDef } from 'zod';
import { ZodError } from 'zod';

type Source = 'body' | 'query' | 'params' | 'headers';

export function validate<T>(
  schema: ZodSchema<T, ZodTypeDef, unknown>,
  source: Source = 'body'
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = req[source];
      const parsed = await schema.parseAsync(data);

      // Replace with validated/transformed data
      // (e.g., trimmed strings, coerced numbers)
      (req as any)[source] = parsed;
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || '_root';
          if (!details[key]) details[key] = [];
          details[key].push(issue.message);
        }

        return reply.code(422).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details,
        });
      }

      req.log.error({ err }, 'Validation middleware error');
      return reply.code(500).send({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Validation failed unexpectedly',
      });
    }
  };
}