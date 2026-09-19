import type { ID, Timestamps } from './common.js';

export interface Variant {
  id: ID;
  productId: ID;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

export interface Product extends Timestamps {
  id: ID;
  slug: string;
  name: string;
  nameBn?: string | null;
  description: string;
  descriptionBn?: string | null;
  category: string;
  brand: string;
  sku: string;
  barcode: string;
  cost: number;
  price: number;
  discount: number;
  active: boolean;
  featured: boolean;
  tryable: boolean;
  shape: string;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants: Variant[];
}

export type PublicProduct = Omit<Product, 'cost'>;

export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  inStock?: boolean;
  sort?: 'new' | 'lh' | 'hl' | 'disc';
}