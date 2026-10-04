'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface OrderItem {
  id: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: string | number;
  product?: {
    id: string;
    name: string;
    images: string[];
  };
}

interface OrderLookup {
  id: string;
  orderNumber: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  customerName: string;
  customerPhone: string;
  total: string | number;
  createdAt: string;
  items: OrderItem[];
}

interface SelectedItem {
  orderItemId: string;
  qty: number;
  maxQty: number;
  price: number;
}

const REASONS = [
  { value: 'SIZE_WRONG', label: 'Size did not fit' },
  { value: 'COLOR_WRONG', label: 'Wrong color' },
  { value: 'DAMAGED', label: 'Arrived damaged' },
  { value: 'DEFECTIVE', label: 'Manufacturing defect' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'CHANGED_MIND', label: 'Changed mind' },
  { value: 'LATE_DELIVERY', label: 'Late delivery' },
  { value: 'WRONG_ITEM', label: 'Wrong item' },
  { value: 'OTHER', label: 'Other' },
];

// ============================================
// Page
// ============================================
export default function NewReturnPage() {
  const router = useRouter();

  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<OrderLookup | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [reason, setReason] = useState('SIZE_WRONG');
  const [reasonNote, setReasonNote] = useState('');
  const [notes, setNotes] = useState('');

  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // ============================================
  // Find order
  // ============================================
  async function handleFindOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setSearching(true);
    setError('');
    setOrder(null);
    setSelectedItems({});

    try {
      const token = getToken() || undefined;
      const res = await api.get<OrderLookup>(
        `/api/orders/track/${orderNumber.trim().toUpperCase()}`,
        { token }
      );
      if (!res.data) throw new Error('Order not found');
      setOrder(res.data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Order not found';
      setError(msg);
    } finally {
      setSearching(false);
    }
  }

  // ============================================
  // Toggle item selection
  // ============================================
  function toggleItem(item: OrderItem) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = {
          orderItemId: item.id,
          qty: 1,
          maxQty: item.qty,
          price: Number(item.price),
        };
      }
      return next;
    });
  }

  function updateQty(itemId: string, qty: number) {
    setSelectedItems((prev) => {
      const item = prev[itemId];
      if (!item) return prev;
      return {
        ...prev,
        [itemId]: {
          ...item,
          qty: Math.max(1, Math.min(qty, item.maxQty)),
        },
      };
    });
  }

  // ============================================
  // Computed
  // ============================================
  const selectedList = Object.values(selectedItems);
  const refundAmount = selectedList.reduce(
    (sum, it) => sum + it.price * it.qty,
    0
  );

  // ============================================
  // Submit
  // ============================================
  async function handleSubmit() {
    if (!order) return;
    if (selectedList.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = getToken() || undefined;
      const res = await api.post<{ returnNumber: string; id: string }>(
        `/api/returns`,
        {
          orderNumber: order.orderNumber,
          reason,
          reasonNote: reasonNote.trim() || undefined,
          notes: notes.trim() || undefined,
          items: selectedList.map((it) => ({
            orderItemId: it.orderItemId,
            qty: it.qty,
          })),
        },
        { token }
      );

      setToast(`✓ Return created: ${res.data?.returnNumber}`);

      setTimeout(() => {
        router.push('/staff/returns');
      }, 1500);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to create return';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-xl">↩</span>
        </div>
        <div>
          <h1
            className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
            style={{ color: 'var(--staff-text)' }}
          >
            New return
          </h1>
          <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
            Create a return or refund request
          </p>
        </div>
      </div>

      {/* Back link */}
      <Link
        href="/staff/returns"
        className="inline-flex items-center gap-1 text-sm mb-5 hover:underline"
        style={{ color: 'var(--staff-muted)' }}
      >
        ← Back to returns
      </Link>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1 — Find order */}
          <section
            className="rounded-lg p-5"
            style={{
              background: 'var(--staff-card)',
              boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
            }}
          >
            <h2
              className="font-serif text-lg font-semibold mb-4"
              style={{ color: 'var(--staff-text)' }}
            >
              1. Find the order
            </h2>

            <form onSubmit={handleFindOrder} className="flex gap-2">
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Order number, e.g. TN-798107"
                className="flex-1 rounded-lg px-3.5 py-2.5 text-sm border focus:outline-none font-mono uppercase"
                style={{
                  background: 'var(--staff-tile-bg, #F1F3F6)',
                  color: 'var(--staff-text)',
                  borderColor: 'transparent',
                }}
              />
              <button
                type="submit"
                disabled={searching || !orderNumber.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: 'var(--staff-primary)' }}
              >
                {searching ? 'Searching...' : 'Find'}
              </button>
            </form>

            <p
              className="text-xs mt-3"
              style={{ color: 'var(--staff-muted)' }}
            >
              Try orders: TN-798107, TN-798103, TN-798104
            </p>
          </section>

          {/* Step 2 — Order details + items */}
          {order && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                2. Select items to return
              </h2>

              {/* Order summary */}
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{ background: 'var(--staff-tile-bg, #F1F4F9)' }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span style={{ color: 'var(--staff-muted)' }}>
                    Order #{order.orderNumber}
                  </span>
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      background: 'var(--staff-primary)',
                      color: 'white',
                    }}
                  >
                    {order.channel}
                  </span>
                </div>
                <div style={{ color: 'var(--staff-text)' }}>
                  {order.customerName} — {order.customerPhone}
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                {order.items.map((item) => {
                  const selected = !!selectedItems[item.id];
                  const sel = selectedItems[item.id];
                  const img = item.product?.images?.[0];

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border transition"
                      style={{
                        background: selected
                          ? 'rgba(31, 78, 121, 0.06)'
                          : 'transparent',
                        borderColor: selected
                          ? 'var(--staff-primary)'
                          : 'var(--staff-border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleItem(item)}
                        className="w-4 h-4 cursor-pointer flex-shrink-0"
                      />

                      {/* Image */}
                      <div
                        className="w-12 h-14 rounded-md overflow-hidden flex-shrink-0"
                        style={{ background: 'var(--staff-bg)' }}
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            📷
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-medium text-sm truncate"
                          style={{ color: 'var(--staff-text)' }}
                        >
                          {item.name}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          {item.color} • {item.size} • Qty available: {item.qty}
                        </div>
                        <div
                          className="text-xs font-semibold mt-1"
                          style={{ color: 'var(--staff-primary)' }}
                        >
                          {tk(item.price)} each
                        </div>
                      </div>

                      {/* Qty selector (only if selected) */}
                      {selected && sel && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(item.id, sel.qty - 1)
                            }
                            disabled={sel.qty <= 1}
                            className="w-7 h-7 rounded text-sm font-bold border transition disabled:opacity-30"
                            style={{
                              background: 'var(--staff-card)',
                              color: 'var(--staff-text)',
                              borderColor: 'var(--staff-border)',
                            }}
                          >
                            −
                          </button>
                          <span
                            className="w-8 text-center text-sm font-semibold"
                            style={{ color: 'var(--staff-text)' }}
                          >
                            {sel.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(item.id, sel.qty + 1)
                            }
                            disabled={sel.qty >= sel.maxQty}
                            className="w-7 h-7 rounded text-sm font-bold border transition disabled:opacity-30"
                            style={{
                              background: 'var(--staff-card)',
                              color: 'var(--staff-text)',
                              borderColor: 'var(--staff-border)',
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right — sidebar */}
        <div className="lg:col-span-1 space-y-5">
          {/* Reason */}
          {order && selectedList.length > 0 && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                Reason
              </h2>

              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none mb-3"
                style={{
                  background: 'var(--staff-tile-bg, #F1F3F6)',
                  color: 'var(--staff-text)',
                  borderColor: 'transparent',
                }}
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Additional details (optional)..."
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
                style={{
                  background: 'var(--staff-tile-bg, #F1F3F6)',
                  color: 'var(--staff-text)',
                  borderColor: 'transparent',
                }}
              />
            </section>
          )}

          {/* Summary */}
          <section
            className="rounded-lg p-5"
            style={{
              background: 'var(--staff-card)',
              boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
            }}
          >
            <h2
              className="font-serif text-lg font-semibold mb-4"
              style={{ color: 'var(--staff-text)' }}
            >
              Summary
            </h2>

            {selectedList.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
                Select items to see the refund.
              </p>
            ) : (
              <>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--staff-muted)' }}>
                      Items
                    </span>
                    <span style={{ color: 'var(--staff-text)' }}>
                      {selectedList.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--staff-muted)' }}>
                      Total qty
                    </span>
                    <span style={{ color: 'var(--staff-text)' }}>
                      {selectedList.reduce((s, it) => s + it.qty, 0)}
                    </span>
                  </div>
                </div>

                <div
                  className="pt-3 border-t"
                  style={{ borderColor: 'var(--staff-border)' }}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className="font-semibold"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      Refund total
                    </span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: 'var(--staff-primary)' }}
                    >
                      {tk(refundAmount)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="mt-5 w-full py-3 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ background: 'var(--staff-primary)' }}
                >
                  {submitting ? 'Creating...' : 'Submit return request'}
                </button>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white"
          style={{ background: 'var(--staff-success)' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}