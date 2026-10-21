import { z } from 'zod';

export const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  position: z.number().int().default(0),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  
  // 🟢 নতুন ব্যানার ফিল্ডসমূহ
  bannerTitle: z.string().optional().nullable(),
  bannerSubtitle: z.string().optional().nullable(),
  bannerImage: z.string().optional().nullable(),
  bannerColor: z.string().optional().nullable(),
});

export const CategoryUpdateSchema = CategoryInputSchema.partial();

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;