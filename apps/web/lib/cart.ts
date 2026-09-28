// ============================================
// TANAVIA — Cart (localStorage-based)
// ============================================

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image?: string | null;
  price: number;        // original price
  discount: number;     // %
  size: string;
  color: string;
  qty: number;
  maxQty: number;       // variant stock
}

const CART_KEY = 'tanavia_cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1): CartItem[] {
  const cart = getCart();
  const existing = cart.find((i) => i.variantId === item.variantId);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, existing.maxQty);
  } else {
    cart.push({ ...item, qty: Math.min(qty, item.maxQty) });
  }

  setCart(cart);
  return cart;
}

export function updateQty(variantId: string, qty: number): CartItem[] {
  const cart = getCart().map((i) =>
    i.variantId === variantId
      ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty)) }
      : i
  );
  setCart(cart);
  return cart;
}

export function removeFromCart(variantId: string): CartItem[] {
  const cart = getCart().filter((i) => i.variantId !== variantId);
  setCart(cart);
  return cart;
}

export function clearCart(): void {
  setCart([]);
}

// ============================================
// Derived helpers
// ============================================

export function cartCount(items?: CartItem[]): number {
  const cart = items || getCart();
  return cart.reduce((s, i) => s + i.qty, 0);
}

export function cartSubtotal(items?: CartItem[]): number {
  const cart = items || getCart();
  return cart.reduce((sum, item) => {
    const finalPrice = Math.round(item.price * (1 - item.discount / 100));
    return sum + finalPrice * item.qty;
  }, 0);
}

export function cartTotal(items?: CartItem[]): number {
  return cartSubtotal(items); // no tax/shipping yet
}
// ============================================
// Buy Now — direct checkout (separate flow)
// ============================================

const BUY_NOW_KEY = 'tanavia_buy_now';

/**
 * Set the buy-now cart (single item) and remember previous cart
 */
export function setBuyNow(items: CartItem[]): void {
  if (typeof window === 'undefined') return;

  // Remember previous cart so we can restore if user cancels
  const prevCart = getCart();
  localStorage.setItem('tanavia_cart_backup', JSON.stringify(prevCart));

  // Replace cart with buy-now items
  setCart(items);
}

/**
 * Restore the cart from backup (called when user cancels buy-now flow)
 */
export function restoreCartFromBackup(): void {
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem('tanavia_cart_backup');
  if (!raw) {
    clearCart();
    return;
  }

  try {
    const prev = JSON.parse(raw) as CartItem[];
    setCart(prev);
    localStorage.removeItem('tanavia_cart_backup');
  } catch {
    clearCart();
  }
}

/**
 * Clear the backup (called when order is placed successfully)
 */
export function clearCartBackup(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('tanavia_cart_backup');
}

/**
 * Check if there's a pending buy-now session
 */
export function hasBuyNowSession(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('tanavia_cart_backup') !== null;
}