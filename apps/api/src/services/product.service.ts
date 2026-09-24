import type { PrismaClient, Prisma } from '@prisma/client';
import { BarcodeService } from './barcode.service.js';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';

interface VariantInput {
  size: string;
  color: string;
  qty: number;
}

interface CreateProductInput {
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
  category: string;
  brand?: string;
  cost: number;
  price: number;
  discount?: number;
  shape: string;
  images?: string[];
  tags?: string[];
  active?: boolean;
  featured?: boolean;
  tryable?: boolean;
  barcode?: string;
  sku?: string;
  variants: VariantInput[];
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

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  nameBn: true,
  description: true,
  descriptionBn: true,
  category: true,
  brand: true,
  sku: true,
  barcode: true,
  price: true,
  discount: true,
  active: true,
  featured: true,
  tryable: true,
  shape: true,
  images: true,
  tags: true,
  rating: true,
  reviewCount: true,
  soldCount: true,
  createdAt: true,
  updatedAt: true,
  variants: {
    select: {
      id: true,
      size: true,
      color: true,
      qty: true,
      reserved: true,
    },
  },
} satisfies Prisma.ProductSelect;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  cost: true,
} satisfies Prisma.ProductSelect;

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
      input.sku || (await BarcodeService.generateSku(input.category, prisma));

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
        category: input.category,
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
        barcode,
        sku,
        slug,
        status: 'ACTIVE',
        variants: {
          create: input.variants.map((v) => ({
            size: v.size,
            color: v.color,
            qty: v.qty,
          })),
        },
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
    if (input.nameBn !== undefined) data.nameBn = input.nameBn?.trim();
    if (input.description !== undefined) data.description = input.description;
    if (input.descriptionBn !== undefined) data.descriptionBn = input.descriptionBn;
    if (input.category !== undefined) data.category = input.category;
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

    const product = await prisma.product.update({
      where: { id },
      data,
      select: ADMIN_SELECT,
    });

    return product;
  }

  /**
   * Soft or hard delete.
   */
  static async remove(id: string, hard: boolean, prisma: PrismaClient) {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
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
          'Cannot delete product with existing orders. Mark it inactive instead.'
        );
      }
      await prisma.product.delete({ where: { id } });
      return { deleted: true, hard: true };
    }

    await prisma.product.update({
      where: { id },
      data: { active: false, status: 'ARCHIVED' },
    });
    return { deleted: true, hard: false };
  }

  /**
   * Get product by ID.
   */
  static async getById(id: string, prisma: PrismaClient, admin = false) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: admin ? ADMIN_SELECT : PUBLIC_SELECT,
    });
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  /**
   * Get product by slug.
   */
  static async getBySlug(slug: string, prisma: PrismaClient, admin = false) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: admin ? ADMIN_SELECT : PUBLIC_SELECT,
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
    admin = false
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (!admin) {
      where.active = true;
    } else if (filters.active !== undefined) {
      where.active = filters.active;
    }

    if (filters.category) where.category = filters.category;
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
        select: admin ? ADMIN_SELECT : PUBLIC_SELECT,
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