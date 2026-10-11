import { z } from 'zod';
import { CATEGORY_KEYS, PRODUCT_SHAPES } from '../constants/index.js';

export const VariantInputSchema = z.object({
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(30),
  qty: z.number().int().min(0).max(100000),
});

export const ProductInputSchema = z
  .object({
    name: z.string().min(2).max(200),
    nameBn: z.string().max(200).optional(),
    description: z.string().min(10).max(5000),
    descriptionBn: z.string().max(5000).optional(),

    // Accept EITHER category (legacy string) OR categoryId (proper relation)
    category: z.string().max(50).optional(),
    categoryId: z.string().optional(),

    brand: z.string().max(50).default('TANAVIA'),
    cost: z.number().min(0),
    price: z.number().min(1),
    discount: z.number().int().min(0).max(90).default(0),

    // Free-text shape (any string up to 50 chars) — suggestions from PRODUCT_SHAPES
    shape: z.string().min(1).max(50).default('other'),

    images: z.array(z.string().url()).max(10).default([]),
    tags: z.array(z.string().max(30)).max(20).default([]),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    tryable: z.boolean().default(true),
    freeDelivery: z.boolean().default(false),
    barcode: z.string().regex(/^\d{8,14}$/).optional(),
    sku: z.string().max(30).optional(),
    lowStockAt: z.number().int().min(0).max(10000).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
    metaTitle: z.string().max(200).nullable().optional(),
    metaDescription: z.string().max(500).nullable().optional(),
    variants: z.array(VariantInputSchema).min(1).max(100),
  })
  .refine((data) => Boolean(data.category || data.categoryId), {
    message: 'Either category or categoryId is required',
    path: ['categoryId'],
  });

export const ProductFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().max(100).optional(),
  offer: z.string().max(50).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  featured: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['new', 'lh', 'hl', 'disc']).default('new'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductFiltersInput = z.infer<typeof ProductFiltersSchema>;
export type VariantInput = z.infer<typeof VariantInputSchema>;