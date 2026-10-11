'use client';

import { useEffect, useState } from 'react';
import {
  toggleWishlist,
  isInWishlist,
} from '@/lib/wishlist';

interface Props {
  productId: string;
  productSlug: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function WishlistButton({
  productId,
  productSlug,
  productName,
  productPrice,
  productImage,
  variant = 'icon',
  className = '',
}: Props) {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setActive(isInWishlist(productId));

    function handleChange() {
      setActive(isInWishlist(productId));
    }
    window.addEventListener('wishlist-change', handleChange);
    return () => window.removeEventListener('wishlist-change', handleChange);
  }, [productId]);

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = toggleWishlist({
      id: productId,
      slug: productSlug,
      name: productName,
      price: productPrice,
      image: productImage,
    });
    setActive(nowActive);
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`opacity-0 ${className}`}
        aria-label="Wishlist"
        disabled
      >
        ♡
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
          active
            ? 'border-wine bg-wine/5 text-wine'
            : 'border-line text-ink hover:border-wine hover:text-wine'
        } ${className}`}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <HeartIcon filled={active} />
        <span>{active ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition ${
        active
          ? 'text-wine bg-wine/5'
          : 'text-muted hover:text-wine hover:bg-wine/5'
      } ${className}`}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      title={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <HeartIcon filled={active} />
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}