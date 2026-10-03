'use client';

import { useState } from 'react';
import {
  tk,
  type CartItem,
  updatePosQty,
  removeFromPosCart,
} from '@/lib/staff-pos';

interface Props {
  items: CartItem[];
  onChange: (items: CartItem[]) => void;
  discountPct: number;
  onDiscountChange: (pct: number) => void;
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  appliedCoupon: {
    code: string;
    discount: number;
  } | null;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
}

export function CartPanel({
  items,
  onChange,
  discountPct,
  onDiscountChange,
  couponCode,
  onCouponCodeChange,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  customerPhone,
  onCustomerPhoneChange,
  note,
  onNoteChange,
}: Props) {
  const [applying, setApplying] = useState(false);

  // ============================================
  // Totals
  // ============================================
  const subtotal = items.reduce((sum, item) => {
    const finalPrice = Math.round(
      item.price * (1 - item.discount / 100)
    );
    return sum + finalPrice * item.qty;
  }, 0);

  const manualDiscount = Math.round((subtotal * discountPct) / 100);
  const couponDiscount = appliedCoupon?.discount || 0;
  const totalDiscount = manualDiscount + couponDiscount;

  const total = Math.max(0, subtotal - totalDiscount);

  // ============================================
  // Handlers
  // ============================================
  function handleQtyChange(variantId: string, newQty: number) {
    onChange(updatePosQty(variantId, newQty));
  }

  function handleRemove(variantId: string) {
    onChange(removeFromPosCart(variantId));
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setApplying(true);
    try {
      await onApplyCoupon();
    } finally {
      setApplying(false);
    }
  }

  // ============================================
  // Empty state
  // ============================================
  if (items.length === 0) {
    return (
      <div className="staff-card p-6 h-full flex flex-col">
        <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)] mb-4">
          Cart
        </h2>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="w-16 h-16 rounded-full bg-[var(--staff-tile-bg)] flex items-center justify-center text-[var(--staff-muted)] mb-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h2l2 12h11l2-8H6" />
              <circle cx="9" cy="19" r="1.5" />
              <circle cx="17" cy="19" r="1.5" />
            </svg>
          </div>
          <p className="text-sm text-[var(--staff-muted)]">
            Cart is empty. Scan the first item.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // Cart with items
  // ============================================
  return (
    <div className="staff-card p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--staff-border)]">
        <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
          Cart
        </h2>
        <span className="text-xs text-[var(--staff-muted)]">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto staff-scroll-light space-y-2 -mx-1 px-1 mb-3">
        {items.map((item) => {
          const finalPrice = Math.round(
            item.price * (1 - item.discount / 100)
          );
          return (
            <div
              key={item.variantId}
              className="border border-[var(--staff-border)] rounded-lg p-2.5 bg-[var(--staff-tile-bg)]"
            >
              <div className="flex items-start gap-2.5">
                {/* Image */}
                <div className="w-12 h-14 rounded bg-[var(--staff-card)] overflow-hidden flex-shrink-0">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--staff-muted)] text-[9px]">
                      No img
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--staff-text)] line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-[var(--staff-muted)] mt-0.5">
                        {item.size} / {item.color}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item.variantId)}
                      className="w-5 h-5 flex items-center justify-center rounded text-[var(--staff-muted)] hover:text-[var(--staff-danger)] hover:bg-[var(--staff-danger)]/10 transition flex-shrink-0"
                      aria-label="Remove"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Qty + price */}
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <div className="flex items-center bg-[var(--staff-card)] border border-[var(--staff-border)] rounded-md overflow-hidden">
                      <button
                        onClick={() =>
                          handleQtyChange(item.variantId, item.qty - 1)
                        }
                        disabled={item.qty <= 1}
                        className="w-6 h-6 flex items-center justify-center text-[var(--staff-text)] hover:bg-[var(--staff-tile-bg)] disabled:opacity-30 transition text-sm font-medium"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-xs font-semibold text-[var(--staff-text)]">
                        {item.qty}
                      </span>
                      <button
                        onClick={() =>
                          handleQtyChange(item.variantId, item.qty + 1)
                        }
                        disabled={item.qty >= item.maxQty}
                        className="w-6 h-6 flex items-center justify-center text-[var(--staff-text)] hover:bg-[var(--staff-tile-bg)] disabled:opacity-30 transition text-sm font-medium"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[var(--staff-text)]">
                        {tk(finalPrice * item.qty)}
                      </div>
                      {item.qty > 1 && (
                        <div className="text-[9px] text-[var(--staff-muted)]">
                          {tk(finalPrice)} ea
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals section */}
      <div className="space-y-2.5 pt-3 border-t border-[var(--staff-border)]">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--staff-muted)]">Subtotal</span>
          <span className="font-medium text-[var(--staff-text)]">
            {tk(subtotal)}
          </span>
        </div>

        {/* Manual discount */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-[var(--staff-muted)]">
            Discount %
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={50}
              value={discountPct || ''}
              onChange={(e) =>
                onDiscountChange(
                  Math.max(0, Math.min(50, Number(e.target.value) || 0))
                )
              }
              placeholder="0"
              className="w-14 bg-[var(--staff-tile-bg)] border border-transparent rounded px-2 py-1 text-xs text-right font-semibold text-[var(--staff-text)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
            />
            <span className="text-xs text-[var(--staff-muted)]">%</span>
          </div>
        </div>

        {/* Coupon */}
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-[var(--staff-success)]/10 border border-[var(--staff-success)]/30 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--staff-success)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <div className="text-xs font-semibold text-[var(--staff-success)]">
                  {appliedCoupon.code}
                </div>
                <div className="text-[10px] text-[var(--staff-muted)]">
                  − {tk(appliedCoupon.discount)}
                </div>
              </div>
            </div>
            <button
              onClick={onRemoveCoupon}
              className="text-[var(--staff-muted)] hover:text-[var(--staff-danger)] text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={couponCode}
              onChange={(e) =>
                onCouponCodeChange(e.target.value.toUpperCase())
              }
              placeholder="Coupon code"
              className="flex-1 bg-[var(--staff-tile-bg)] border border-transparent rounded px-2.5 py-1.5 text-xs text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || applying}
              className="px-3 py-1.5 rounded bg-[var(--staff-tile-bg)] text-xs font-medium text-[var(--staff-text)] hover:bg-[var(--staff-border)] disabled:opacity-40 transition"
            >
              {applying ? '...' : 'Apply'}
            </button>
          </div>
        )}

        {/* Customer phone */}
        <div>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            placeholder="Customer phone (optional)"
            className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-3 py-2 text-xs text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
          />
        </div>

        {/* Note */}
        <div>
          <input
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Note (optional)"
            className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-3 py-2 text-xs text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
          />
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between pt-3 border-t border-[var(--staff-border)]">
          <span className="text-sm font-semibold text-[var(--staff-text)]">
            Total
          </span>
          <span className="font-serif text-2xl font-bold text-[var(--staff-text)]">
            {tk(total)}
          </span>
        </div>
      </div>
    </div>
  );
}