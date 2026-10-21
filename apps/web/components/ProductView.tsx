'use client';

import { useMemo, useState } from 'react';
import { ProductGallery } from './ProductGallery';
import { AddToCartButton } from './AddToCartButton';
import { WhatsAppChatButton } from './WhatsAppChatButton';

interface Variant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  color?: string | null;
  position?: number;
  isPrimary?: boolean;
}

interface Product {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  description?: string | null;
  category:
    | string
    | { id: string; name: string; nameBn?: string | null; slug: string }
    | null;
  brand?: string | null;
  sku: string;
  price: number | string;
  discount: number;
  images?: string[];
  productImages?: ProductImage[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  tryable: boolean;
  freeDelivery?: boolean;
  shape: string;
  variants: Variant[];
}

interface Props {
  product: Product;
}

export function ProductView({ product }: Props) {
  // Start with NO color selected (show all images)
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Normalize ALL images (from either productImages or images)
  const allImages = useMemo(() => {
    if (product.productImages?.length) {
      return product.productImages.map((img) => img.url);
    }
    return product.images || [];
  }, [product.productImages, product.images]);

  // Filter images by color (smart logic - main image first)
  const filteredImages = useMemo(() => {
    // If no color selected, show all images
    if (!selectedColor) {
      return allImages;
    }

    // Try to find color-specific images
    let colorSpecific: string[] = [];
    if (product.productImages?.length) {
      colorSpecific = product.productImages
        .filter(
          (img) =>
            img.color &&
            img.color.toLowerCase().trim() === selectedColor.toLowerCase().trim()
        )
        .map((img) => img.url);
    }

    // If color-specific images exist, put them FIRST, then add the rest
    if (colorSpecific.length > 0) {
      const otherImages = allImages.filter(
        (url) => !colorSpecific.includes(url)
      );
      return [...colorSpecific, ...otherImages];
    }

    // If no color-specific images found, show all
    return allImages;
  }, [allImages, selectedColor, product.productImages]);

  const finalPrice =
    product.discount > 0
      ? Math.round(Number(product.price) * (1 - product.discount / 100))
      : Number(product.price);

  const savings = Number(product.price) - finalPrice;

  const categoryName =
    typeof product.category === 'string'
      ? product.category
      : product.category?.name || '';

  const cartProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    discount: product.discount,
    images: allImages,
    variants: product.variants || [],
  };

  return (
    <>
      <ProductGallery
        images={filteredImages}
        productName={product.name}
        discount={product.discount > 0 ? product.discount : 0}
      />

      <div className="max-w-xl">
        {/* Brand + Category */}
        <div className="flex items-center gap-3 text-xs text-muted uppercase tracking-wider mb-2">
          {product.brand && <span>{product.brand}</span>}
          {categoryName && (
            <>
              <span>/</span>
              <span>{categoryName}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mb-3">
          {product.name}
        </h1>

        {/* Pricing */}
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-2xl font-bold text-wine">
            ৳{finalPrice.toLocaleString()}
          </span>
          {product.discount > 0 && (
            <>
              <span className="text-base text-muted line-through">
                ৳{Number(product.price).toLocaleString()}
              </span>
              <span className="text-xs bg-wine/10 text-wine font-semibold px-2 py-1 rounded">
                -{product.discount}%
              </span>
            </>
          )}
        </div>

        {savings > 0 && (
          <p className="text-xs text-emerald-700 mb-6">
            Save ৳{savings.toLocaleString()}
          </p>
        )}

        {product.freeDelivery && (
          <div className="relative mb-5 overflow-hidden rounded-lg bg-emerald-600 shadow-[0_6px_20px_rgba(16,185,129,0.35)]">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.8s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="relative flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="white"
                className="flex-shrink-0 sm:w-7 sm:h-7"
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <div className="flex-1">
                <div className="font-bold text-white text-base sm:text-lg tracking-wide leading-tight">
                  Free Delivery
                </div>
                <div className="text-[11px] sm:text-xs text-white/90 mt-0.5">
                  No shipping charge on this item
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add to cart */}
        <AddToCartButton
          product={cartProduct}
          externalColor={selectedColor || undefined}
          onColorChange={(color) => setSelectedColor(color)}
        />

        {/* WhatsApp */}
        <div className="mt-4">
          <WhatsAppChatButton
            message={`Hi! I have a question about ${product.name}.`}
            variant="outline"
            label="Ask on WhatsApp"
          />
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-8 pt-6 border-t border-line">
            <h2 className="font-serif text-lg font-semibold text-ink mb-2">
              Description
            </h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        {/* Rating / Sold */}
        <div className="mt-6 pt-6 border-t border-line flex items-center gap-6 text-xs text-muted">
          {product.rating > 0 && (
            <div>
              ⭐ {product.rating.toFixed(1)} ({product.reviewCount} reviews)
            </div>
          )}
          {product.soldCount > 0 && <div>📦 {product.soldCount} sold</div>}
        </div>
      </div>
    </>
  );
}