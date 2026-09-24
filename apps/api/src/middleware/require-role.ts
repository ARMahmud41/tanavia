import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../utils/errors.js';

type Role = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';

/**
 * Role-based authorization middleware.
 *
 * Usage:
 *   { preHandler: [app.authenticate, requireRole('ADMIN')] }
 *   { preHandler: [app.authenticate, requireRole('ADMIN', 'MANAGER')] }
 */
export function requireRole(...allowed: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!allowed.includes(req.user.role as Role)) {
      throw new ForbiddenError(
        `This action requires ${allowed.join(' or ')} role`
      );
    }
  };
}

/**
 * Convenience: Admin only
 */
export const requireAdmin = requireRole('ADMIN');

/**
 * Convenience: Admin or Manager
 */
export const requireManager = requireRole('ADMIN', 'MANAGER');

/**
 * Convenience: Any staff (Staff / Manager / Admin)
 */
export const requireStaff = requireRole('ADMIN', 'MANAGER', 'STAFF');