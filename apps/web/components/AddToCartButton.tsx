'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart, setBuyNow } from '@/lib/cart';

interface Variant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number | string;
    discount: number;
    images: string[];
    variants: Variant[];
  };
  externalColor?: string;
  onColorChange?: (color: string) => void;
}

export function AddToCartButton({
  product,
  externalColor,
  onColorChange,
}: Props) {
  const router = useRouter();
  const [internalColor, setInternalColor] = useState<string>(
    product.variants[0]?.color || ''
  );

  const selectedColor = externalColor ?? internalColor;

  function handleColorChange(color: string) {
    if (onColorChange) {
      onColorChange(color);
    } else {
      setInternalColor(color);
    }
  }

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const colors = [...new Set(product.variants.map((v) => v.color))];
  const sizes = [
    ...new Set(
      product.variants
        .filter((v) => v.color === selectedColor)
        .map((v) => v.size)
    ),
  ];

  const selectedVariant = product.variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize
  );

  const totalStock = product.variants.reduce((s, v) => s + v.qty, 0);
  const outOfStock = totalStock === 0;

  function validate(): boolean {
    setError('');

    if (!selectedSize) {
      setError('Please select a size');
      return false;
    }

    if (!selectedVariant) {
      setError('This variant is not available');
      return false;
    }

    if (selectedVariant.qty <= 0) {
      setError('This variant is out of stock');
      return false;
    }

    return true;
  }

  function buildCartItem() {
    if (!selectedVariant) return null;
    return {
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0] || null,
      price: Number(product.price),
      discount: product.discount,
      size: selectedVariant.size,
      color: selectedVariant.color,
      maxQty: selectedVariant.qty,
    };
  }

  function handleAdd() {
    if (!validate()) return;

    const item = buildCartItem();
    if (!item) return;

    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!validate()) return;

    const item = buildCartItem();
    if (!item) return;

    // Set this item as the ONLY item for checkout.
    // Previous cart is backed up and can be restored via
    // restoreCartFromBackup() from the checkout page.
    setBuyNow([{ ...item, qty: 1 }]);

    router.push('/checkout');
  }

  return (
    <div>
      {/* Color picker */}
      {colors.length > 0 && (
        <div className="mb-5">
          <div className="text-sm font-medium mb-2">
            Color: <span className="text-muted">{selectedColor}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  handleColorChange(color);
                  setSelectedSize('');
                }}
                className={`px-3 py-1.5 border rounded text-sm transition ${
                  selectedColor === color
                    ? 'border-wine bg-wine text-white'
                    : 'border-line hover:border-wine'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size picker */}
      {sizes.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium mb-2">Size</div>
          <div className="flex gap-2 flex-wrap">
            {sizes.map((size) => {
              const variant = product.variants.find(
                (v) => v.color === selectedColor && v.size === size
              );
              const disabled = !variant || variant.qty <= 0;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border rounded text-sm transition ${
                    selectedSize === size
                      ? 'border-wine bg-wine text-white'
                      : disabled
                      ? 'border-line text-muted line-through opacity-50 cursor-not-allowed'
                      : 'border-line hover:border-wine'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock info */}
      <div className="text-sm mb-6">
        {outOfStock ? (
          <span className="text-wine">✗ Stock out</span>
        ) : selectedVariant ? (
          <span className="text-leaf">
            ✓ In stock ({selectedVariant.qty} available)
          </span>
        ) : (
          <span className="text-muted">
            ✓ In stock ({totalStock} total)
          </span>
        )}
        {product.variants.length > 0 && (
          <span className="ml-4 text-muted">• Try Room available</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-wine bg-wine/10 border border-wine/20 rounded px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-3 mb-6">
        {/* Primary row: Add to Cart + Wishlist */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="flex-1 justify-center rounded-full py-3.5 font-semibold text-sm border-2 border-wine text-wine bg-white hover:bg-wine hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {added ? '✓ Added to Cart!' : 'Add to Cart'}
          </button>
          <button
            type="button"
            className="w-12 rounded-full border-2 border-line flex items-center justify-center text-lg hover:border-wine transition"
            aria-label="Wishlist"
          >
            ♡
          </button>
        </div>

        {/* Buy Now button */}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock}
          className="w-full bg-wine hover:bg-wine-dark text-white rounded-full py-3.5 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          ⚡ Buy Now
        </button>
      </div>
    </div>
  );
}