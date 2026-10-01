'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import { ShippingLabel } from '@/components/ShippingLabel';

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
  channel: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  address: string;
  district: string;
  note?: string | null;
  subtotal: string | number;
  discount: string | number;
  deliveryFee: string | number;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  paymentTxId?: string | null;
  courier?: string | null;
  consignmentId?: string | null;
  courierStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  events: OrderEvent[];
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
  PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-gray-100 text-gray-700 border-gray-300',
};

const NEXT_STATUS: Record<
  string,
  { value: string; label: string; color: string } | undefined
> = {
  PLACED: { value: 'CONFIRMED', label: '✓ Confirm Order', color: 'bg-[#0F2A5C] hover:bg-[#0A1F45]' },
  CONFIRMED: { value: 'PACKED', label: '📦 Mark as Packed', color: 'bg-purple-600 hover:bg-purple-700' },
  PACKED: { value: 'SHIPPED', label: '🚚 Mark as Shipped', color: 'bg-indigo-600 hover:bg-indigo-700' },
  SHIPPED: { value: 'DELIVERED', label: '✓ Mark as Delivered', color: 'bg-emerald-600 hover:bg-emerald-700' },
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showShippingLabel, setShowShippingLabel] = useState(false);

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
      await api.patch(`/api/orders/${order.id}/mark-paid`, {}, { token });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    setUpdating(true);
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/orders/${order.id}/status`,
        { status: 'CANCELLED', note: cancelNote || 'Order cancelled by admin' },
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

  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">Loading order...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
            Order Not Found
          </h1>
          <p className="text-sm text-[#8A8F98] mb-4">
            {error || 'This order does not exist'}
          </p>
          <Link
            href="/admin/orders"
            className="inline-block bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            ← Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const statusUpper = order.status.toUpperCase();
  const statusColor =
    STATUS_COLORS[statusUpper] || 'bg-gray-100 text-gray-700 border-gray-300';
  const next = NEXT_STATUS[statusUpper];
  const isPaid = order.paymentStatus === 'PAID';
  const isCancelled = statusUpper === 'CANCELLED';

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/orders"
          className="text-sm text-[#8A8F98] hover:text-[#0F2A5C] inline-flex items-center gap-1 mb-2"
        >
          ← Back to Orders
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] font-mono">
                {order.orderNumber}
              </h1>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-sm text-[#8A8F98]">
              Placed on {formatDateTime(order.createdAt)} • {order.channel}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Print Shipping Label — show for ONLINE orders not cancelled */}
            {!isCancelled && order.channel === 'ONLINE' && (
              <button
                onClick={() => setShowShippingLabel(true)}
                className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                🖨️ Print Label
              </button>
            )}

            {!isCancelled && next && (
              <button
                onClick={() => updateStatus(next.value)}
                disabled={updating}
                className={`${next.color} text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50`}
              >
                {next.label}
              </button>
            )}
            {!isPaid && !isCancelled && (
              <button
                onClick={markPaid}
                disabled={updating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                💰 Mark as Paid
              </button>
            )}
            {!isCancelled && (
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT — main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Items ({order.items.length})
            </h2>

            <div className="space-y-3">
              {order.items.map((item) => {
                const imgUrl = item.product?.images?.[0] || null;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 pb-3 border-b border-[#F1F3F6] last:border-b-0 last:pb-0"
                  >
                    {/* Image — clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        if (imgUrl) setPreviewImage(imgUrl);
                      }}
                      disabled={!imgUrl}
                      className={`w-16 h-20 rounded-md overflow-hidden flex-shrink-0 bg-[#F1F3F6] border border-[#E3E6EB] ${
                        imgUrl
                          ? 'cursor-zoom-in hover:ring-2 hover:ring-[#0F2A5C]/40 hover:border-[#0F2A5C]/30 transition'
                          : 'cursor-default'
                      }`}
                      aria-label="View product image"
                      title={imgUrl ? 'Click to enlarge' : ''}
                    >
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-xs">
                          📷
                        </div>
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="font-medium text-ink">{item.name}</div>
                      <div className="text-xs text-[#8A8F98] mt-1">
                        {item.color} • {item.size} • Qty: {item.qty}
                      </div>
                      <div className="text-sm font-semibold text-[#0F2A5C] mt-1">
                        {tk(Number(item.price) * item.qty)}
                        <span className="text-xs text-[#8A8F98] font-normal ml-2">
                          ({tk(item.price)} each)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="mt-5 pt-4 border-t border-[#E8EBF0] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Subtotal</span>
                <span>{tk(order.subtotal)}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span>− {tk(order.discount)}</span>
                </div>
              )}
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Delivery</span>
                  <span>{tk(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-[#E8EBF0]">
                <span className="text-[#0F2A5C]">Total</span>
                <span className="text-[#0F2A5C]">{tk(order.total)}</span>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Timeline
            </h2>

            {order.events.length === 0 ? (
              <p className="text-sm text-[#8A8F98]">No events yet.</p>
            ) : (
              <div className="space-y-4">
                {order.events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          i === 0 ? 'bg-[#0F2A5C]' : 'bg-[#E3E6EB]'
                        }`}
                      />
                      {i < order.events.length - 1 && (
                        <div className="w-px flex-1 bg-[#E3E6EB] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-sm font-medium text-ink">
                        {ev.status}
                      </div>
                      {ev.note && (
                        <div className="text-xs text-[#5A6270] mt-0.5">
                          {ev.note}
                        </div>
                      )}
                      <div className="text-xs text-[#8A8F98] mt-0.5">
                        {formatDateTime(ev.createdAt)} • {ev.actor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — sidebar */}
        <div className="lg:col-span-1 space-y-5">
          {/* Customer */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <div className="font-medium text-ink">{order.customerName}</div>
              <div className="text-[#5A6270] flex items-center gap-2">
                <span>📞</span>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="hover:text-[#0F2A5C]"
                >
                  {order.customerPhone}
                </a>
              </div>
              {order.customerEmail && (
                <div className="text-[#5A6270] flex items-center gap-2">
                  <span>✉️</span>
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="hover:text-[#0F2A5C] truncate"
                  >
                    {order.customerEmail}
                  </a>
                </div>
              )}
              <div className="pt-3 mt-3 border-t border-[#E8EBF0]">
                <div className="text-xs text-[#8A8F98] uppercase tracking-wide mb-1">
                  Delivery Address
                </div>
                <div className="text-[#5A6270] leading-relaxed">
                  {order.address}
                  <br />
                  {order.district}
                </div>
              </div>
              {order.note && (
                <div className="pt-3 mt-3 border-t border-[#E8EBF0]">
                  <div className="text-xs text-[#8A8F98] uppercase tracking-wide mb-1">
                    Customer Note
                  </div>
                  <div className="text-[#5A6270] italic">{order.note}</div>
                </div>
              )}
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Payment
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Method</span>
                <span className="font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Status</span>
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
                  <span className="text-[#8A8F98]">TxID</span>
                  <span className="font-mono text-xs">{order.paymentTxId}</span>
                </div>
              )}
            </div>

            {!isPaid && !isCancelled && (
              <button
                onClick={markPaid}
                disabled={updating}
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
              >
                💰 Mark as Paid
              </button>
            )}
          </section>

          {/* Courier */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Courier
            </h2>
            {order.courier ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Provider</span>
                  <span className="font-medium capitalize">
                    {order.courier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Consignment ID</span>
                  <span className="font-mono text-xs">
                    {order.consignmentId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">Status</span>
                  <span className="font-medium">
                    {order.courierStatus || 'BOOKED'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#8A8F98] mb-3">
                  Not booked with courier yet.
                </p>
                <p className="text-xs text-[#8A8F98]">
                  Courier booking coming soon.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ============================== */}
      {/* Shipping Label Modal          */}
      {/* ============================== */}
      {showShippingLabel && (
        <ShippingLabelModal
          order={order}
          onClose={() => setShowShippingLabel(false)}
        />
      )}

      {/* ============================== */}
      {/* Image Preview Modal           */}
      {/* ============================== */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition"
            aria-label="Close preview"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Product preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            Click anywhere to close
          </p>
        </div>
      )}

      {/* ============================== */}
      {/* Cancel Modal                    */}
      {/* ============================== */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
              Cancel Order?
            </h3>
            <p className="text-sm text-[#8A8F98] mb-4">
              This will cancel the order and restore stock. This action cannot
              be undone.
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCancel(false);
                  setCancelNote('');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E3E6EB] text-[#5A6270] hover:bg-[#F1F3F6] transition"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={updating}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
              >
                {updating ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Shipping Label Modal
// ============================================
function ShippingLabelModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

  function handlePrint() {
    window.print();
  }

  // Parse items — some APIs may return items already structured
  const items = (order.items || []).map((it) => ({
    name: it.name,
    size: it.size,
    color: it.color,
    qty: it.qty,
    price: it.price,
  }));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F2A5C] text-white px-5 py-4 flex items-start justify-between no-print">
          <div>
            <h2 className="font-serif text-lg font-semibold">
              Shipping Label Preview
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              Order {order.orderNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Print mode selector */}
        <div className="px-5 py-3 bg-[#F1F4F9] border-b border-[#E8EBF0] flex items-center gap-4 no-print">
          <div className="text-xs text-[#5A6270]">
            📏 Print Mode:
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPrintMode('thermal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                printMode === 'thermal'
                  ? 'bg-[#0F2A5C] text-white'
                  : 'bg-white text-[#5A6270] border border-[#E3E6EB] hover:border-[#0F2A5C]'
              }`}
            >
              Thermal (100×150mm)
            </button>
            <button
              onClick={() => setPrintMode('a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                printMode === 'a4'
                  ? 'bg-[#0F2A5C] text-white'
                  : 'bg-white text-[#5A6270] border border-[#E3E6EB] hover:border-[#0F2A5C]'
              }`}
            >
              A4 Half (105×148mm)
            </button>
          </div>
          <div className="text-[10px] text-[#8A8F98] ml-auto">
            {printMode === 'thermal'
              ? '4"×6" thermal printer'
              : 'Print on A4 paper — cut in half'}
          </div>
        </div>

        {/* Label preview area */}
        <div
          className={`flex-1 overflow-y-auto p-8 bg-[#F1F4F9] flex justify-center print-area size-shipping mode-${printMode}`}
        >
          <div className="label-grid">
            <ShippingLabel
              orderNumber={order.orderNumber}
              customerName={order.customerName}
              customerPhone={order.customerPhone}
              address={order.address || '—'}
              district={order.district || '—'}
              total={order.total}
              paymentMethod={order.paymentMethod}
              items={items}
              note={order.note}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-[#F1F4F9] border-t border-[#E8EBF0] flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E3E6EB] text-[#5A6270] hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
          >
            🖨️ Print Shipping Label
          </button>
        </div>
      </div>
    </div>
  );
}