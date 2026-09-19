import { z } from 'zod';
import { PAYMENT_METHODS, BD_DISTRICTS } from '../constants/index.js';

export const PlaceOrderItemSchema = z.object({
  productId: z.string().cuid(),
  size: z.string().min(1).max(20),
  color: z.string().min(1).max(30),
  qty: z.number().int().min(1).max(10),
});

export const PlaceOrderSchema = z.object({
  customerName: z.string().min(3).max(100),
  customerPhone: z.string().regex(/^01[3-9]\d{8}$/, 'Sothik 11 digit mobile number din'),
  customerEmail: z.string().email().optional(),
  address: z.string().min(10).max(500),
  district: z.enum([...BD_DISTRICTS] as [string, ...string[]]),
  note: z.string().max(300).optional(),
  paymentMethod: z.enum([...PAYMENT_METHODS] as [string, ...string[]]),
  paymentTxId: z.string().min(4).max(50).optional(),
  couponCode: z.string().max(30).optional(),
  items: z.array(PlaceOrderItemSchema).min(1).max(20),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['placed','confirmed','packed','shipped','delivered','cancelled','returned']),
  note: z.string().max(300).optional(),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;