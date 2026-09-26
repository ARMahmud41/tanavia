'use client';

import { useState } from 'react';
import { addToCart } from '@/lib/cart';

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
}

export function AddToCartButton({ product }: Props) {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.variants[0]?.color || ''
  );
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

  function handleAdd() {
    setError('');

    if (!selectedSize) {
      setError('Please select a size');
      return;
    }

    if (!selectedVariant) {
      setError('This variant is not available');
      return;
    }

    if (selectedVariant.qty <= 0) {
      setError('This variant is out of stock');
      return;
    }

    addToCart({
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
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
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
                onClick={() => {
                  setSelectedColor(color);
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
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="btn flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {added ? '✓ Added!' : 'Add to Cart'}
        </button>
        <button className="btn btn-ghost">♡</button>
      </div>
    </div>
  );
}