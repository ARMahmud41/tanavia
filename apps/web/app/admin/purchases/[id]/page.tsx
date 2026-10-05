'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface POItem {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  unitCost: string | number;
  total: string | number;
  received: number;
  product: {
    id: string;
    name: string;
    sku: string;
    productImages: Array<{ url: string }>;
  };
  variant?: {
    id: string;
    size: string;
    color: string;
    sku?: string | null;
    qty: number;
  } | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  subtotal: string | number;
  paid: string | number;
  due: string | number;
  note: string | null;
  orderedAt: string;
  receivedAt: string | null;
  createdAt: string;
  supplier: { id: string; name: string; phone: string };
  items: POItem[];
}

interface ReceiveLine {
  itemId: string;
  value: string;
}

// ============================================
// Constants
// ============================================
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-300',
  ORDERED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

// ============================================
// Page
// ============================================
export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params?.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Receive mode
  const [receiveMode, setReceiveMode] = useState(false);
  const [receiveLines, setReceiveLines] = useState<Record<string, ReceiveLine>>(
    {}
  );
  const [receiveNote, setReceiveNote] = useState('');

  // Cancel dialog
  const [showCancel, setShowCancel] = useState(false);
  const [cancelNote, setCancelNote] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<PurchaseOrder>(`/api/purchases/${poId}`, {
        token,
      });
      setPo(res.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load purchase order';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (poId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  // ============================================
  // Actions
  // ============================================
  async function markOrdered() {
    if (!po) return;
    if (
      !confirm(
        `Mark ${po.poNumber} as ORDERED? The quantities will count as "on order".`
      )
    )
      return;

    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/purchases/${po.id}/status`,
        { status: 'ORDERED' },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!po || !cancelNote.trim()) {
      alert('Reason is required');
      return;
    }
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/purchases/${po.id}/status`,
        { status: 'CANCELLED' },
        { token }
      );
      setShowCancel(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  function startReceive() {
    if (!po) return;
    const init: Record<string, ReceiveLine> = {};
    for (const item of po.items) {
      const remaining = item.qty - item.received;
      init[item.id] = {
        itemId: item.id,
        value: remaining > 0 ? String(remaining) : '0',
      };
    }
    setReceiveLines(init);
    setReceiveNote('');
    setReceiveMode(true);
  }

  function updateReceive(itemId: string, value: string) {
    setReceiveLines((prev) => ({
      ...prev,
      [itemId]: { itemId, value },
    }));
  }

  async function handleReceive() {
    if (!po) return;

    const lines = Object.values(receiveLines)
      .filter((l) => Number(l.value) > 0)
      .map((l) => ({
        itemId: l.itemId,
        receivedQty: Number(l.value),
      }));

    if (lines.length === 0) {
      alert('Enter at least one quantity to receive');
      return;
    }

    // Validate against remaining
    for (const line of lines) {
      const item = po.items.find((i) => i.id === line.itemId);
      if (!item) continue;
      const remaining = item.qty - item.received;
      if (line.receivedQty > remaining) {
        alert(
          `Cannot receive more than ${remaining} for ${item.product.name}`
        );
        return;
      }
    }

    if (
      !confirm(
        `Receive ${lines.length} line${lines.length > 1 ? 's' : ''}? Stock will be updated.`
      )
    )
      return;

    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/purchases/${po.id}/receive`,
        {
          lines,
          note: receiveNote.trim() || undefined,
        },
        { token }
      );
      setReceiveMode(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Receive failed');
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // Loading / Error
  // ============================================
  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">
          Loading purchase order...
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
            Purchase order not found
          </h1>
          <p className="text-sm text-[#8A8F98] mb-4">
            {error || 'Does not exist.'}
          </p>
          <Link
            href="/admin/purchases"
            className="inline-block bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            ← Back to Purchases
          </Link>
        </div>
      </div>
    );
  }

  // Derived
  const statusColor =
    STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-700 border-gray-300';
  const totalQty = po.items.reduce((s, i) => s + i.qty, 0);
  const receivedQty = po.items.reduce((s, i) => s + i.received, 0);
  const canReceive = ['ORDERED', 'PARTIAL'].includes(po.status);
  const canOrder = po.status === 'DRAFT';
  const canCancel = ['DRAFT', 'ORDERED'].includes(po.status);

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <Link
        href="/admin/purchases"
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to purchases
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] font-mono">
              {po.poNumber}
            </h1>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
            >
              {po.status}
            </span>
          </div>
          <p className="text-sm text-[#8A8F98]">
            {po.supplier.name} · {po.supplier.phone} · Created{' '}
            {formatDateTime(po.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canOrder && (
            <button
              onClick={markOrdered}
              disabled={busy}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              ✓ Mark as Ordered
            </button>
          )}
          {canReceive && !receiveMode && (
            <button
              onClick={startReceive}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              📦 Receive stock
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              disabled={busy}
              className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              ✕ Cancel PO
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total items"
          value={String(po.items.length)}
          sub={`${receivedQty}/${totalQty} received`}
          tint="#0F2A5C"
        />
        <StatCard
          label="Subtotal"
          value={tk(po.subtotal)}
          sub="total value"
          tint="#059669"
        />
        <StatCard
          label="Paid"
          value={tk(po.paid)}
          sub="amount paid"
          tint="#2563EB"
        />
        <StatCard
          label="Due"
          value={tk(po.due)}
          sub="outstanding"
          tint="#C81E1E"
        />
      </div>

      {/* Note */}
      {po.note && (
        <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5 mb-5">
          <h2 className="font-serif text-base font-semibold text-[#0F2A5C] mb-2">
            Note
          </h2>
          <p className="text-sm text-[#5A6270] whitespace-pre-wrap">
            {po.note}
          </p>
        </div>
      )}

      {/* Receive mode banner */}
      {receiveMode && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-emerald-800">
            <strong>📦 Receive mode:</strong> Enter quantities that actually
            arrived. Partial quantities are allowed.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setReceiveMode(false)}
              disabled={busy}
              className="bg-white border border-emerald-300 text-emerald-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReceive}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {busy ? 'Receiving...' : '✓ Confirm receive'}
            </button>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden mb-5">
        <div className="p-5 border-b border-[#E8EBF0]">
          <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">
            Items ({po.items.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Variant</th>
                <th className="text-center px-4 py-3 font-medium">Ordered</th>
                <th className="text-center px-4 py-3 font-medium">Received</th>
                <th className="text-center px-4 py-3 font-medium">Remaining</th>
                <th className="text-right px-4 py-3 font-medium">Unit cost</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                {receiveMode && (
                  <th className="text-center px-4 py-3 font-medium">
                    Receiving now
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => {
                const remaining = item.qty - item.received;
                const line = receiveLines[item.id];
                const received = Number(line?.value || 0);
                const isValid =
                  received >= 0 && received <= remaining && remaining > 0;

                return (
                  <tr
                    key={item.id}
                    className="border-t border-[#E8EBF0]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-[#F1F3F6] rounded overflow-hidden flex-shrink-0">
                          {item.product.productImages?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.productImages[0].url}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px]">
                              📷
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#0F2A5C]">
                            {item.product.name}
                          </div>
                          <div className="text-xs text-[#8A8F98] font-mono">
                            {item.product.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#5A6270] text-xs">
                      {item.variant
                        ? `${item.variant.size} · ${item.variant.color}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#0F2A5C]">
                      {item.qty}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          item.received === item.qty
                            ? 'text-emerald-600 font-semibold'
                            : 'text-amber-600'
                        }
                      >
                        {item.received}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {remaining > 0 ? (
                        <span className="text-[#C81E1E]">{remaining}</span>
                      ) : (
                        <span className="text-emerald-600">✓ Done</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#5A6270]">
                      {tk(item.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                      {tk(item.total)}
                    </td>
                    {receiveMode && (
                      <td className="px-4 py-3 text-center">
                        {remaining > 0 ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={line?.value ?? ''}
                            onChange={(e) =>
                              updateReceive(item.id, e.target.value)
                            }
                            className={`w-24 text-center border rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:bg-white ${
                              isValid
                                ? 'bg-[#F1F3F6] border-transparent focus:border-emerald-500'
                                : 'bg-red-50 border-red-400'
                            }`}
                          />
                        ) : (
                          <span className="text-xs text-[#8A8F98]">
                            Already received
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#0F2A5C] bg-[#F1F4F9]">
                <td
                  colSpan={6}
                  className="px-4 py-3 text-right font-semibold text-[#0F2A5C]"
                >
                  Subtotal
                </td>
                <td className="px-4 py-3 text-right font-bold text-[#0F2A5C]">
                  {tk(po.subtotal)}
                </td>
                {receiveMode && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {receiveMode && (
          <div className="p-5 border-t border-[#E8EBF0]">
            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Receiving note (optional)
            </label>
            <input
              type="text"
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder="e.g., Invoice #, courier name"
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
            />
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
        <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
          Timeline
        </h2>
        <div className="space-y-3">
          <TimelineItem
            label="Created"
            value={formatDateTime(po.createdAt)}
            active
          />
          {po.status !== 'DRAFT' && (
            <TimelineItem
              label="Ordered"
              value={formatDateTime(po.orderedAt)}
            />
          )}
          {po.receivedAt && (
            <TimelineItem
              label="Fully received"
              value={formatDateTime(po.receivedAt)}
            />
          )}
        </div>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !busy && setShowCancel(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
              Cancel {po.poNumber}?
            </h3>
            <p className="text-sm text-[#8A8F98] mb-4">
              The PO will be marked CANCELLED. Stock is not affected.
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              rows={2}
              placeholder="Reason (required)..."
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-red-400 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancel(false)}
                disabled={busy}
                className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition disabled:opacity-50"
              >
                Keep PO
              </button>
              <button
                onClick={handleCancel}
                disabled={busy || !cancelNote.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {busy ? 'Cancelling...' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// StatCard
// ============================================
function StatCard({
  label,
  value,
  sub,
  tint,
}: {
  label: string;
  value: string;
  sub: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E8EBF0] shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
      <div className="text-xs text-[#8A8F98] mb-1">{label}</div>
      <div className="text-xl font-bold mb-0.5" style={{ color: tint }}>
        {value}
      </div>
      <div className="text-[10px] text-[#8A8F98] uppercase tracking-wide">
        {sub}
      </div>
    </div>
  );
}

// ============================================
// TimelineItem
// ============================================
function TimelineItem({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: active ? '#0F2A5C' : '#E3E6EB' }}
        />
      </div>
      <div className="flex-1 pb-2">
        <div className="text-sm font-medium text-[#0F2A5C]">{label}</div>
        <div className="text-xs mt-0.5 text-[#8A8F98]">{value}</div>
      </div>
    </div>
  );
}
