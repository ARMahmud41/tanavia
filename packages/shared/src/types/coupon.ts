import type { ID, Timestamps } from './common.js';

export type CouponType = 'percent' | 'fixed' | 'shipping';

export interface Coupon extends Timestamps {
  id: ID;
  code: string;
  type: CouponType;
  value: number;
  minSpend: number;
  usageLimit: number | null;
  usedCount: number;
  perUser: number;
  active: boolean;
  expiresAt: string | null;
}