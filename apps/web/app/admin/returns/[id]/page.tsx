'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import { ReturnSlipModal } from '@/app/staff/returns/components/ReturnSlipModal';

// ============================================
// Types
// ============================================
interface ReturnItem {
  id: string;
  orderItemId: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: string | number;
  unitCost?: string | number;
  condition: string;
  restocked: boolean;
  orderItem?: {
    product?: {
      images: string[];
    };
  };
}

interface ReturnEvent {
  id: string;
  status: string;
  note?: string | null;
  actorId?: string | null;
  createdAt: string;
}

interface ReturnRecord {
  id: string;
  returnNumber: string;
  orderId: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  reason: string;
  reasonNote?: string | null;
  refundAmount: string | number;
  refundMethod?: string | null;
  refundTxId?: string | null;
  refundedAt?: string | null;
  courier?: string | null;
  consignmentId?: string | null;
  trackingUrl?: string | null;
  inspectedAt?: string | null;
  inspectionNote?: string | null;
  rejectionNote?: string | null;
  notes?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    channel: string;
    customerName: string;
    customerPhone: string;
    total: string | number;
    paymentMethod: string;
  };
  items: ReturnItem[];
  events: ReturnEvent[];
}

// ============================================
// Constants
// ============================================
const STEPS = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'INSPECTED', label: 'Inspected' },
  { key: 'REFUNDED', label: 'Refunded' },
];

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  RECEIVED: 'bg-purple-50 text-purple-700 border-purple-200',
  INSPECTED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REFUNDED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In transit',
  RECEIVED: 'Received',
  INSPECTED: 'Inspected',
  COMPLETED: 'Refunded',
  REFUNDED: 'Refunded',
  REJECTED: 'Rejected',
};

const REASON_LABELS: Record<string, string> = {
  SIZE_WRONG: 'Size did not fit',
  COLOR_WRONG: 'Wrong color',
  DAMAGED: 'Arrived damaged',
  DEFECTIVE: 'Manufacturing defect',
  NOT_AS_DESCRIBED: 'Not as described',
  CHANGED_MIND: 'Changed mind',
  LATE_DELIVERY: 'Late delivery',
  WRONG_ITEM: 'Wrong item',
  OTHER: 'Other',
};

const CONDITION_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-300',
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DAMAGED: 'bg-red-50 text-red-700 border-red-200',
  DEFECTIVE: 'bg-red-50 text-red-700 border-red-200',
};

const CONDITION_LABELS: Record<string, string> = {
  PENDING: 'Not inspected yet',
  OK: 'Good, back to stock',
  DAMAGED: 'Damaged',
  DEFECTIVE: 'Defective',
};

// ============================================
// Page
// ============================================
export default function AdminReturnDetailPage() {
  const params = useParams();
  const returnId = params?.id as string;

  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const [ret, setRet] = useState<ReturnRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [showReject, setShowReject] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [stockModal, setStockModal] = useState<'restock' | 'damage' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH_BACK');
  const [refundTxId, setRefundTxId] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<ReturnRecord>(`/api/returns/${returnId}`, {
        token,
      });
      setRet(res.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load return';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (returnId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnId]);

  async function doAction(endpoint: string, body?: any) {
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(`/api/returns/${returnId}/${endpoint}`, body || {}, { token });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/returns/${returnId}/reject`,
        { reason: rejectReason.trim() },
        { token }
      );
      setShowReject(false);
      setRejectReason('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/returns/${returnId}/refund`,
        {
          refundMethod,
          refundTxId: refundTxId.trim() || undefined,
        },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleInspect() {
    if (!ret) return;
    const items = ret.items.map((it) => ({
      returnItemId: it.id,
      condition: 'OK' as const,
    }));

    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/returns/${returnId}/inspect`,
        { items },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Inspect failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">
          Loading return...
        </div>
      </div>
    );
  }

  if (error || !ret) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
            Return Not Found
          </h1>
          <p className="text-sm text-[#8A8F98] mb-4">
            {error || 'This return does not exist.'}
          </p>
          <Link
            href="/admin/returns"
            className="inline-block bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            ← Back to Returns
          </Link>
        </div>
      </div>
    );
  }

  const statusColor =
    STATUS_COLORS[ret.status] || 'bg-gray-100 text-gray-700 border-gray-300';
  const statusLabel = STATUS_LABELS[ret.status] || ret.status;
  const reasonLabel = REASON_LABELS[ret.reason] || ret.reason;

  const stepIndex = (() => {
    if (ret.status === 'REJECTED') return -1;
    if (ret.status === 'REQUESTED') return 0;
    if (ret.status === 'APPROVED' || ret.status === 'IN_TRANSIT') return 1;
    if (ret.status === 'RECEIVED') return 2;
    if (ret.status === 'INSPECTED') return 3;
    if (ret.status === 'COMPLETED' || ret.status === 'REFUNDED') return 4;
    return 0;
  })();

  const totalQty = ret.items.reduce((s, it) => s + it.qty, 0);
  const restockQty = ret.items
    .filter((it) => it.restocked)
    .reduce((s, it) => s + it.qty, 0);
  const damageQty = ret.items
    .filter((it) => it.condition === 'DAMAGED' || it.condition === 'DEFECTIVE')
    .reduce((s, it) => s + it.qty, 0);

  const canApprove = isAdmin && ret.status === 'REQUESTED';
  const canReject =
    isAdmin &&
    ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'].includes(ret.status);
  const canMarkInTransit =
    ret.channel === 'ONLINE' && ret.status === 'APPROVED';
  const canMarkReceived = ['APPROVED', 'IN_TRANSIT'].includes(ret.status);
  const canInspect = isAdmin && ret.status === 'RECEIVED';
  const canRefund = isAdmin && ret.status === 'INSPECTED';

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <Link
        href="/admin/returns"
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to returns
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] font-mono">
              {ret.returnNumber}
            </h1>
            <span
              className={`inline-block px-2.5 py-1 rounded text-[11px] font-semibold ${
                ret.channel === 'ONLINE'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {ret.channel}
            </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-[#8A8F98]">
            For order{' '}
            <Link
              href={`/admin/orders/${ret.order.id}`}
              className="hover:underline font-mono text-[#0F2A5C]"
            >
              {ret.order.orderNumber}
            </Link>{' '}
            · {ret.order.customerName} · {reasonLabel} ·{' '}
            {formatDateTime(ret.createdAt)}
          </p>
        </div>

        <button
          onClick={() => setShowPrint(true)}
          className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          🖨️ Print return slip
        </button>
      </div>

      {/* Rejected banner */}
      {ret.status === 'REJECTED' && ret.rejectionNote && (
        <div className="mb-5 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 flex items-start gap-2">
          <span>⚠</span>
          <span className="text-sm">Rejected. {ret.rejectionNote}</span>
        </div>
      )}

      {/* Progress stepper */}
      {ret.status !== 'REJECTED' && (
        <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5 mb-5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[600px]">
            {STEPS.map((step, i) => {
              const done = i <= stepIndex;
              const current = i === stepIndex;
              return (
                <div key={step.key} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        done ? 'bg-[#0F2A5C] text-white' : ''
                      }`}
                      style={{
                        borderColor: done ? '#0F2A5C' : '#E8EBF0',
                        color: done ? 'white' : '#8A8F98',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    <div
                      className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                        current ? 'text-[#0F2A5C]' : 'text-[#8A8F98]'
                      }`}
                    >
                      {step.label}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="h-0.5 flex-1 -mt-4"
                      style={{
                        background: i < stepIndex ? '#0F2A5C' : '#E8EBF0',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">
                Items being returned
              </h2>
              <span className="text-xs text-[#8A8F98]">
                {totalQty} {totalQty === 1 ? 'pc' : 'pcs'}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase">
                  <th className="text-left px-3 py-2 font-medium">Product</th>
                  <th className="text-center px-3 py-2 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 font-medium">Price</th>
                  <th className="text-center px-3 py-2 font-medium">
                    Condition
                  </th>
                </tr>
              </thead>
              <tbody>
                {ret.items.map((it) => {
                  const condColor =
                    CONDITION_COLORS[it.condition] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  const condLabel =
                    CONDITION_LABELS[it.condition] || it.condition;
                  return (
                    <tr key={it.id} className="border-t border-[#E8EBF0]">
                      <td className="px-3 py-3 text-[#5A6270]">
                        {it.name} · {it.size} {it.color}
                      </td>
                      <td className="px-3 py-3 text-center text-[#5A6270]">
                        {it.qty}
                      </td>
                      <td className="px-3 py-3 text-right text-[#5A6270]">
                        {tk(it.unitPrice)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${condColor}`}
                        >
                          {condLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {canInspect && (
              <button
                onClick={handleInspect}
                disabled={busy}
                className="mt-4 bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                ✓ Mark all as OK & inspect
              </button>
            )}
          </section>

          {/* Timeline */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Timeline
            </h2>

            {ret.events.length === 0 ? (
              <p className="text-sm text-[#8A8F98]">No events yet.</p>
            ) : (
              <div className="space-y-4">
                {ret.events.map((ev, i) => (
                  <div key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          i === 0 ? 'bg-[#0F2A5C]' : 'bg-[#E3E6EB]'
                        }`}
                      />
                      {i < ret.events.length - 1 && (
                        <div className="w-px flex-1 bg-[#E3E6EB] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-sm font-medium text-ink">
                        {STATUS_LABELS[ev.status] || ev.status}
                      </div>
                      {ev.note && (
                        <div className="text-xs text-[#5A6270] mt-0.5">
                          {ev.note}
                        </div>
                      )}
                      <div className="text-xs text-[#8A8F98] mt-0.5">
                        {formatDateTime(ev.createdAt)}
                        {ev.actorId && ` · ${ev.actorId.slice(0, 8)}...`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-1 space-y-5">
          {/* Refund amount */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Refund amount
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Items</span>
                <span className="text-[#5A6270]">{tk(ret.refundAmount)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E8EBF0] flex justify-between items-center">
              <span className="font-semibold text-[#0F2A5C]">
                Total refund
              </span>
              <span className="text-2xl font-bold text-[#0F2A5C]">
                {tk(ret.refundAmount)}
              </span>
            </div>
          </section>

          {/* Stock effect */}
          <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Stock effect
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Back to stock */}
              <button
                type="button"
                onClick={() => setStockModal('restock')}
                className="bg-[#F1F4F9] rounded-lg p-3 text-center transition cursor-pointer hover:shadow-md hover:bg-[#E8EBF0]"
                aria-label="View restocked items"
              >
                <div className="text-2xl font-bold text-emerald-600">
                  +{restockQty}
                </div>
                <div className="text-xs text-[#8A8F98] mt-1">
                  Back to stock
                </div>
              </button>

              {/* Damage stock */}
              <button
                type="button"
                onClick={() => setStockModal('damage')}
                className="bg-[#F1F4F9] rounded-lg p-3 text-center transition cursor-pointer hover:shadow-md hover:bg-[#E8EBF0]"
                aria-label="View damaged items"
              >
                <div className="text-2xl font-bold text-red-600">
                  {damageQty}
                </div>
                <div className="text-xs text-[#8A8F98] mt-1">
                  Damage stock
                </div>
              </button>
            </div>
            <p className="text-xs text-[#8A8F98] mt-3">
              {ret.status === 'INSPECTED' || ret.status === 'COMPLETED'
                ? 'Stock was updated when the inspection was saved.'
                : `${totalQty} pcs change stock only after an admin inspects them.`}
            </p>
          </section>

          {/* Refund payment */}
          {canRefund && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Refund payment
              </h2>

              <label className="text-xs uppercase tracking-wide text-[#8A8F98] mb-1 block">
                Refund method
              </label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              >
                <option value="CASH_BACK">Cash back</option>
                <option value="BKASH_REFUND">bKash refund</option>
                <option value="NAGAD_REFUND">Nagad refund</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="STORE_CREDIT">Store credit</option>
                <option value="EXCHANGE">Exchange</option>
                <option value="NO_REFUND">No refund</option>
              </select>

              <input
                type="text"
                value={refundTxId}
                onChange={(e) => setRefundTxId(e.target.value)}
                placeholder="Refund TxID (optional)"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-4 font-mono"
              />

              <button
                onClick={handleRefund}
                disabled={busy}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {busy ? 'Processing...' : `Issue refund · ${tk(ret.refundAmount)}`}
              </button>
            </section>
          )}

          {/* Actions */}
          {isAdmin && (
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Actions
              </h2>

              <div className="space-y-2">
                {canApprove && (
                  <button
                    onClick={() => doAction('approve', { note: 'Approved by admin' })}
                    disabled={busy}
                    className="w-full bg-[#0F2A5C] hover:bg-[#0A1F45] text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    ✓ Approve return
                  </button>
                )}

                {canMarkInTransit && (
                  <button
                    onClick={() => doAction('in-transit', { courier: 'Own courier' })}
                    disabled={busy}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    🚚 Mark in transit
                  </button>
                )}

                {canMarkReceived && (
                  <button
                    onClick={() => doAction('receive', { note: 'Received at shop' })}
                    disabled={busy}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    📦 Mark received
                  </button>
                )}

                {canReject && (
                  <button
                    onClick={() => setShowReject(true)}
                    disabled={busy}
                    className="w-full border border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    ✕ Reject return
                  </button>
                )}

                {!canApprove &&
                  !canMarkInTransit &&
                  !canMarkReceived &&
                  !canReject &&
                  !canInspect &&
                  !canRefund && (
                    <p className="text-sm text-[#8A8F98]">
                      No action for you right now.
                    </p>
                  )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Stock effect modal */}
      {stockModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setStockModal(null)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E8EBF0] flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                    stockModal === 'restock'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {stockModal === 'restock' ? '↩' : '⚠'}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#0F2A5C]">
                    {stockModal === 'restock'
                      ? 'Items back to stock'
                      : 'Damaged / Defective items'}
                  </h3>
                  <p className="text-xs mt-0.5 text-[#8A8F98]">
                    {stockModal === 'restock'
                      ? `${ret.items.filter((it) => it.restocked).length} item(s), ${restockQty} qty total`
                      : `${ret.items.filter((it) => it.condition === 'DAMAGED' || it.condition === 'DEFECTIVE').length} item(s), ${damageQty} qty total`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStockModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg text-[#8A8F98] hover:bg-[#F1F3F6] transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {(() => {
                const items = ret.items.filter((it) =>
                  stockModal === 'restock'
                    ? it.restocked
                    : it.condition === 'DAMAGED' ||
                      it.condition === 'DEFECTIVE'
                );

                if (items.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">
                        {stockModal === 'restock' ? '📦' : '✓'}
                      </div>
                      <p className="text-sm text-[#8A8F98]">
                        {stockModal === 'restock'
                          ? 'No items have been restocked yet.'
                          : 'No damaged items — great!'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {items.map((it) => {
                      const img = it.orderItem?.product?.images?.[0];
                      return (
                        <div
                          key={it.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-[#E8EBF0] bg-[#F7F8FA]"
                        >
                          {/* Image */}
                          <div className="w-12 h-14 rounded-md overflow-hidden flex-shrink-0 bg-white">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt={it.name}
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
                            <div className="font-medium text-sm text-[#0F2A5C] truncate">
                              {it.name}
                            </div>
                            <div className="text-xs mt-0.5 text-[#8A8F98]">
                              {it.color} • {it.size} • Qty: {it.qty}
                            </div>
                            <div className="text-xs font-mono mt-0.5 text-[#5A6270]">
                              {tk(it.unitPrice)} each
                            </div>
                          </div>

                          {/* Badge */}
                          <div className="flex-shrink-0">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                stockModal === 'restock'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {stockModal === 'restock'
                                ? `+${it.qty} to stock`
                                : `${it.condition} (not restocked)`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#E8EBF0] flex justify-end bg-[#F7F8FA]">
              <button
                onClick={() => setStockModal(null)}
                className="bg-white border border-[#E8EBF0] text-[#0F2A5C] px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#F1F3F6] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print return slip modal */}
      {showPrint && (
        <ReturnSlipModal
          data={{
            returnNumber: ret.returnNumber,
            createdAt: ret.createdAt,
            channel: ret.channel,
            status: ret.status,
            reason: ret.reason,
            refundAmount: ret.refundAmount,
            refundMethod: ret.refundMethod,
            refundTxId: ret.refundTxId,
            refundedAt: ret.refundedAt,
            order: {
              orderNumber: ret.order.orderNumber,
              customerName: ret.order.customerName,
              customerPhone: ret.order.customerPhone,
            },
            items: ret.items.map((it) => ({
              id: it.id,
              name: it.name,
              size: it.size,
              color: it.color,
              qty: it.qty,
              unitPrice: it.unitPrice,
              condition: it.condition,
            })),
          }}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* Reject modal */}
      {showReject && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowReject(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
              Reject this return?
            </h3>
            <p className="text-sm text-[#8A8F98] mb-4">
              The customer will be notified. Stock will not be restored.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (required)..."
              rows={3}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={busy || !rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {busy ? 'Rejecting...' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}