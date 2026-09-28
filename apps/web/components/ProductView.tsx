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

interface Product {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  description?: string | null;
  category: string | null;
  brand?: string | null;
  sku: string;
  price: number | string;
  discount: number;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  tryable: boolean;
  shape: string;
  variants: Variant[];
}

interface Props {
  product: Product;
}

export function ProductView({ product }: Props) {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.variants[0]?.color || ''
  );

  /**
   * Filter images by selected color
   * Pattern: filename contains color name (case-insensitive)
   */
  const filteredImages = useMemo(() => {
    if (!selectedColor) return product.images;

    const lower = selectedColor.toLowerCase();
    const matches = product.images.filter((url) => {
      const filename = url.toLowerCase();
      return filename.includes(lower);
    });

    return matches.length > 0 ? matches : product.images;
  }, [product.images, selectedColor]);

  const finalPrice =
    product.discount > 0
      ? Math.round(Number(product.price) * (1 - product.discount / 100))
      : Number(product.price);

  const savings = Number(product.price) - finalPrice;

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
          {product.brand && product.category && <span>•</span>}
          {product.category && <span>{product.category}</span>}
        </div>

        {/* Name */}
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-ink mb-3">
          {product.name}
        </h1>
        {product.nameBn && <p className="text-muted mb-3">{product.nameBn}</p>}

        {/* Rating + sold */}
        <div className="flex items-center gap-4 text-sm text-muted mb-5">
          <span>
            ⭐ {product.rating.toFixed(1)} ({product.reviewCount})
          </span>
          <span>•</span>
          <span>{product.soldCount} sold</span>
        </div>

        {/* Price block */}
        <div className="bg-sand/60 rounded-lg p-4 mb-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-wine font-semibold text-3xl">
              ৳{finalPrice.toLocaleString()}
            </span>
            {product.discount > 0 && (
              <>
                <span className="text-muted text-lg line-through">
                  ৳{Number(product.price).toLocaleString()}
                </span>
                <span className="bg-wine text-white text-xs font-semibold px-2 py-1 rounded">
                  -{product.discount}%
                </span>
              </>
            )}
          </div>
          {product.discount > 0 && (
            <p className="text-sm text-leaf mt-1">
              You save ৳{savings.toLocaleString()}
            </p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-muted mb-6 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Color + Size + Add to Cart + Buy Now */}
        <AddToCartButton
          product={product}
          externalColor={selectedColor}
          onColorChange={setSelectedColor}
        />

        {/* SKU */}
        <div className="text-xs text-muted border-t border-line pt-4 mt-2">
          SKU: {product.sku}
        </div>

        {/* WhatsApp Chat */}
        <div className="mt-6 pt-6 border-t border-line">
          <WhatsAppChatButton
            variant="outline"
            label="Ask about this product"
            message={`Hi! I'm interested in "${product.name}" (SKU: ${product.sku}). Can you tell me more?`}
            className="w-full"
          />
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-line">
          <div className="text-center">
            <div className="text-2xl mb-1">🚚</div>
            <div className="text-xs text-muted leading-tight">
              Fast delivery
              <br />
              all over BD
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">🔒</div>
            <div className="text-xs text-muted leading-tight">
              Secure
              <br />
              payment
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">↩️</div>
            <div className="text-xs text-muted leading-tight">
              7 day easy
              <br />
              return
            </div>
          </div>
        </div>
      </div>
    </>
  );
}