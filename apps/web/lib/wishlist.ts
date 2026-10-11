// ============================================
// TANAVIA — Wishlist Utilities
// localStorage-backed wishlist
// ============================================

const STORAGE_KEY = 'tanavia_wishlist';

export interface WishlistItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  addedAt: number;
}

function read(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: WishlistItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Notify all listeners
    window.dispatchEvent(new Event('wishlist-change'));
  } catch {
    // ignore
  }
}

export function getWishlist(): WishlistItem[] {
  return read();
}

export function isInWishlist(productId: string): boolean {
  return read().some((i) => i.id === productId);
}

export function addToWishlist(item: Omit<WishlistItem, 'addedAt'>): void {
  const items = read();
  if (items.some((i) => i.id === item.id)) return; // already exists
  write([...items, { ...item, addedAt: Date.now() }]);
}

export function removeFromWishlist(productId: string): void {
  write(read().filter((i) => i.id !== productId));
}

export function toggleWishlist(item: Omit<WishlistItem, 'addedAt'>): boolean {
  if (isInWishlist(item.id)) {
    removeFromWishlist(item.id);
    return false; // now removed
  } else {
    addToWishlist(item);
    return true; // now added
  }
}