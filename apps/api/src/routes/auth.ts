import type { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth.service.js';
import { validate } from '../middleware/validate.js';
import {
  LoginSchema,
  RegisterSchema,
  type LoginInput,
  type RegisterInput,
} from '@tanavia/shared';
import { UnauthorizedError } from '../utils/errors.js';

export async function authRoutes(app: FastifyInstance) {
  // ============================================
  // POST /api/auth/register
  // ============================================
  app.post(
    '/register',
    {
      preHandler: [validate(RegisterSchema, 'body')],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
      // 🎯 FIXED: cast to unknown first to match RegisterInput
      const input = req.body as any;

      const result = await AuthService.register(input, {
        prisma: app.prisma,
        app,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      // Set httpOnly cookies
      reply
        .setCookie('access_token', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 15 * 60, // 15 min
        })
        .setCookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });

      return reply.code(201).send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    }
  );

  // ============================================
  // POST /api/auth/login
  // ============================================
  app.post(
    '/login',
    {
      preHandler: [validate(LoginSchema, 'body')],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (req, reply) => {
      // 🎯 FIXED: cast to unknown first to match LoginInput
      const input = req.body as any;

      const result = await AuthService.login(input, {
        prisma: app.prisma,
        app,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      reply
        .setCookie('access_token', result.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 15 * 60,
        })
        .setCookie('refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth',
          maxAge: 30 * 24 * 60 * 60,
        });

      return reply.send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    }
  );

  // ============================================
  // POST /api/auth/refresh
  // ============================================
  app.post('/refresh', async (req, reply) => {
    const refreshToken =
      req.cookies['refresh_token'] ||
      (req.body as { refreshToken?: string })?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const result = await AuthService.refresh(refreshToken, {
      prisma: app.prisma,
      app,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    reply
      .setCookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60,
      })
      .setCookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 30 * 24 * 60 * 60,
      });

    return reply.send({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  });

  // ============================================
  // POST /api/auth/logout
  // ============================================
  app.post('/logout', async (req, reply) => {
    const refreshToken = req.cookies['refresh_token'];

    if (refreshToken) {
      await AuthService.logout(refreshToken, {
        prisma: app.prisma,
        app,
      });
    }

    reply
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/api/auth' });

    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // ============================================
  // GET /api/auth/me (protected)
  // ============================================
  app.get(
    '/me',
    {
      preHandler: [app.authenticate],
    },
    async (req, reply) => {
      const userId = req.user.sub;

      const user = await AuthService.me(userId, {
        prisma: app.prisma,
        app,
      });

      return reply.send({
        success: true,
        data: user,
      });
    }
  );

  // ============================================
  // PATCH /api/auth/profile — update own profile
  // ============================================
  app.patch(
    '/profile',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub;
      const body = req.body as {
        name?: string;
        email?: string;
        phone?: string;
      };

      const user = await app.prisma.user.update({
        where: { id: userId },
        data: {
          ...(body.name && { name: body.name.trim() }),
          ...(body.email && { email: body.email.toLowerCase().trim() }),
          ...(body.phone && { phone: body.phone.trim() }),
        },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });

      return reply.send({ success: true, data: user });
    }
  );

  // ============================================
  // POST /api/auth/change-password
  // ============================================
  app.post(
    '/change-password',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user.sub;
      const body = req.body as { oldPassword: string; newPassword: string };

      if (!body.oldPassword || !body.newPassword) {
        return reply.code(400).send({ success: false, message: 'Both passwords required' });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return reply.code(404).send({ success: false, message: 'User not found' });
      }

      const { verifyPassword, hashPassword } = await import('../utils/password.js');

      const ok = await verifyPassword(user.passwordHash, body.oldPassword);
      if (!ok) {
        return reply.code(401).send({ success: false, message: 'Current password is incorrect' });
      }

      if (body.newPassword.length < 8) {
        return reply.code(400).send({ success: false, message: 'Password must be at least 8 characters' });
      }

      const newHash = await hashPassword(body.newPassword);
      await app.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      return reply.send({ success: true, message: 'Password changed successfully' });
    }
  );
}