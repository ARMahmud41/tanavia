import type { TryOnSettings } from './tryon.js';

export interface CourierSettings {
  active: 'steadfast' | 'pathao';
  steadfast: { enabled: boolean; base: string };
  pathao: { enabled: boolean; base: string; storeId: string };
}

export interface PaymentSettings {
  cod: boolean;
  bkash: { on: boolean; type: 'Merchant' | 'Personal' };
  nagad: { on: boolean; type: 'Merchant' | 'Personal' };
  rocket: { on: boolean; type: 'Merchant' | 'Personal' };
  card: { on: boolean; provider: string };
}

export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  currency: string;
  freeShipOver: number;
  deliveryInside: number;
  deliveryOutside: number;
  vatPercent: number;
  lowStockAt: number;
  tryon: TryOnSettings;
  courier: CourierSettings;
  pay: PaymentSettings;
}