import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

interface CreateBannerInput {
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  ctaText?: string;
  position?:
    | 'HOME_HERO'
    | 'HOME_STRIP'
    | 'CATEGORY_TOP'
    | 'PRODUCT_SIDEBAR'
    | 'POPUP'
    | 'CHECKOUT';
  sortOrder?: number;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

const BANNER_SELECT = {
  id: true,
  title: true,
  subtitle: true,
  image: true,
  mobileImage: true,
  link: true,
  ctaText: true,
  position: true,
  sortOrder: true,
  active: true,
  startsAt: true,
  endsAt: true,
  impressions: true,
  clicks: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BannerSelect;

export class BannerService {
  // ============================================
  // List
  // ============================================
  static async list(
    filters: { position?: string; active?: boolean; search?: string } = {},
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';
    const where: Prisma.BannerWhereInput = {};

    if (!isAdmin) {
      // STAFF: only active banners
      where.active = true;
    } else if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.position) {
      where.position = filters.position as any;
    }
    if (filters.search) {
      where.title = { contains: filters.search.trim(), mode: 'insensitive' };
    }

    return prisma.banner.findMany({
      where,
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: BANNER_SELECT,
    });
  }

  // ============================================
  // Stats
  // ============================================
  static async stats(prisma: PrismaClient) {
    const [total, active, scheduled, expired] = await Promise.all([
      prisma.banner.count(),
      prisma.banner.count({ where: { active: true } }),
      prisma.banner.count({
        where: { startsAt: { gt: new Date() } },
      }),
      prisma.banner.count({
        where: { endsAt: { lt: new Date() } },
      }),
    ]);

    const positionCounts = await prisma.banner.groupBy({
      by: ['position'],
      _count: true,
    });

    return {
      total,
      active,
      scheduled,
      expired,
      byPosition: positionCounts.map((p) => ({
        position: p.position,
        count: p._count,
      })),
    };
  }

  // ============================================
  // Get by ID
  // ============================================
  static async getById(id: string, prisma: PrismaClient) {
    const b = await prisma.banner.findUnique({
      where: { id },
      select: BANNER_SELECT,
    });
    if (!b) throw new NotFoundError('Banner not found');
    return b;
  }

  // ============================================
  // Create
  // ============================================
  static async create(
    input: CreateBannerInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.title?.trim()) {
      throw new BadRequestError('Title is required');
    }
    if (!input.image?.trim()) {
      throw new BadRequestError('Image is required');
    }

    const banner = await prisma.banner.create({
      data: {
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        image: input.image.trim(),
        mobileImage: input.mobileImage?.trim() || null,
        link: input.link?.trim() || null,
        ctaText: input.ctaText?.trim() || null,
        position: input.position || 'HOME_HERO',
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        createdBy: actorId || null,
      },
      select: BANNER_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'BANNER_CREATE',
          detail: `Created banner: ${banner.title} (${banner.position})`,
        },
      });
    }

    return banner;
  }

  // ============================================
  // Update
  // ============================================
  static async update(
    id: string,
    input: Partial<CreateBannerInput>,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Banner not found');

    const data: Prisma.BannerUpdateInput = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.subtitle !== undefined)
      data.subtitle = input.subtitle?.trim() || null;
    if (input.image !== undefined) data.image = input.image.trim();
    if (input.mobileImage !== undefined)
      data.mobileImage = input.mobileImage?.trim() || null;
    if (input.link !== undefined) data.link = input.link?.trim() || null;
    if (input.ctaText !== undefined)
      data.ctaText = input.ctaText?.trim() || null;
    if (input.position !== undefined) data.position = input.position;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.active !== undefined) data.active = input.active;
    if (input.startsAt !== undefined)
      data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.endsAt !== undefined)
      data.endsAt = input.endsAt ? new Date(input.endsAt) : null;

    const updated = await prisma.banner.update({
      where: { id },
      data,
      select: BANNER_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'BANNER_UPDATE',
          detail: `Updated banner: ${updated.title}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // Delete
  // ============================================
  static async remove(id: string, prisma: PrismaClient, actorId?: string) {
    const b = await prisma.banner.findUnique({ where: { id } });
    if (!b) throw new NotFoundError('Banner not found');

    await prisma.banner.delete({ where: { id } });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'BANNER_DELETE',
          detail: `Deleted banner: ${b.title}`,
        },
      });
    }

    return { success: true };
  }

  // ============================================
  // Track click (public)
  // ============================================
  static async trackClick(id: string, prisma: PrismaClient) {
    await prisma.banner.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
    return { success: true };
  }
}