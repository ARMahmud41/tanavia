import crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors.js';

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContext {
  prisma: PrismaClient;
  app: FastifyInstance;
  userAgent?: string;
  ip?: string;
}

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

export class AuthService {
  /**
   * Register a new customer
   */
  static async register(input: RegisterInput, ctx: AuthContext) {
    const { prisma } = ctx;
    const email = input.email.toLowerCase().trim();
    const phone = input.phone.trim();

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictError('An account with this email already exists');
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new ConflictError('An account with this phone number already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        phone,
        passwordHash,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await AuthService.generateTokens(user.id, user.role, ctx);

    return { user, ...tokens };
  }

  /**
   * Login with email + password
   */
  static async login(input: LoginInput, ctx: AuthContext) {
    const { prisma } = ctx;
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.active) {
      throw new ForbiddenError('Account is disabled. Please contact support.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      throw new ForbiddenError(
        `Too many failed attempts. Please try again in ${mins} minute(s).`
      );
    }

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      const failedLogins = user.failedLogins + 1;
      const lockedUntil =
        failedLogins >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins, lockedUntil },
      });

      throw new UnauthorizedError('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const tokens = await AuthService.generateTokens(user.id, user.role, ctx);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refresh(refreshToken: string, ctx: AuthContext) {
    const { prisma } = ctx;

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (session.revokedAt) {
      throw new UnauthorizedError('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session has expired');
    }

    if (!session.user.active) {
      throw new ForbiddenError('Account is disabled');
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, expiresAt },
    });

    const accessToken = ctx.app.jwt.sign(
      { sub: session.user.id, role: session.user.role, type: 'access' },
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    };
  }

  /**
   * Logout — revoke session
   */
  static async logout(refreshToken: string, ctx: AuthContext) {
    const { prisma } = ctx;
    await prisma.session.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Get current user profile
   */
  static async me(userId: string, ctx: AuthContext) {
    const { prisma } = ctx;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorOn: true,
        createdAt: true,
      },
    });

    if (!user) throw new UnauthorizedError('User not found');
    return user;
  }

  /**
   * Generate access + refresh tokens, save session
   */
  private static async generateTokens(
    userId: string,
    role: string,
    ctx: AuthContext
  ) {
    const { prisma, app, userAgent, ip } = ctx;

    const accessToken = app.jwt.sign(
      { sub: userId, role, type: 'access' },
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        userAgent: userAgent || null,
        ip: ip || null,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}