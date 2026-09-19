// ============================================
// TANAVIA - Shared Constants
// ============================================

export const CATEGORIES = [
  { key: 'Men',         icon: 'shirt',   label: 'Men',         desc: 'Pants, shirts, t-shirts' },
  { key: 'Women',       icon: 'dress',   label: 'Women',       desc: 'Clothing, bags, more' },
  { key: 'Kids',        icon: 'kidset',  label: 'Kids',        desc: 'Boys, girls, sets' },
  { key: 'Shoes',       icon: 'shoe',    label: 'Shoes',       desc: 'Sneakers, formal' },
  { key: 'Bags',        icon: 'bag',     label: 'Bags',        desc: 'Backpacks, handbags' },
  { key: 'Accessories', icon: 'glasses', label: 'Accessories', desc: 'Watches, wallets, more' },
] as const;

export const CATEGORY_KEYS = CATEGORIES.map(c => c.key);

export const ORDER_STATUS = [
  'placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned',
] as const;

export const PAYMENT_STATUS = [
  'pending', 'review', 'paid', 'failed', 'refunded',
] as const;

export const PAYMENT_METHODS = [
  'COD', 'BKASH', 'NAGAD', 'ROCKET', 'CARD',
] as const;

export const COURIERS = ['steadfast', 'pathao'] as const;
export const ROLES = ['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'] as const;

export const PRODUCT_SHAPES = [
  'tee', 'shirt', 'jacket', 'hoodie', 'pant', 'dress',
  'kurti', 'shoe', 'bag', 'tote', 'backpack', 'glasses',
  'wallet', 'kidset', 'watch',
] as const;

export const BD_DISTRICTS = [
  'Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Sylhet', 'Barishal',
  'Rangpur', 'Mymensingh', 'Comilla', 'Narayanganj', 'Gazipur', 'Other',
] as const;

export const CURRENCY = 'Tk';

export const DEFAULT_DELIVERY = {
  inside: 70,
  outside: 130,
  freeShipOver: 1000,
} as const;