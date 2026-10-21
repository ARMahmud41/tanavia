import { z } from 'zod';
import { PAYMENT_METHODS, BD_DISTRICTS } from '../constants/index.js';

export const PlaceOrderItemSchema = z.object({
  productId: z.string().cuid(),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(30),
  qty: z.number().int().min(1).max(10),
});

export const PlaceOrderSchema = z.object({
  customerName: z.string().min(2, 'Name is too short').max(100),
  customerPhone: z.string().regex(/^01[3-9]\d{8}$/, 'Valid 11-digit phone required'),
  customerEmail: z.string().email().optional().or(z.literal('')).nullable().optional(),
  address: z.string().min(5, 'Address is too short').max(500),
  
  // 🟢 নতুন ফিল্ড
  area: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  upazila: z.string().optional().nullable(),
  
  note: z.string().optional().nullable(),
  paymentMethod: z.enum(['COD', 'BKASH', 'NAGAD', 'ROCKET', 'CARD']),
  paymentTxId: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string(),
      size: z.string(),
      color: z.string(),
      qty: z.number().int().positive(),
    })
  ).min(1, 'At least one item required'),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['placed','confirmed','packed','shipped','delivered','cancelled','returned']),
  note: z.string().max(300).optional(),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;