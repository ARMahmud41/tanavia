// ============================================
// TANAVIA — Cart (localStorage-based)
// ============================================

export interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  image?: string | null;

  /**
   * BASE (pre-discount) price.
   * Final price = price × (1 − discount / 100)
   */
  price: number;

  /**
   * Legacy alias — kept for backward compatibility.
   * Same as `price` (base price).
   */
  originalPrice?: number;

  /** Discount percentage — 0 to 100 */
  discount: number;

  size: string;
  color: string;
  qty: number;

  /** Max quantity = variant stock at add-time */
  maxQty: number;
}

const CART_KEY = 'tanavia_cart';

// ============================================
// Read / write primitives
// ============================================

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
  window.dispatchEvent(new Event('cart-change'));
}

// ============================================
// Mutations
// ============================================

export function addToCart(
  item: Omit<CartItem, 'qty'> & { qty?: number },
  qty = 1
): CartItem[] {
  const addQty = item.qty ?? qty;
  const cart = getCart();
  const existing = cart.find((i) => i.variantId === item.variantId);

  if (existing) {
    existing.qty = Math.min(existing.qty + addQty, existing.maxQty);
  } else {
    const { qty: _ignored, ...rest } = item;
    cart.push({
      ...rest,
      qty: Math.min(addQty, item.maxQty),
    } as CartItem);
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
  return cart.reduce((s, i) => s + (Number(i.qty) || 0), 0);
}

export function cartSubtotal(items?: CartItem[]): number {
  const cart = items || getCart();
  return cart.reduce((sum, item) => {
    const base = Number(item.price) || 0;
    const disc = Number(item.discount) || 0;
    const finalPrice = Math.round(base * (1 - disc / 100));
    const qty = Number(item.qty) || 0;
    return sum + finalPrice * qty;
  }, 0);
}

export function cartOriginalSubtotal(items?: CartItem[]): number {
  const cart = items || getCart();
  return cart.reduce((sum, item) => {
    const base = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    return sum + base * qty;
  }, 0);
}

export function cartSavings(items?: CartItem[]): number {
  const original = cartOriginalSubtotal(items);
  const final = cartSubtotal(items);
  return Math.max(0, original - final);
}

export function cartTotal(items?: CartItem[]): number {
  return cartSubtotal(items);
}

// ============================================
// Buy Now — direct checkout
// ============================================

const BUY_NOW_BACKUP_KEY = 'tanavia_cart_backup';

export function setBuyNow(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  const prevCart = getCart();
  localStorage.setItem(BUY_NOW_BACKUP_KEY, JSON.stringify(prevCart));
  setCart(items);
}

export function restoreCartFromBackup(): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(BUY_NOW_BACKUP_KEY);
  if (!raw) {
    clearCart();
    return;
  }
  try {
    const prev = JSON.parse(raw) as CartItem[];
    setCart(prev);
    localStorage.removeItem(BUY_NOW_BACKUP_KEY);
  } catch {
    clearCart();
  }
}

export function clearCartBackup(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BUY_NOW_BACKUP_KEY);
}

export function hasBuyNowSession(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(BUY_NOW_BACKUP_KEY) !== null;
}