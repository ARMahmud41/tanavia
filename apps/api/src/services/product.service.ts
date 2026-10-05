import type { PrismaClient, Prisma } from '@prisma/client';
import { BarcodeService } from './barcode.service.js';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';

interface VariantInput {
  size: string;
  color: string;
  qty: number;
}

interface ProductImageInput {
  url: string;
  alt?: string | null;
  position?: number;
  isPrimary?: boolean;
}

interface CreateProductInput {
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
  category?: string;
  categoryId?: string;
  brand?: string;
  cost: number;
  price: number;
  discount?: number;
  shape: string;
  images?: string[];
  productImages?: ProductImageInput[];
  tags?: string[];
  active?: boolean;
  featured?: boolean;
  tryable?: boolean;
  barcode?: string;
  sku?: string;
  lowStockAt?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  metaTitle?: string | null;
  metaDescription?: string | null;
  variants?: VariantInput[];
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

interface ListFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  active?: boolean;
  inStock?: boolean;
  sort?: 'new' | 'lh' | 'hl' | 'disc';
  page?: number;
  limit?: number;
}

// ============================================
// Selects — 3 levels (PUBLIC / STAFF / ADMIN)
// ============================================

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  nameBn: true,
  description: true,
  descriptionBn: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, nameBn: true, slug: true },
  },
  brand: true,
  sku: true,
  barcode: true,
  price: true,
  discount: true,
  status: true,
  active: true,
  featured: true,
  tryable: true,
  shape: true,
  productImages: {
    orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
    select: {
      id: true,
      url: true,
      alt: true,
      position: true,
      isPrimary: true,
    },
  },
  tags: true,
  rating: true,
  reviewCount: true,
  soldCount: true,
  lowStockAt: true,
  metaTitle: true,
  metaDescription: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    select: {
      id: true,
      sku: true,
      barcode: true,
      size: true,
      color: true,
      qty: true,
      reserved: true,
      reorderLevel: true,
    },
  },
} satisfies Prisma.ProductSelect;

// STAFF = PUBLIC + deletedAt visibility, no cost
const STAFF_SELECT = {
  ...PUBLIC_SELECT,
  deletedAt: true,
} satisfies Prisma.ProductSelect;

// ADMIN = STAFF + cost + deletion audit
const ADMIN_SELECT = {
  ...STAFF_SELECT,
  cost: true,
  deletedById: true,
  deletedReason: true,
} satisfies Prisma.ProductSelect;

// Helper — get select by role
function selectForRole(role: 'PUBLIC' | 'STAFF' | 'ADMIN') {
  if (role === 'ADMIN') return ADMIN_SELECT;
  if (role === 'STAFF') return STAFF_SELECT;
  return PUBLIC_SELECT;
}

export class ProductService {
  /**
   * Create a new product with variants.
   */
  static async create(input: CreateProductInput, prisma: PrismaClient) {
    const barcode =
      input.barcode && BarcodeService.isValidBarcode(input.barcode)
        ? input.barcode
        : await BarcodeService.generateBarcode(prisma);

    const existingBarcode = await prisma.product.findUnique({
      where: { barcode },
      select: { id: true },
    });
    if (existingBarcode) {
      throw new ConflictError('This barcode is already in use');
    }

    const sku =
      input.sku ||
      (await BarcodeService.generateSku(input.category || 'general', prisma));

    const existingSku = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existingSku) {
      throw new ConflictError('This SKU is already in use');
    }

    const slug = BarcodeService.generateSlug(input.name);

    if (!input.variants || input.variants.length === 0) {
      throw new BadRequestError('At least one variant is required');
    }

    const product = await prisma.product.create({
      data: {
        name: input.name.trim(),
        nameBn: input.nameBn?.trim(),
        description: input.description,
        descriptionBn: input.descriptionBn,
        categoryId: input.categoryId || null,
        categoryLegacy: input.category || null,
        brand: input.brand || 'TANAVIA',
        cost: input.cost,
        price: input.price,
        discount: input.discount || 0,
        shape: input.shape,
        images: input.images || [],
        tags: input.tags || [],
        active: input.active ?? true,
        featured: input.featured ?? false,
        tryable: input.tryable ?? true,
        lowStockAt: input.lowStockAt ?? 5,
        status: input.status || 'ACTIVE',
        metaTitle: input.metaTitle || null,
        metaDescription: input.metaDescription || null,
        barcode,
        sku,
        slug,
        variants: {
          create: input.variants.map((v, i) => {
            const sizeCode = v.size
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 4);
            const colorCode = v.color
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
              .slice(0, 3);
            const serial = (i + 1).toString().padStart(2, '0');
            return {
              size: v.size,
              color: v.color,
              qty: v.qty,
              sku: `${sku}-${sizeCode}-${colorCode}`,
              barcode: `${barcode}-${serial}`,
            };
          }),
        },
        productImages: input.productImages?.length
          ? {
              create: input.productImages.map((img, i) => ({
                url: img.url,
                alt: img.alt ?? null,
                position: img.position ?? i,
                isPrimary: img.isPrimary ?? i === 0,
              })),
            }
          : undefined,
      },
      select: ADMIN_SELECT,
    });

    return product;
  }

  /**
   * Update an existing product.
   */
  static async update(
    id: string,
    input: UpdateProductInput,
    prisma: PrismaClient
  ) {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, barcode: true, sku: true },
    });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (input.barcode && input.barcode !== existing.barcode) {
      if (!BarcodeService.isValidBarcode(input.barcode)) {
        throw new BadRequestError('Barcode must be exactly 12 digits');
      }
      const barcodeTaken = await prisma.product.findUnique({
        where: { barcode: input.barcode },
        select: { id: true },
      });
      if (barcodeTaken && barcodeTaken.id !== id) {
        throw new ConflictError('This barcode is already in use');
      }
    }

    if (input.sku && input.sku !== existing.sku) {
      const skuTaken = await prisma.product.findUnique({
        where: { sku: input.sku },
        select: { id: true },
      });
      if (skuTaken && skuTaken.id !== id) {
        throw new ConflictError('This SKU is already in use');
      }
    }

    const data: Prisma.ProductUpdateInput = {};

    if (input.name !== undefined) data.name = input.name.trim();
    if (input.nameBn !== undefined) data.nameBn = input.nameBn?.trim() || null;
    if (input.description !== undefined) data.description = input.description;
    if (input.descriptionBn !== undefined)
      data.descriptionBn = input.descriptionBn?.trim() || null;
    if (input.category !== undefined) data.categoryLegacy = input.category;
    if (input.categoryId !== undefined) {
      data.category = input.categoryId
        ? { connect: { id: input.categoryId } }
        : { disconnect: true };
    }
    if (input.status !== undefined) data.status = input.status as any;
    if (input.lowStockAt !== undefined) data.lowStockAt = input.lowStockAt;
    if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle || null;
    if (input.metaDescription !== undefined)
      data.metaDescription = input.metaDescription || null;

    if (input.brand !== undefined) data.brand = input.brand;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.price !== undefined) data.price = input.price;
    if (input.discount !== undefined) data.discount = input.discount;
    if (input.shape !== undefined) data.shape = input.shape;
    if (input.images !== undefined) data.images = input.images;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.active !== undefined) data.active = input.active;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.tryable !== undefined) data.tryable = input.tryable;
    if (input.barcode !== undefined) data.barcode = input.barcode;
    if (input.sku !== undefined) data.sku = input.sku;

    if (input.variants) {
      if (input.variants.length === 0) {
        throw new BadRequestError('At least one variant is required');
      }

      await prisma.variant.deleteMany({ where: { productId: id } });

      data.variants = {
        create: input.variants.map((v) => ({
          size: v.size,
          color: v.color,
          qty: v.qty,
        })),
      };
    }

    // Handle productImages update (transaction-safe)
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // If productImages provided, replace all images
      if (input.productImages !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });

        if (input.productImages.length > 0) {
          await tx.productImage.createMany({
            data: input.productImages.map((img, i) => ({
              productId: id,
              url: img.url,
              alt: img.alt || null,
              position: img.position ?? i,
              isPrimary: img.isPrimary ?? i === 0,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id },
        data,
        select: ADMIN_SELECT,
      });
    });

    return updatedProduct;
  }

  /**
   * Soft or hard delete.
   */
  static async remove(
    id: string,
    hard: boolean,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    if (hard) {
      const orderCount = await prisma.orderItem.count({
        where: { productId: id },
      });
      if (orderCount > 0) {
        throw new ConflictError(
          'Cannot delete product with existing orders. Archive it instead.'
        );
      }
      await prisma.product.delete({ where: { id } });
      return { success: true, hard: true };
    }

    // Soft delete (archive)
    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        active: false,
        deletedAt: new Date(),
        deletedById: actorId || null,
        deletedReason: 'Archived by admin',
      },
      select: ADMIN_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'PRODUCT_ARCHIVE',
          detail: `Archived product: ${existing.name}`,
        },
      });
    }

    return { success: true, product: updated };
  }

  /**
   * Get product by ID.
   */
  static async getById(
    id: string,
    prisma: PrismaClient,
    role: 'PUBLIC' | 'STAFF' | 'ADMIN' = 'PUBLIC'
  ) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: selectForRole(role),
    });
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  /**
   * Get product by slug.
   */
  static async getBySlug(
    slug: string,
    prisma: PrismaClient,
    role: 'PUBLIC' | 'STAFF' | 'ADMIN' = 'PUBLIC'
  ) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: selectForRole(role),
    });
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  /**
   * List products with filters + pagination.
   */
  static async list(
    filters: ListFilters,
    prisma: PrismaClient,
    role: 'PUBLIC' | 'STAFF' | 'ADMIN' = 'PUBLIC'
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (role === 'PUBLIC') {
      where.active = true;
    } else if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.category) {
      // Support both categoryId and legacy category name/slug
      where.OR = [
        { categoryId: filters.category },
        { category: { slug: filters.category } },
        { category: { name: filters.category } },
      ];
    }

    // Hide soft-deleted products except for admin
    if (role !== 'ADMIN') {
      where.deletedAt = null;
    }

    if (filters.featured !== undefined) where.featured = filters.featured;

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameBn: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (filters.minPrice !== undefined) priceFilter.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) priceFilter.lte = filters.maxPrice;
      where.price = priceFilter;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sort === 'lh') orderBy = { price: 'asc' };
    if (filters.sort === 'hl') orderBy = { price: 'desc' };
    if (filters.sort === 'disc') orderBy = { discount: 'desc' };
    if (filters.sort === 'new') orderBy = { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: selectForRole(role),
      }),
      prisma.product.count({ where }),
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

  /**
   * Dashboard stats for products list page.
   */
  static async stats(
    role: 'PUBLIC' | 'STAFF' | 'ADMIN' = 'PUBLIC',
    prisma: PrismaClient
  ) {
    const baseWhere: Prisma.ProductWhereInput =
      role === 'ADMIN' ? {} : { deletedAt: null };

    const [total, active, draft, archived] = await Promise.all([
      prisma.product.count({ where: baseWhere }),
      prisma.product.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.product.count({ where: { ...baseWhere, status: 'DRAFT' } }),
      prisma.product.count({ where: { ...baseWhere, status: 'ARCHIVED' } }),
    ]);

    // Low stock: compute manually (reorderLevel is per-variant)
    const products = await prisma.product.findMany({
      where: baseWhere,
      select: {
        id: true,
        variants: { select: { qty: true, reorderLevel: true } },
      },
    });
    const lowOrOut = products.filter((p) =>
      p.variants.some((v) => v.qty <= v.reorderLevel)
    ).length;

    return { total, active, draft, archived, lowOrOut };
  }

  /**
   * Stock movement history for a product.
   */
  static async getMovements(
    productId: string,
    options: { limit?: number } = {},
    prisma: PrismaClient
  ) {
    const limit = Math.min(200, Math.max(1, options.limit || 50));

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        variant: {
          select: { id: true, size: true, color: true, sku: true },
        },
      },
    });

    return movements;
  }

  /**
   * Duplicate a product (copies variants, images, attributes).
   */
  static async duplicate(
    id: string,
    prisma: PrismaClient,
    actorId: string
  ) {
    const original = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        productImages: true,
      },
    });

    if (!original) throw new NotFoundError('Product not found');

    // Generate new slug
    const baseSlug = original.slug + '-copy';
    let slug = baseSlug;
    let n = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      n++;
      slug = `${baseSlug}-${n}`;
    }

    // Generate new SKU + barcode
    const newSku = `${original.sku}-COPY-${Date.now().toString().slice(-4)}`;
    const newBarcode = await BarcodeService.generateBarcode(prisma);

    const duplicate = await prisma.product.create({
      data: {
        slug,
        name: `${original.name} (Copy)`,
        nameBn: original.nameBn,
        description: original.description,
        descriptionBn: original.descriptionBn,
        categoryId: original.categoryId,
        categoryLegacy: original.categoryLegacy,
        brand: original.brand,
        sku: newSku,
        barcode: newBarcode,
        cost: original.cost,
        price: original.price,
        discount: original.discount,
        status: 'DRAFT',
        active: false,
        featured: false,
        tryable: original.tryable,
        shape: original.shape,
        tags: original.tags,
        lowStockAt: original.lowStockAt,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        variants: {
          create: original.variants.map((v) => ({
            size: v.size,
            color: v.color,
            qty: 0,
            reserved: 0,
            reorderLevel: v.reorderLevel,
          })),
        },
        productImages: {
          create: original.productImages.map((img) => ({
            url: img.url,
            alt: img.alt,
            position: img.position,
            isPrimary: img.isPrimary,
          })),
        },
      },
      select: ADMIN_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        actor: actorId,
        action: 'PRODUCT_DUPLICATE',
        detail: `Duplicated ${original.name} → ${duplicate.name}`,
      },
    });

    return duplicate;
  }

  /**
   * Regenerate barcode.
   */
  static async regenerateBarcode(id: string, prisma: PrismaClient) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const barcode = await BarcodeService.generateBarcode(prisma);

    const updated = await prisma.product.update({
      where: { id },
      data: { barcode },
      select: ADMIN_SELECT,
    });

    return updated;
  }
}