'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cartCount, getCart } from '@/lib/cart';

export function CartIcon() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCount(cartCount());

    function update() {
      setCount(cartCount());
    }
    window.addEventListener('cart-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="relative hover:text-wine transition inline-flex items-center gap-1"
    >
      <span>Cart</span>
      {mounted && count > 0 && (
        <span className="inline-flex items-center justify-center bg-wine text-white text-xs font-semibold rounded-full min-w-[18px] h-[18px] px-1">
          {count}
        </span>
      )}
    </Link>
  );
}