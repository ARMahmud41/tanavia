'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import { ReceiptModal, type ReceiptData } from '@/app/staff/pos/components/ReceiptModal';

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
  cost?: string | number;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: string[];
  };
}

interface OrderEvent {
  id: string;
  status: string;
  note?: string | null;
  actor: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address?: string | null;
  district?: string | null;
  note?: string | null;
  subtotal: string | number;
  discount: string | number;
  deliveryFee: string | number;
  total: string | number;
  couponCode?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paymentTxId?: string | null;
  senderPhone?: string | null;
  verifiedAt?: string | null;
  codSettledAt?: string | null;
  courier?: string | null;
  consignmentId?: string | null;
  courierStatus?: string | null;
  trackingUrl?: string | null;
  createdById?: string | null;
  shiftId?: string | null;
  cancelReason?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  events: OrderEvent[];
  profit?: number;
}

// ============================================
// Status styling
// ============================================
const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
  PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-gray-100 text-gray-700 border-gray-300',
};

const CHANNEL_COLORS: Record<string, string> = {
  ONLINE: 'bg-blue-100 text-blue-700',
  OFFLINE: 'bg-emerald-100 text-emerald-700',
};

const NEXT_STATUS: Record<
  string,
  { value: string; label: string; color: string } | undefined
> = {
  PLACED: {
    value: 'CONFIRMED',
    label: '✓ Confirm Order',
    color: 'bg-[#0F2A5C] hover:bg-[#0A1F45]',
  },
  CONFIRMED: {
    value: 'PACKED',
    label: '📦 Mark as Packed',
    color: 'bg-purple-600 hover:bg-purple-700',
  },
  PACKED: {
    value: 'SHIPPED',
    label: '🚚 Mark as Shipped',
    color: 'bg-indigo-600 hover:bg-indigo-700',
  },
  SHIPPED: {
    value: 'DELIVERED',
    label: '✓ Mark as Delivered',
    color: 'bg-emerald-600 hover:bg-emerald-700',
  },
};

// ============================================
// Page
// ============================================
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // ============================================
  // Load order
  // ============================================
  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<Order>(`/api/orders/${orderId}`, { token });
      setOrder(res.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load order';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // ============================================
  // Admin actions
  // ============================================
  async function updateStatus(newStatus: string, note?: string) {
    if (!order) return;
    if (!confirm(`Change status to ${newStatus}?`)) return;

    setUpdating(true);
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/orders/${order.id}/status`,
        { status: newStatus, note },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  async function markPaid() {
    if (!order) return;
    if (!confirm('Mark this order as PAID?')) return;

    setUpdating(true);
    try {
      const token = getToken() || undefined;
      await api.patch(`/api/orders/${order.id}/payment`, {}, { token });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    if (!cancelNote.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setUpdating(true);
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/orders/${order.id}/status`,
        { status: 'CANCELLED', note: cancelNote.trim() },
        { token }
      );
      setShowCancel(false);
      setCancelNote('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setUpdating(false);
    }
  }

  // ============================================
  // Print handler
  // ============================================
  function handlePrint() {
    if (!order) return;

    if (order.channel === 'OFFLINE') {
      // Reuse ReceiptModal for 80mm thermal receipt
      const receiptTotal = Number(order.total);
      const received = receiptTotal; // POS sale already paid
      setReceipt({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customerName || 'Walk-in Customer',
        customerPhone: order.customerPhone || '',
        items: order.items.map((it) => ({
          name: it.name,
          size: it.size,
          color: it.color,
          qty: it.qty,
          price: Number(it.price),
        })),
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        deliveryFee: Number(order.deliveryFee),
        total: receiptTotal,
        paymentMethod: order.paymentMethod,
        amountReceived: received,
        change: 0,
        staffName: user?.name || '',
        note: order.note || undefined,
        senderNumber: order.senderPhone || undefined,
        paymentTxId: order.paymentTxId || undefined,
      });
    } else {
      // ONLINE → use browser print with print stylesheet
      window.print();
    }
  }

  // ============================================
  // Loading / error
  // ============================================
  if (loading) {
    return (
      <div className="p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
        <div className="text-center py-16" style={{ color: 'var(--staff-muted)' }}>
          Loading order...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
        <div
          className="max-w-md mx-auto rounded-lg p-8 text-center"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">⚠️</div>
          <h1
            className="font-serif text-xl font-semibold mb-2"
            style={{ color: 'var(--staff-text)' }}
          >
            Order Not Found
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--staff-muted)' }}>
            {error || 'This order does not exist or you do not have access.'}
          </p>
          <Link
            href="/staff/orders"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--staff-primary)' }}
          >
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // Derived state
  // ============================================
  const statusUpper = order.status.toUpperCase();
  const statusColor =
    STATUS_COLORS[statusUpper] || 'bg-gray-100 text-gray-700 border-gray-300';
  const channelColor = CHANNEL_COLORS[order.channel] || 'bg-gray-100 text-gray-700';
  const next = NEXT_STATUS[statusUpper];
  const isPaid = order.paymentStatus === 'PAID';
  const isCancelled = statusUpper === 'CANCELLED';
  const isShipped = statusUpper === 'SHIPPED';
  const isOnline = order.channel === 'ONLINE';

  // Can cancel? only admin + not cancelled + status in PLACED/CONFIRMED/PACKED
  const canCancel =
    isAdmin &&
    !isCancelled &&
    ['PLACED', 'CONFIRMED', 'PACKED'].includes(statusUpper);

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      {/* ============ Header ============ */}
      <div className="mb-6">
        <Link
          href="/staff/orders"
          className="text-sm inline-flex items-center gap-1 mb-3 hover:underline"
          style={{ color: 'var(--staff-muted)' }}
        >
          ← Back to Orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1
                className="font-serif text-2xl md:text-3xl font-semibold font-mono"
                style={{ color: 'var(--staff-text)' }}
              >
                {order.orderNumber}
              </h1>
              <span
                className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold ${channelColor}`}
              >
                {order.channel}
              </span>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Print */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg text-sm font-semibold border transition"
              style={{
                background: 'var(--staff-card)',
                color: 'var(--staff-primary)',
                borderColor: 'var(--staff-border)',
              }}
            >
              🖨️ Print {order.channel === 'OFFLINE' ? 'Receipt' : 'Invoice'}
            </button>

            {/* Admin only actions */}
            {isAdmin && !isCancelled && next && (
              <button
                onClick={() => updateStatus(next.value)}
                disabled={updating}
                className={`${next.color} text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50`}
              >
                {next.label}
              </button>
            )}

            {isAdmin && !isPaid && !isCancelled && (
              <button
                onClick={markPaid}
                disabled={updating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                💰 Mark as Paid
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancel(true)}
                disabled={updating}
                className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                ✕ Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Staff notice */}
        {!isAdmin && (
          <div
            className="mt-4 px-4 py-2.5 rounded-lg text-sm border flex items-center gap-2"
            style={{
              background: 'rgba(31, 78, 121, 0.06)',
              color: 'var(--staff-primary)',
              borderColor: 'var(--staff-border)',
            }}
          >
            <span aria-hidden="true">ℹ️</span>
            <span>Cost, profit and admin notes are hidden.</span>
          </div>
        )}
      </div>

      {/* ============ Main grid ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT — main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
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
              Items ({order.items.length})
            </h2>

            <div className="space-y-3">
              {order.items.map((item) => {
                const imgUrl = item.product?.images?.[0] || null;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 pb-3 border-b last:border-b-0 last:pb-0"
                    style={{ borderColor: 'var(--staff-border)' }}
                  >
                    {/* Image */}
                    <button
                      type="button"
                      onClick={() => imgUrl && setPreviewImage(imgUrl)}
                      disabled={!imgUrl}
                      className={`w-16 h-20 rounded-md overflow-hidden flex-shrink-0 border ${
                        imgUrl ? 'cursor-zoom-in hover:ring-2' : 'cursor-default'
                      }`}
                      style={{
                        background: 'var(--staff-bg)',
                        borderColor: 'var(--staff-border)',
                      }}
                    >
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-xs"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          📷
                        </div>
                      )}
                    </button>

                    <div className="flex-1">
                      <div
                        className="font-medium"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {item.name}
                      </div>
                      <div
                        className="text-xs mt-1"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {item.color} • {item.size} • Qty: {item.qty}
                      </div>
                      <div
                        className="text-sm font-semibold mt-1 flex items-center gap-2"
                        style={{ color: 'var(--staff-primary)' }}
                      >
                        {tk(Number(item.price) * item.qty)}
                        <span
                          className="text-xs font-normal"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          ({tk(item.price)} each)
                        </span>
                      </div>
                      {/* Cost — admin only */}
                      {isAdmin && item.cost != null && (
                        <div className="text-xs mt-0.5 text-amber-700">
                          Cost: {tk(item.cost)} each
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div
              className="mt-5 pt-4 space-y-2 text-sm border-t"
              style={{ borderColor: 'var(--staff-border)' }}
            >
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Subtotal</span>
                <span style={{ color: 'var(--staff-text)' }}>{tk(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>− {tk(order.discount)}</span>
                </div>
              )}
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--staff-muted)' }}>Delivery</span>
                  <span style={{ color: 'var(--staff-text)' }}>
                    {tk(order.deliveryFee)}
                  </span>
                </div>
              )}
              <div
                className="flex justify-between font-semibold text-base pt-2 border-t"
                style={{ borderColor: 'var(--staff-border)' }}
              >
                <span style={{ color: 'var(--staff-text)' }}>Total</span>
                <span style={{ color: 'var(--staff-text)' }}>{tk(order.total)}</span>
              </div>
              {/* Profit — admin only */}
              {isAdmin && order.profit != null && (
                <div className="flex justify-between text-xs pt-1">
                  <span style={{ color: 'var(--staff-muted)' }}>Profit</span>
                  <span className="text-emerald-700 font-semibold">
                    {tk(order.profit)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Timeline */}
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
              Timeline
            </h2>

            {order.events.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
                No events yet.
              </p>
            ) : (
              <div className="space-y-4">
                {order.events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          i === 0 ? 'bg-[#1F4E79]' : 'bg-[#E3E6EB]'
                        }`}
                      />
                      {i < order.events.length - 1 && (
                        <div
                          className="w-px flex-1 mt-1"
                          style={{ background: 'var(--staff-border)' }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div
                        className="text-sm font-medium"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {ev.status}
                      </div>
                      {ev.note && (
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          {ev.note}
                        </div>
                      )}
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {formatDateTime(ev.createdAt)} • {ev.actor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Admin Note — admin only */}
          {isAdmin && order.adminNote && (
            <section
              className="rounded-lg p-5 border-l-4 border-amber-400"
              style={{ background: 'var(--staff-card)' }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-2"
                style={{ color: 'var(--staff-text)' }}
              >
                Admin Note
              </h2>
              <p className="text-sm" style={{ color: 'var(--staff-text)' }}>
                {order.adminNote}
              </p>
            </section>
          )}

          {/* Cancel Reason — show if cancelled */}
          {order.cancelReason && (
            <section
              className="rounded-lg p-5 border-l-4 border-red-400"
              style={{ background: 'var(--staff-card)' }}
            >
              <h2 className="font-serif text-lg font-semibold mb-2 text-red-700">
                Cancellation Reason
              </h2>
              <p className="text-sm" style={{ color: 'var(--staff-text)' }}>
                {order.cancelReason}
              </p>
            </section>
          )}
        </div>

        {/* RIGHT — sidebar */}
        <div className="lg:col-span-1 space-y-5">
          {/* Customer */}
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
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <div className="font-medium" style={{ color: 'var(--staff-text)' }}>
                {order.customerName || 'Walk-in Customer'}
              </div>
              {order.customerPhone && (
                <div
                  className="flex items-center gap-2"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  <span>📞</span>
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="hover:underline"
                  >
                    {order.customerPhone}
                  </a>
                </div>
              )}
              {order.customerEmail && (
                <div
                  className="flex items-center gap-2"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  <span>✉️</span>
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="hover:underline truncate"
                  >
                    {order.customerEmail}
                  </a>
                </div>
              )}
              {order.address && (
                <div
                  className="pt-3 mt-3 border-t"
                  style={{ borderColor: 'var(--staff-border)' }}
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-1"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    Delivery Address
                  </div>
                  <div
                    className="leading-relaxed"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {order.address}
                    {order.district && (
                      <>
                        <br />
                        {order.district}
                      </>
                    )}
                  </div>
                </div>
              )}
              {order.note && (
                <div
                  className="pt-3 mt-3 border-t"
                  style={{ borderColor: 'var(--staff-border)' }}
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-1"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    Customer Note
                  </div>
                  <div
                    className="italic"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    {order.note}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Payment */}
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
              Payment
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Method</span>
                <span className="font-medium" style={{ color: 'var(--staff-text)' }}>
                  {order.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Status</span>
                <span
                  className={`font-semibold ${
                    isPaid ? 'text-emerald-700' : 'text-amber-600'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentTxId && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--staff-muted)' }}>TxID</span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {order.paymentTxId}
                  </span>
                </div>
              )}
              {order.senderPhone && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--staff-muted)' }}>Sender</span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {order.senderPhone}
                  </span>
                </div>
              )}
              {order.codSettledAt && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--staff-muted)' }}>COD Settled</span>
                  <span className="text-xs text-emerald-700">
                    {formatDateTime(order.codSettledAt)}
                  </span>
                </div>
              )}
            </div>

            {isAdmin && !isPaid && !isCancelled && (
              <button
                onClick={markPaid}
                disabled={updating}
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
              >
                💰 Mark as Paid
              </button>
            )}
          </section>

          {/* Courier — ONLINE only */}
          {isOnline && (
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
                Courier
              </h2>
              {order.courier ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--staff-muted)' }}>Provider</span>
                    <span
                      className="font-medium capitalize"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {order.courier}
                    </span>
                  </div>
                  {order.consignmentId && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--staff-muted)' }}>Consignment</span>
                      <span
                        className="font-mono text-xs"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {order.consignmentId}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--staff-muted)' }}>Status</span>
                    <span style={{ color: 'var(--staff-text)' }}>
                      {order.courierStatus || 'BOOKED'}
                    </span>
                  </div>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-center mt-2 hover:underline"
                      style={{ color: 'var(--staff-primary)' }}
                    >
                      Track parcel →
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
                  Not booked with courier yet.
                </p>
              )}
            </section>
          )}

          {/* Staff info (order meta) */}
          {isAdmin && (
            <section
              className="rounded-lg p-5 text-xs space-y-2"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
                color: 'var(--staff-muted)',
              }}
            >
              <div className="flex justify-between">
                <span>Created By</span>
                <span className="font-mono">{order.createdById?.slice(0, 12) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Shift ID</span>
                <span className="font-mono">{order.shiftId?.slice(0, 12) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{formatDateTime(order.updatedAt)}</span>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ============ Cancel modal ============ */}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowCancel(false)}
        >
          <div
            className="rounded-lg max-w-md w-full p-6"
            style={{ background: 'var(--staff-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-serif text-xl font-semibold mb-2"
              style={{ color: 'var(--staff-text)' }}
            >
              Cancel Order?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--staff-muted)' }}>
              Stock will be restored. Please provide a reason.
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Reason (required)..."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm border mb-3 focus:outline-none"
              style={{
                background: 'var(--staff-bg)',
                color: 'var(--staff-text)',
                borderColor: 'var(--staff-border)',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm border transition"
                style={{
                  background: 'var(--staff-card)',
                  color: 'var(--staff-text)',
                  borderColor: 'var(--staff-border)',
                }}
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={updating || !cancelNote.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {updating ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Image preview ============ */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Product preview"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      {/* ============ Receipt modal (OFFLINE print) ============ */}
      {receipt && (
        <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
      )}

      {/* ============ Print stylesheet (ONLINE invoice) ============ */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-invoice,
          .print-invoice * {
            visibility: visible;
          }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}