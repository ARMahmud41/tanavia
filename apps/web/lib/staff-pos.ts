// ============================================
// TANAVIA — Staff POS Helpers
// ============================================

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image?: string | null;
  price: number;       // base price
  discount: number;    // product discount %
  size: string;
  color: string;
  qty: number;
  maxQty: number;      // available stock
}

export interface BarcodeResult {
  productId: string;
  variantId: string;
  productName: string;
  slug: string;
  image: string | null;
  price: number;
  discount: number;
  size: string;
  color: string;
  qty: number;
  reserved: number;
  available: number;
}

const POS_CART_KEY = 'tanavia_pos_cart';

// ============================================
// Cart — localStorage backed
// ============================================

export function getPosCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(POS_CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setPosCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(POS_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('pos-cart-updated'));
}

export function addToPosCart(
  item: Omit<CartItem, 'qty'>,
  qty = 1
): CartItem[] {
  const cart = getPosCart();
  const existing = cart.find((i) => i.variantId === item.variantId);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, existing.maxQty);
  } else {
    cart.push({ ...item, qty: Math.min(qty, item.maxQty) });
  }

  setPosCart(cart);
  return cart;
}

export function updatePosQty(
  variantId: string,
  qty: number
): CartItem[] {
  const cart = getPosCart().map((i) =>
    i.variantId === variantId
      ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty)) }
      : i
  );
  setPosCart(cart);
  return cart;
}

export function removeFromPosCart(variantId: string): CartItem[] {
  const cart = getPosCart().filter((i) => i.variantId !== variantId);
  setPosCart(cart);
  return cart;
}

export function clearPosCart(): void {
  setPosCart([]);
}

// ============================================
// Cart totals
// ============================================

export function posSubtotal(items?: CartItem[]): number {
  const cart = items || getPosCart();
  return cart.reduce((sum, item) => {
    const finalPrice = Math.round(
      item.price * (1 - item.discount / 100)
    );
    return sum + finalPrice * item.qty;
  }, 0);
}

// ============================================
// Format helpers
// ============================================

export function tk(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  return '৳' + num.toLocaleString('en-BD', { maximumFractionDigits: 0 });
}