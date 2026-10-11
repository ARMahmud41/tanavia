'use client';

import Link from 'next/link';
import { tk, sellPrice } from '@/lib/format';
import { useState } from 'react';
import { addToCart } from '@/lib/cart';

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  discount: number;
  category: string | { id: string; name: string; nameBn?: string | null; slug: string } | null;
  images?: string[];
  productImages?: Array<{ id: string; url: string; alt?: string | null; isPrimary?: boolean }>;
  variants?: ProductVariant[];
  soldCount?: number;
  freeDelivery?: boolean;
}

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const finalPrice = sellPrice(product.price, product.discount);
  const hasDiscount = product.discount > 0;

  const [added, setAdded] = useState(false);

  // Total stock from variants
  const totalStock =
    product.variants?.reduce((sum, v) => sum + v.qty, 0) ?? 0;
  const outOfStock = totalStock === 0;

  // Support both field names (API returns productImages)
  const imageUrl =
    product.productImages?.find((img) => img.isPrimary)?.url ||
    product.productImages?.[0]?.url ||
    product.images?.[0] ||
    null;

  // Find first variant with stock
  const firstAvailable = product.variants?.find(
    (v) => v.qty - (v.reserved || 0) > 0
  );

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (outOfStock || !firstAvailable) return;

    try {
      addToCart({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: finalPrice,
        originalPrice: Number(product.price),
        discount: product.discount,
        image: imageUrl || '',
        variantId: firstAvailable.id,
        size: firstAvailable.size,
        color: firstAvailable.color,
        qty: 1,
      });

      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch {
      // silently ignore
    }
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block bg-white rounded border border-line overflow-hidden hover:shadow-card transition"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-sand overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted text-sm">
            No image
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-wine text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            -{product.discount}%
          </span>
        )}

        {/* Free delivery badge — exact reference style */}
        {product.freeDelivery && (
          <div className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 z-10">
            <div className="relative overflow-hidden rounded-md bg-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.55)]">
              {/* Animated shine */}
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.8s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              {/* Content */}
              <div className="relative flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5">
                {/* Lightning bolt — direct, bold, white */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="flex-shrink-0 sm:w-[18px] sm:h-[18px]"
                  style={{
                    filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))',
                  }}
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <span className="text-white text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap leading-none">
                  Free Delivery
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Add to Cart button — dark circular */}
        {!outOfStock && (
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label="Add to cart"
            className={`absolute right-3 bottom-3 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
              added
                ? 'bg-emerald-600 scale-105'
                : 'bg-[#1A1A1A] hover:bg-[#0F2A5C] hover:scale-105'
            }`}
          >
            {added ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2 3h3l2.5 13.5a1.5 1.5 0 0 0 1.5 1.2h9.5a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
              </svg>
            )}
          </button>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              Stock Out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.category && (
          <div className="text-xs text-muted uppercase tracking-wide mb-1">
            {typeof product.category === 'string'
              ? product.category
              : product.category.nameBn || product.category.name}
          </div>
        )}
        <h3 className="font-medium text-ink mb-2 line-clamp-2 group-hover:text-wine transition">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-wine font-semibold text-lg">
            {tk(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-muted text-sm line-through">
              {tk(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}