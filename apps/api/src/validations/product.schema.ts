import { z } from 'zod';

// ============================================
// ENUMS (mirror Prisma)
// ============================================
export const ProductStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
]);

// ============================================
// VARIANT
// ============================================
export const VariantInputSchema = z.object({
  size: z.string().min(1, 'Size is required').max(20),
  color: z.string().min(1, 'Color is required').max(50),
  qty: z.coerce.number().int().min(0, 'Qty cannot be negative'),
});

export type VariantInput = z.infer<typeof VariantInputSchema>;

// ============================================
// PRODUCT IMAGE
// ============================================
export const ProductImageInputSchema = z.object({
  url: z.string().min(1, 'Image URL is required'),
  alt: z.string().max(200).optional(),
  color: z.string().max(50).nullable().optional(),
  position: z.coerce.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
});

export type ProductImageInput = z.infer<typeof ProductImageInputSchema>;

// ============================================
// PRODUCT INPUT (create)
// ============================================
export const ProductInputSchema = z.object({
  // Basic info
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name too long'),
  nameBn: z.string().max(200).optional(),
  description: z.string().min(1, 'Description is required'),
  descriptionBn: z.string().optional(),

  // Category
  category: z.string().optional(),         // legacy string
  categoryId: z.string().optional(),       // FK

  // Brand + shape
  brand: z.string().max(100).optional(),
  shape: z.string().min(1, 'Shape is required').max(50),

  // Pricing
  cost: z.coerce.number().min(0, 'Cost cannot be negative'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  discount: z.coerce.number().int().min(0).max(100).optional(),

  // Flags
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  tryable: z.boolean().optional(),
  freeDelivery: z.boolean().optional(),

  // Stock control
  lowStockAt: z.coerce.number().int().min(0).optional(),

  // Media
  images: z.array(z.string()).optional(),
  productImages: z.array(ProductImageInputSchema).optional(),

  // Metadata
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(200).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),

  // Identifiers
  barcode: z.string().optional(),
  sku: z.string().optional(),

  // Status
  status: ProductStatusSchema.optional(),

  // Variants
  variants: z
    .array(VariantInputSchema)
    .min(1, 'At least one variant is required'),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;

// ============================================
// PRODUCT UPDATE (partial)
// ============================================
export const ProductUpdateSchema = ProductInputSchema.partial();

export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

// ============================================
// LIST FILTERS (query params)
// ============================================
export const ProductFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  offer: z.string().optional(),                 // special offer tag
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  featured: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['new', 'lh', 'hl', 'disc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ProductFiltersInput = z.infer<typeof ProductFiltersSchema>;

// ============================================
// BARCODE REGENERATION
// ============================================
export const RegenerateBarcodeSchema = z.object({
  barcode: z
    .string()
    .regex(/^\d{12}$/, 'Barcode must be exactly 12 digits')
    .optional(),
});

export type RegenerateBarcodeInput = z.infer<typeof RegenerateBarcodeSchema>;

// ============================================
// DUPLICATE
// ============================================
export const DuplicateProductSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  slug: z.string().optional(),
  sku: z.string().optional(),
});

export type DuplicateProductInput = z.infer<typeof DuplicateProductSchema>;