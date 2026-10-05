import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface CreateCategoryInput {
  name: string;
  nameBn?: string;
  description?: string;
  image?: string;
  position?: number;
  featured?: boolean;
  active?: boolean;
}

interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

// ============================================
// Selects
// ============================================
const CATEGORY_SELECT = {
  id: true,
  name: true,
  nameBn: true,
  slug: true,
  description: true,
  image: true,
  position: true,
  featured: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { products: true },
  },
} satisfies Prisma.CategorySelect;

// ============================================
// Helpers
// ============================================
function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// Category Service
// ============================================
export class CategoryService {
  /**
   * List all categories.
   */
  static async list(
    filters: { active?: boolean; featured?: boolean } = {},
    prisma: PrismaClient
  ) {
    const where: Prisma.CategoryWhereInput = {};
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.featured !== undefined) where.featured = filters.featured;

    return prisma.category.findMany({
      where,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: CATEGORY_SELECT,
    });
  }

  /**
   * Get by ID.
   */
  static async getById(id: string, prisma: PrismaClient) {
    const category = await prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  /**
   * Get by slug.
   */
  static async getBySlug(slug: string, prisma: PrismaClient) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: CATEGORY_SELECT,
    });
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  /**
   * Create category.
   */
  static async create(
    input: CreateCategoryInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.name?.trim()) {
      throw new BadRequestError('Category name is required');
    }

    const name = input.name.trim();

    // Check duplicate name
    const existing = await prisma.category.findFirst({
      where: { name },
    });
    if (existing) {
      throw new ConflictError('Category with this name already exists');
    }

    // Generate unique slug
    let slug = slugify(name);
    let baseSlug = slug;
    let n = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      n++;
      slug = `${baseSlug}-${n}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        nameBn: input.nameBn?.trim() || null,
        slug,
        description: input.description?.trim() || null,
        image: input.image || null,
        position: input.position ?? 0,
        featured: input.featured ?? false,
        active: input.active ?? true,
      },
      select: CATEGORY_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CATEGORY_CREATE',
          detail: `Created category: ${category.name}`,
        },
      });
    }

    return category;
  }

  /**
   * Update category.
   */
  static async update(
    id: string,
    input: UpdateCategoryInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
    if (!existing) throw new NotFoundError('Category not found');

    const data: Prisma.CategoryUpdateInput = {};

    if (input.name !== undefined) {
      const newName = input.name.trim();
      if (newName && newName !== existing.name) {
        // Check duplicate
        const dup = await prisma.category.findFirst({
          where: { name: newName, id: { not: id } },
        });
        if (dup) throw new ConflictError('Category name already in use');
        data.name = newName;
        // Regenerate slug
        let newSlug = slugify(newName);
        let baseSlug = newSlug;
        let n = 1;
        while (
          await prisma.category.findFirst({
            where: { slug: newSlug, id: { not: id } },
          })
        ) {
          n++;
          newSlug = `${baseSlug}-${n}`;
        }
        data.slug = newSlug;
      }
    }

    if (input.nameBn !== undefined) data.nameBn = input.nameBn?.trim() || null;
    if (input.description !== undefined)
      data.description = input.description?.trim() || null;
    if (input.image !== undefined) data.image = input.image || null;
    if (input.position !== undefined) data.position = input.position;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.active !== undefined) data.active = input.active;

    const updated = await prisma.category.update({
      where: { id },
      data,
      select: CATEGORY_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CATEGORY_UPDATE',
          detail: `Updated category: ${updated.name}`,
        },
      });
    }

    return updated;
  }

  /**
   * Delete category (blocks if products exist).
   */
  static async remove(id: string, prisma: PrismaClient, actorId?: string) {
    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { products: true } } },
    });
    if (!existing) throw new NotFoundError('Category not found');

    if (existing._count.products > 0) {
      throw new ConflictError(
        `Cannot delete "${existing.name}" — ${existing._count.products} product(s) still use it. Reassign them first.`
      );
    }

    await prisma.category.delete({ where: { id } });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CATEGORY_DELETE',
          detail: `Deleted category: ${existing.name}`,
        },
      });
    }

    return { success: true };
  }

  /**
   * Reorder categories.
   */
  static async reorder(
    order: Array<{ id: string; position: number }>,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!Array.isArray(order) || order.length === 0) {
      throw new BadRequestError('Order array is required');
    }

    await prisma.$transaction(
      order.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'CATEGORY_REORDER',
          detail: `Reordered ${order.length} categories`,
        },
      });
    }

    return { success: true };
  }
}