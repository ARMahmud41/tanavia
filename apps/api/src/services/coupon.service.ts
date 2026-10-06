import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface CreateCouponInput {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSpend?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUser?: number;
  active?: boolean;
  expiresAt?: string | null;
}

interface ValidateInput {
  code: string;
  orderTotal: number;
}

// ============================================
// Helpers
// ============================================
function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// ============================================
// Selects
// ============================================
const COUPON_SELECT = {
  id: true,
  code: true,
  type: true,
  value: true,
  minSpend: true,
  maxDiscount: true,
  usageLimit: true,
  usedCount: true,
  perUser: true,
  active: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CouponSelect;

// ============================================
// Service
// ============================================
export class CouponService {
  // ============================================
  // List (role-aware — STAFF sees only active)
  // ============================================
  static async list(
    filters: { search?: string; status?: string } = {},
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';
    const where: Prisma.CouponWhereInput = {};

    if (!isAdmin) {
      // STAFF: only active, non-expired coupons
      where.active = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ];
    } else if (filters.status === 'active') {
      where.active = true;
    } else if (filters.status === 'inactive') {
      where.active = false;
    } else if (filters.status === 'expired') {
      where.expiresAt = { lt: new Date() };
    } else if (filters.status === 'exhausted') {
      where.usageLimit = { not: null };
      // Note: post-filter for usedCount >= usageLimit
    }

    if (filters.search) {
      where.code = {
        contains: filters.search.trim().toUpperCase(),
        mode: 'insensitive',
      };
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      select: COUPON_SELECT,
    });

    // Post-filter exhausted
    if (filters.status === 'exhausted') {
      return coupons.filter(
        (c) => c.usageLimit !== null && c.usedCount >= c.usageLimit
      );
    }

    return coupons;
  }

  // ============================================
  // Stats
  // ============================================
  static async stats(prisma: PrismaClient) {
    const now = new Date();

    const [total, active, expired, exhausted] = await Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({
        where: {
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
      }),
      prisma.coupon.count({ where: { expiresAt: { lt: now } } }),
      prisma.coupon.findMany({
        where: { usageLimit: { not: null } },
        select: { usedCount: true, usageLimit: true },
      }),
    ]);

    const exhaustedCount = exhausted.filter(
      (c) => c.usageLimit !== null && c.usedCount >= c.usageLimit
    ).length;

    // Total discount given (approximation from usage)
    const totalUsed = await prisma.coupon.aggregate({
      _sum: { usedCount: true },
    });

    return {
      total,
      active,
      expired,
      exhausted: exhaustedCount,
      totalUsed: totalUsed._sum.usedCount || 0,
    };
  }

  // ============================================
  // Get by ID
  // ============================================
  static async getById(id: string, prisma: PrismaClient) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      select: COUPON_SELECT,
    });
    if (!coupon) throw new NotFoundError('Coupon not found');
    return coupon;
  }

  // ============================================
  // Get by Code
  // ============================================
  static async getByCode(code: string, prisma: PrismaClient) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizeCode(code) },
      select: COUPON_SELECT,
    });
    if (!coupon) throw new NotFoundError('Coupon not found');
    return coupon;
  }

  // ============================================
  // Create
  // ============================================
  static async create(
    input: CreateCouponInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.code?.trim()) {
      throw new BadRequestError('Coupon code is required');
    }
    const code = normalizeCode(input.code);

    // Duplicate check
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictError(`Coupon "${code}" already exists`);

    if (input.type !== 'PERCENT' && input.type !== 'FIXED') {
      throw new BadRequestError('Type must be PERCENT or FIXED');
    }
    if (input.value == null || input.value <= 0) {
      throw new BadRequestError('Value must be greater than 0');
    }
    if (input.type === 'PERCENT' && input.value > 100) {
      throw new BadRequestError('Percent value cannot exceed 100');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        type: input.type,
        value: input.value,
        minSpend: input.minSpend ?? 0,
        maxDiscount: input.maxDiscount ?? null,
        usageLimit: input.usageLimit ?? null,
        perUser: input.perUser ?? 1,
        active: input.active ?? true,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      select: COUPON_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COUPON_CREATE',
          detail: `Created coupon ${coupon.code} (${coupon.type} ${coupon.value})`,
        },
      });
    }

    return coupon;
  }

  // ============================================
  // Update
  // ============================================
  static async update(
    id: string,
    input: Partial<CreateCouponInput>,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Coupon not found');

    const data: Prisma.CouponUpdateInput = {};
    if (input.code !== undefined) data.code = normalizeCode(input.code);
    if (input.type !== undefined) data.type = input.type;
    if (input.value !== undefined) data.value = input.value;
    if (input.minSpend !== undefined) data.minSpend = input.minSpend;
    if (input.maxDiscount !== undefined)
      data.maxDiscount = input.maxDiscount;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.perUser !== undefined) data.perUser = input.perUser;
    if (input.active !== undefined) data.active = input.active;
    if (input.expiresAt !== undefined)
      data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const updated = await prisma.coupon.update({
      where: { id },
      data,
      select: COUPON_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COUPON_UPDATE',
          detail: `Updated coupon ${updated.code}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // Delete
  // ============================================
  static async remove(id: string, prisma: PrismaClient, actorId?: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError('Coupon not found');

    await prisma.coupon.delete({ where: { id } });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COUPON_DELETE',
          detail: `Deleted coupon ${coupon.code}`,
        },
      });
    }

    return { success: true };
  }

  // ============================================
  // Validate (used during checkout)
  // ============================================
  static async validate(
    input: ValidateInput,
    prisma: PrismaClient,
    userId?: string
  ) {
    const code = normalizeCode(input.code);
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }
    if (!coupon.active) {
      return { valid: false, error: 'Coupon is inactive' };
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, error: 'Coupon has expired' };
    }
    if (
      coupon.usageLimit !== null &&
      coupon.usedCount >= coupon.usageLimit
    ) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }
    if (input.orderTotal < Number(coupon.minSpend)) {
      return {
        valid: false,
        error: `Minimum spend ৳${coupon.minSpend} required`,
      };
    }

    // Per-user check (needs order/coupon history — simplified here)
    if (userId && coupon.perUser > 0) {
      const userUsage = await prisma.order.count({
        where: {
          customerId: userId,
          // Add couponCode field to Order if not present
          // For now, skip; extend later
        },
      });
      // Skip complex per-user validation for now
    }

    // Calculate discount
    const orderTotal = input.orderTotal;
    let discount = 0;

    if (coupon.type === 'PERCENT') {
      discount = (orderTotal * Number(coupon.value)) / 100;
    } else {
      discount = Number(coupon.value);
    }

    // Apply max discount cap
    if (
      coupon.maxDiscount !== null &&
      discount > Number(coupon.maxDiscount)
    ) {
      discount = Number(coupon.maxDiscount);
    }

    // Can't exceed order total
    if (discount > orderTotal) discount = orderTotal;

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount: Math.round(discount * 100) / 100,
      message: `Discount ৳${discount.toFixed(2)} applied`,
    };
  }

  // ============================================
  // Increment used count (called after order)
  // ============================================
  static async consume(couponId: string, prisma: PrismaClient) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }
}