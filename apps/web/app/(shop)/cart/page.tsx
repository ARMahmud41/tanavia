'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCart, updateQty, removeFromCart, type CartItem } from '@/lib/cart';
import { tk } from '@/lib/format';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(getCart());

    function update() {
      setItems(getCart());
    }
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  if (!mounted) {
    return (
      <div className="container-wrap py-16 text-center text-muted">
        Loading cart...
      </div>
    );
  }

  // Compute totals
  const subtotal = items.reduce((sum, item) => {
    const finalPrice = Math.round(item.price * (1 - item.discount / 100));
    return sum + finalPrice * item.qty;
  }, 0);

  const totalOriginal = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const savings = totalOriginal - subtotal;

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="container-wrap py-16">
        <h1 className="font-serif text-4xl font-semibold text-ink mb-4">
          Your Cart
        </h1>
        <div className="bg-white border border-line rounded p-16 text-center">
          <p className="text-muted text-lg mb-6">
            Your cart is empty.
          </p>
          <Link href="/products" className="btn">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wrap py-10">
      <h1 className="font-serif text-4xl font-semibold text-ink mb-2">
        Your Cart
      </h1>
      <p className="text-muted text-sm mb-8">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const finalPrice = Math.round(
              item.price * (1 - item.discount / 100)
            );
            return (
              <div
                key={item.variantId}
                className="bg-white border border-line rounded p-4 flex gap-4"
              >
                {/* Image */}
                <Link
                  href={`/product/${item.slug}`}
                  className="w-24 h-32 bg-sand rounded overflow-hidden flex-shrink-0"
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                      No img
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-medium text-ink hover:text-wine transition line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <div className="text-sm text-muted mt-1">
                      {item.color} • {item.size}
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-wine font-semibold">
                        {tk(finalPrice)}
                      </span>
                      {item.discount > 0 && (
                        <span className="text-muted text-xs line-through">
                          {tk(item.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-line rounded">
                      <button
                        onClick={() =>
                          setItems(updateQty(item.variantId, item.qty - 1))
                        }
                        className="px-3 py-1 hover:bg-sand"
                        disabled={item.qty <= 1}
                      >
                        −
                      </button>
                      <span className="px-3 py-1 text-sm min-w-[36px] text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() =>
                          setItems(updateQty(item.variantId, item.qty + 1))
                        }
                        className="px-3 py-1 hover:bg-sand"
                        disabled={item.qty >= item.maxQty}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setItems(removeFromCart(item.variantId))
                      }
                      className="text-sm text-muted hover:text-wine underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-line rounded p-6 sticky top-24">
            <h2 className="font-serif text-xl font-semibold mb-4">
              Order Summary
            </h2>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{tk(totalOriginal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-leaf">
                  <span>Discount</span>
                  <span>− {tk(savings)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Delivery</span>
                <span className="text-muted">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t border-line pt-4 mb-6">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">Total</span>
                <span className="text-wine font-semibold text-2xl">
                  {tk(subtotal)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="btn w-full justify-center"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/products"
              className="block text-center text-sm text-muted hover:text-wine mt-3"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}