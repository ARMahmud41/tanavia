import type { PrismaClient, Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';

interface CreateDropInput {
  name: string;
  nameBn?: string;
  description?: string;
  bannerUrl?: string;
  releaseAt: string; // ISO string
  endAt?: string;
  isFeatured?: boolean;
  countdownOn?: boolean;
  notifyOn?: boolean;
  status?: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'ENDED';
  productIds?: string[];
}

interface UpdateDropInput extends Partial<CreateDropInput> {}

interface ListFilters {
  status?: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'ENDED';
  isFeatured?: boolean;
  page?: number;
  limit?: number;
}

const DROP_SELECT = {
  id: true,
  name: true,
  nameBn: true,
  slug: true,
  description: true,
  bannerUrl: true,
  status: true,
  releaseAt: true,
  endAt: true,
  isFeatured: true,
  countdownOn: true,
  notifyOn: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { products: true },
  },
} satisfies Prisma.DropSelect;

const DROP_WITH_PRODUCTS = {
  ...DROP_SELECT,
  products: {
    orderBy: { position: 'asc' as const },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          nameBn: true,
          price: true,
          discount: true,
          images: true,
          shape: true,
          category: true,
          active: true,
          featured: true,
          tryable: true,
          variants: {
            select: {
              id: true,
              size: true,
              color: true,
              qty: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DropSelect;

export class DropService {
  /**
   * Compute the effective status based on current time.
   * This ensures drops auto-transition LIVE/ENDED without a cron job.
   */
  private static computeStatus(drop: {
    status: string;
    releaseAt: Date;
    endAt: Date | null;
  }): string {
    const now = new Date();
    if (drop.status === 'DRAFT') return 'DRAFT';
    if (drop.endAt && drop.endAt < now) return 'ENDED';
    if (drop.releaseAt <= now && (!drop.endAt || drop.endAt > now)) return 'LIVE';
    return 'SCHEDULED';
  }

  /**
   * Create a new drop.
   */
  static async create(input: CreateDropInput, prisma: PrismaClient) {
    const releaseAt = new Date(input.releaseAt);
    if (isNaN(releaseAt.getTime())) {
      throw new BadRequestError('Invalid releaseAt date');
    }

    const endAt = input.endAt ? new Date(input.endAt) : null;
    if (endAt && isNaN(endAt.getTime())) {
      throw new BadRequestError('Invalid endAt date');
    }
    if (endAt && endAt <= releaseAt) {
      throw new BadRequestError('endAt must be after releaseAt');
    }

    const slug = this.generateSlug(input.name);

    const existingSlug = await prisma.drop.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existingSlug) {
      throw new ConflictError('A drop with a similar name already exists');
    }

    // Validate product IDs if provided
    let productIds: string[] = [];
    if (input.productIds && input.productIds.length > 0) {
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: input.productIds } },
        select: { id: true },
      });
      if (existingProducts.length !== input.productIds.length) {
        throw new BadRequestError('One or more product IDs are invalid');
      }
      productIds = input.productIds;
    }

    const now = new Date();
    let status = input.status || 'DRAFT';
    if (!input.status) {
      if (releaseAt > now) status = 'SCHEDULED';
      else if (endAt && endAt < now) status = 'ENDED';
      else status = 'LIVE';
    }

    const drop = await prisma.drop.create({
      data: {
        name: input.name.trim(),
        nameBn: input.nameBn?.trim(),
        slug,
        description: input.description,
        bannerUrl: input.bannerUrl,
        status,
        releaseAt,
        endAt,
        isFeatured: input.isFeatured ?? false,
        countdownOn: input.countdownOn ?? true,
        notifyOn: input.notifyOn ?? true,
        products: productIds.length
          ? {
              create: productIds.map((pid, idx) => ({
                productId: pid,
                position: idx,
              })),
            }
          : undefined,
      },
      select: DROP_WITH_PRODUCTS,
    });

    return drop;
  }

  /**
   * Update an existing drop.
   */
  static async update(
    id: string,
    input: UpdateDropInput,
    prisma: PrismaClient
  ) {
    const existing = await prisma.drop.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!existing) {
      throw new NotFoundError('Drop not found');
    }

    const data: Prisma.DropUpdateInput = {};

    if (input.name !== undefined) data.name = input.name.trim();
    if (input.nameBn !== undefined) data.nameBn = input.nameBn?.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.bannerUrl !== undefined) data.bannerUrl = input.bannerUrl;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.countdownOn !== undefined) data.countdownOn = input.countdownOn;
    if (input.notifyOn !== undefined) data.notifyOn = input.notifyOn;
    if (input.status !== undefined) data.status = input.status;

    if (input.releaseAt !== undefined) {
      const releaseAt = new Date(input.releaseAt);
      if (isNaN(releaseAt.getTime())) {
        throw new BadRequestError('Invalid releaseAt date');
      }
      data.releaseAt = releaseAt;
    }

    if (input.endAt !== undefined) {
      if (input.endAt === null) {
        data.endAt = null;
      } else {
        const endAt = new Date(input.endAt);
        if (isNaN(endAt.getTime())) {
          throw new BadRequestError('Invalid endAt date');
        }
        data.endAt = endAt;
      }
    }

    // Update products if provided (replace all)
    if (input.productIds) {
      if (input.productIds.length > 0) {
        const existingProducts = await prisma.product.findMany({
          where: { id: { in: input.productIds } },
          select: { id: true },
        });
        if (existingProducts.length !== input.productIds.length) {
          throw new BadRequestError('One or more product IDs are invalid');
        }
      }

      await prisma.dropProduct.deleteMany({ where: { dropId: id } });

      if (input.productIds.length > 0) {
        data.products = {
          create: input.productIds.map((pid, idx) => ({
            productId: pid,
            position: idx,
          })),
        };
      }
    }

    const drop = await prisma.drop.update({
      where: { id },
      data,
      select: DROP_WITH_PRODUCTS,
    });

    return drop;
  }

  /**
   * Add products to a drop (append, not replace).
   */
  static async addProducts(
    dropId: string,
    productIds: string[],
    prisma: PrismaClient
  ) {
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      select: { id: true },
    });
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    if (productIds.length === 0) {
      throw new BadRequestError('At least one product ID is required');
    }

    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (existingProducts.length !== productIds.length) {
      throw new BadRequestError('One or more product IDs are invalid');
    }

    // Get current max position
    const last = await prisma.dropProduct.findFirst({
      where: { dropId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const startPos = (last?.position ?? -1) + 1;

    await prisma.dropProduct.createMany({
      data: productIds.map((pid, idx) => ({
        dropId,
        productId: pid,
        position: startPos + idx,
      })),
      skipDuplicates: true,
    });

    const updated = await prisma.drop.findUnique({
      where: { id: dropId },
      select: DROP_WITH_PRODUCTS,
    });

    return updated;
  }

  /**
   * Remove a product from a drop.
   */
  static async removeProduct(
    dropId: string,
    productId: string,
    prisma: PrismaClient
  ) {
    await prisma.dropProduct.deleteMany({
      where: { dropId, productId },
    });
    return { removed: true };
  }

  /**
   * Delete a drop.
   */
  static async remove(id: string, prisma: PrismaClient) {
    const existing = await prisma.drop.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundError('Drop not found');
    }

    await prisma.drop.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Get drop by ID (admin).
   */
  static async getById(id: string, prisma: PrismaClient) {
    const drop = await prisma.drop.findUnique({
      where: { id },
      select: DROP_WITH_PRODUCTS,
    });
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    return {
      ...drop,
      status: this.computeStatus({
        status: drop.status,
        releaseAt: drop.releaseAt,
        endAt: drop.endAt,
      }),
    };
  }

  /**
   * Get drop by slug (public — only LIVE or SCHEDULED).
   */
  static async getBySlug(slug: string, prisma: PrismaClient) {
    const drop = await prisma.drop.findUnique({
      where: { slug },
      select: DROP_WITH_PRODUCTS,
    });
    if (!drop) {
      throw new NotFoundError('Drop not found');
    }

    const effectiveStatus = this.computeStatus({
      status: drop.status,
      releaseAt: drop.releaseAt,
      endAt: drop.endAt,
    });

    // Public can only view LIVE or SCHEDULED drops
    if (effectiveStatus === 'DRAFT' || effectiveStatus === 'ENDED') {
      throw new NotFoundError('Drop not available');
    }

    // Filter out inactive products for public view
    const filteredProducts = drop.products.filter((dp) => dp.product.active);

    return {
      ...drop,
      status: effectiveStatus,
      products: filteredProducts,
    };
  }

  /**
   * List drops.
   * - Public: only LIVE + SCHEDULED
   * - Admin: all
   */
  static async list(
    filters: ListFilters,
    prisma: PrismaClient,
    admin = false
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DropWhereInput = {};
    const now = new Date();

    if (admin) {
      if (filters.status) where.status = filters.status;
    } else {
      // Public: LIVE + SCHEDULED only
      where.OR = [
        {
          status: 'LIVE',
          releaseAt: { lte: now },
          OR: [{ endAt: null }, { endAt: { gt: now } }],
        },
        {
          status: 'SCHEDULED',
          releaseAt: { gt: now },
        },
      ];
    }

    if (filters.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    const [items, total] = await Promise.all([
      prisma.drop.findMany({
        where,
        orderBy: { releaseAt: 'desc' },
        skip,
        take: limit,
        select: DROP_SELECT,
      }),
      prisma.drop.count({ where }),
    ]);

    // Compute effective status for each
    const enriched = items.map((d) => ({
      ...d,
      status: this.computeStatus({
        status: d.status,
        releaseAt: d.releaseAt,
        endAt: d.endAt,
      }),
    }));

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate URL-safe slug.
   */
  private static generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80) +
      '-' +
      Math.random().toString(36).substring(2, 6)
    );
  }
}