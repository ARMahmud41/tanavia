import type { ID, Timestamps } from './common.js';

export type OrderStatus =
  | 'placed' | 'confirmed' | 'packed'
  | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export type PaymentStatus = 'pending' | 'review' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD';

export interface OrderItem {
  id: ID;
  orderId: ID;
  productId: ID;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  cost: number;
}

export interface OrderEvent {
  id: ID;
  orderId: ID;
  status: string;
  note?: string | null;
  actor?: string | null;
  createdAt: string;
}

export interface Order extends Timestamps {
  id: ID;
  orderNumber: string;
  userId: ID | null;
  status: OrderStatus;

  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address: string;
  district: string;
  note?: string | null;

  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string | null;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTxId?: string | null;

  courier?: string | null;
  consignmentId?: string | null;
  courierStatus?: string | null;

  items: OrderItem[];
  events: OrderEvent[];
}

export interface CartLine {
  productId: ID;
  size: string;
  color: string;
  qty: number;
  name: string;
  price: number;
  slug: string;
  shape: string;
  image?: string;
}