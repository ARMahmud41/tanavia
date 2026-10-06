import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface ReviewFilters {
  productId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rating?: number;
  search?: string;
  page?: number;
  limit?: number;
}

interface ReplyInput {
  reply: string;
}

// ============================================
// Selects
// ============================================
const REVIEW_SELECT = {
  id: true,
  productId: true,
  userId: true,
  name: true,
  rating: true,
  comment: true,
  images: true,
  status: true,
  reply: true,
  repliedAt: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
    },
  },
} satisfies Prisma.ReviewSelect;

// ============================================
// Review Service
// ============================================
export class ReviewService {
  // ============================================
  // List (role-aware)
  // ============================================
  static async list(filters: ReviewFilters, prisma: PrismaClient) {
    const where: Prisma.ReviewWhereInput = {};

    if (filters.productId) where.productId = filters.productId;
    if (filters.status) where.status = filters.status;
    if (filters.rating) where.rating = filters.rating;
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { comment: { contains: q, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(50, filters.limit || 25);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: REVIEW_SELECT,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // Stats
  // ============================================
  static async stats(prisma: PrismaClient) {
    const [total, pending, approved, rejected, avgAgg] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'APPROVED' } }),
      prisma.review.count({ where: { status: 'REJECTED' } }),
      prisma.review.aggregate({
        where: { status: 'APPROVED' },
        _avg: { rating: true },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      averageRating: Number(avgAgg._avg.rating || 0).toFixed(1),
    };
  }

  // ============================================
  // Get by ID
  // ============================================
  static async getById(id: string, prisma: PrismaClient) {
    const r = await prisma.review.findUnique({
      where: { id },
      select: REVIEW_SELECT,
    });
    if (!r) throw new NotFoundError('Review not found');
    return r;
  }

  // ============================================
  // Update status (approve / reject)
  // ============================================
  static async updateStatus(
    id: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    prisma: PrismaClient,
    actorId?: string
  ) {
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundError('Review not found');

    const updated = await prisma.review.update({
      where: { id },
      data: {
        status,
        approved: status === 'APPROVED',
      },
      select: REVIEW_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'REVIEW_MODERATE',
          detail: `Review ${id} → ${status}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // Reply to review
  // ============================================
  static async reply(
    id: string,
    input: ReplyInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.reply?.trim()) {
      throw new BadRequestError('Reply is required');
    }

    const r = await prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundError('Review not found');

    const updated = await prisma.review.update({
      where: { id },
      data: {
        reply: input.reply.trim(),
        repliedAt: new Date(),
        // Auto-approve when replying
        status: r.status === 'PENDING' ? 'APPROVED' : r.status,
        approved: r.status === 'PENDING' ? true : r.approved,
      },
      select: REVIEW_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'REVIEW_REPLY',
          detail: `Replied to review ${id}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // Delete
  // ============================================
  static async remove(id: string, prisma: PrismaClient, actorId?: string) {
    const r = await prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundError('Review not found');

    await prisma.review.delete({ where: { id } });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'REVIEW_DELETE',
          detail: `Deleted review ${id}`,
        },
      });
    }

    return { success: true };
  }

  // ============================================
  // Bulk actions
  // ============================================
  static async bulkUpdateStatus(
    ids: string[],
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!ids || ids.length === 0) {
      throw new BadRequestError('No reviews selected');
    }

    await prisma.review.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        approved: status === 'APPROVED',
      },
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'REVIEW_BULK_MODERATE',
          detail: `${ids.length} reviews → ${status}`,
        },
      });
    }

    return { success: true, count: ids.length };
  }
}