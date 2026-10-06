import { z } from 'zod';

// ============================================
// Courier input schemas
// ============================================

export const CourierInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().max(100).optional(),
  logo: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  apiBaseUrl: z.string().url().optional().or(z.literal('')),
  apiKey: z.string().max(200).optional(),
  apiSecret: z.string().max(200).optional(),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  codEnabled: z.boolean().optional(),
  codFeePercent: z.number().min(0).max(100).optional(),
  codFeeFixed: z.number().min(0).optional(),
  contactPerson: z.string().max(100).optional(),
  paymentCycle: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export const CourierUpdateSchema = CourierInputSchema.partial();

export const CourierFiltersSchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
});

// ============================================
// Courier rate schemas
// ============================================

export const CourierRateInputSchema = z.object({
  district: z.string().min(1, 'District is required').max(100),
  weightUpTo: z.number().min(0).optional(),
  deliveryFee: z.number().min(0),
  extraPerKg: z.number().min(0).optional(),
  codFee: z.number().min(0).optional(),
  returnFee: z.number().min(0),
  active: z.boolean().optional(),
});

export const CourierRateUpdateSchema = CourierRateInputSchema.partial();

export const CourierRateImportSchema = z.object({
  rows: z.array(CourierRateInputSchema).min(1),
});

export const CourierCalculateSchema = z.object({
  district: z.string().min(1),
  weightKg: z.number().min(0),
  codAmount: z.number().min(0).optional(),
});

// ============================================
// Types
// ============================================

export type CourierInput = z.infer<typeof CourierInputSchema>;
export type CourierUpdateInput = z.infer<typeof CourierUpdateSchema>;
export type CourierFiltersInput = z.infer<typeof CourierFiltersSchema>;
export type CourierRateInput = z.infer<typeof CourierRateInputSchema>;
export type CourierRateUpdateInput = z.infer<typeof CourierRateUpdateSchema>;
export type CourierCalculateInput = z.infer<typeof CourierCalculateSchema>;