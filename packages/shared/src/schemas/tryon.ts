import { z } from 'zod';

export const TryOnSettingsSchema = z.object({
  enabled: z.boolean(),
  modelHeight: z.string().max(50),
  modelSkin: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Hex colour din'),
  modelHair: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Hex colour din'),
  stageBg: z.string().max(200),
  defaultScale: z.number().int().min(40).max(200),
  defaultY: z.number().int().min(-200).max(200),
  minScale: z.number().int().min(40).max(200),
  maxScale: z.number().int().min(40).max(200),
  minY: z.number().int().min(-200).max(200),
  maxY: z.number().int().min(-200).max(200),
  note: z.string().max(300),
});

export type TryOnSettingsInput = z.infer<typeof TryOnSettingsSchema>;