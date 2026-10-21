'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart, setBuyNow } from '@/lib/cart';
import { WishlistButton } from './WishlistButton';

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

type ModalType = 'success' | 'error' | null;

export function AddToCartButton({
  product,
  externalColor,
  onColorChange,
}: Props) {
  const router = useRouter();

  // ── Color ─────────────────────────────────────
  const [internalColor, setInternalColor] = useState<string>(
    product.variants[0]?.color || ''
  );
  const selectedColor = externalColor ?? internalColor;

  function handleColorChange(color: string) {
    if (onColorChange) onColorChange(color);
    else setInternalColor(color);
  }

  // ── Size, Qty ─────────────────────────────────
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  // ── Modal ─────────────────────────────────────
  const [modal, setModal] = useState<{ type: ModalType; message: string }>({
    type: null,
    message: '',
  });

  // Auto-close modal after 2.2s
  useEffect(() => {
    if (!modal.type) return;
    const t = setTimeout(() => setModal({ type: null, message: '' }), 2200);
    return () => clearTimeout(t);
  }, [modal.type, modal.message]);

  function closeModal() {
    setModal({ type: null, message: '' });
  }

  // ── Derived ───────────────────────────────────
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

  const availableQty = selectedVariant
    ? Math.max(0, selectedVariant.qty - selectedVariant.reserved)
    : 0;

  // ── Validate ──────────────────────────────────
  function validate(): boolean {
    if (!selectedSize) {
      setModal({ type: 'error', message: 'Please Select A Size!' });
      return false;
    }
    if (!selectedVariant) {
      setModal({
        type: 'error',
        message: 'This size is not available for the selected colour.',
      });
      return false;
    }
    if (availableQty <= 0) {
      setModal({ type: 'error', message: 'This variant is out of stock.' });
      return false;
    }
    if (qty > availableQty) {
      setModal({
        type: 'error',
        message: `Only ${availableQty} left in stock.`,
      });
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
      discount: Number(product.discount) || 0,
      size: selectedVariant.size,
      color: selectedVariant.color,
      maxQty: availableQty,
    };
  }

  // ── Actions ───────────────────────────────────
  function handleAdd() {
    if (!validate()) return;
    const item = buildCartItem();
    if (!item) return;

    addToCart(item, qty);
    setModal({
      type: 'success',
      message: 'Product added to cart successfully!',
    });
  }

  function handleBuyNow() {
    if (!validate()) return;
    const item = buildCartItem();
    if (!item) return;

    setBuyNow([{ ...item, qty }]);
    router.push('/checkout');
  }

  // ── Render ────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Colour */}
      {colors.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-ink mb-2">
            Color: <span className="text-wine font-bold">{selectedColor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  handleColorChange(c);
                  setSelectedSize(''); // reset size on colour change
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  selectedColor === c
                    ? 'bg-wine text-white border-wine'
                    : 'bg-white border-line text-ink hover:border-wine'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
      <div>
        <div className="text-xs font-semibold text-ink mb-2">
          Size:
          {selectedSize && (
            <span className="text-wine font-bold ml-1">{selectedSize}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSize(s)}
              className={`min-w-[56px] px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                selectedSize === s
                  ? 'bg-wine text-white border-wine'
                  : 'bg-white border-line text-ink hover:border-wine'
              }`}
            >
              {s}
            </button>
          ))}
          {sizes.length === 0 && (
            <span className="text-xs text-muted">No sizes available</span>
          )}
        </div>
      </div>

      {/* Qty */}
      <div>
        <div className="text-xs font-semibold text-ink mb-2">Quantity:</div>
        <div className="inline-flex items-center rounded-lg border border-line">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center text-ink hover:bg-[#F1F3F6] transition"
            aria-label="Decrease"
          >
            −
          </button>
          <span className="w-12 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(availableQty || 99, q + 1))}
            className="w-9 h-9 flex items-center justify-center text-ink hover:bg-[#F1F3F6] transition"
            aria-label="Increase"
          >
            +
          </button>
        </div>
        {selectedSize && availableQty > 0 && (
          <div className="text-[10px] text-emerald-700 mt-1">
            ✓ {availableQty} available
          </div>
        )}
        {selectedSize && availableQty === 0 && (
          <div className="text-[10px] text-red-600 mt-1">
            ✗ Out of stock for this variant
          </div>
        )}
      </div>

      {/* Add to Cart + Wishlist */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className="flex-1 border-2 border-wine text-wine hover:bg-wine hover:text-white py-3.5 rounded-lg text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="20" r="1.5" />
            <circle cx="18" cy="20" r="1.5" />
            <path d="M2 3h3l2.5 13.5a1.5 1.5 0 0 0 1.5 1.2h9.5a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
          </svg>
          Add to Cart
        </button>
        <div className="flex items-center justify-center px-3 border-2 border-line rounded-lg hover:border-wine transition">
          <WishlistButton
            productId={product.id}
            productSlug={product.slug}
            productName={product.name}
            productPrice={Number(product.price)}
            productImage={product.images?.[0]}
          />
        </div>
      </div>

      {/* Buy Now */}
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={outOfStock}
        className="w-full bg-wine hover:bg-[#0A1F45] text-white py-3.5 rounded-lg text-sm font-bold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(128,0,32,0.35)] hover:shadow-[0_6px_20px_rgba(128,0,32,0.45)] active:scale-[0.98]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        Buy Now
      </button>

      {/* ── Modal Popup ─────────────────────────────── */}
      {modal.type && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'modalFadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px 28px',
              maxWidth: '360px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              animation: 'modalPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Icon */}
            {modal.type === 'success' ? (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#FEF2F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            )}

            {/* Message */}
            <p
              style={{
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 600,
                color: '#1A1A1A',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {modal.message}
            </p>
          </div>
        </div>
      )}

      {/* Keyframes (inline style tag) */}
      <style jsx global>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalPopIn {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}