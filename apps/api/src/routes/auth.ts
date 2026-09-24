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
      const input = req.body as RegisterInput;

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
      const input = req.body as LoginInput;

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
}