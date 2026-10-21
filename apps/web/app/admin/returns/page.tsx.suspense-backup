'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface ReturnItem {
  id: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: string | number;
  condition: string;
}

interface ReturnRecord {
  id: string;
  returnNumber: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  reason: string;
  reasonNote?: string | null;
  refundAmount: string | number;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
  };
  items: ReturnItem[];
}

interface Stats {
  myReturnsToday: number;
  waitingAdmin: number;
  refunded24h: number;
  damagedCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// Constants
// ============================================
const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'REQUESTED', label: 'Needs my action' },
  { value: 'APPROVED', label: 'Requested' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'INSPECTED', label: 'Inspected' },
  { value: 'COMPLETED', label: 'Refunded' },
  { value: 'REJECTED', label: 'Rejected' },
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

const CHANNEL_COLORS: Record<string, string> = {
  ONLINE: 'bg-blue-100 text-blue-700',
  OFFLINE: 'bg-emerald-100 text-emerald-700',
};

// ============================================
// Page
// ============================================
export default function AdminReturnsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const statusParam = searchParams.get('status') || 'ALL';
  const [status, setStatus] = useState(statusParam);

  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ============================================
  // Sync status to URL
  // ============================================
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    setPage(1);
  }, [status]);

  // ============================================
  // Load data
  // ============================================
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      qs.set('limit', '25');
      qs.set('page', String(page));
      if (status !== 'ALL') qs.set('status', status);
      if (search.trim()) qs.set('q', search.trim());

      const [listRes, statsRes] = await Promise.all([
        api.get<ReturnRecord[]>(`/api/returns?${qs.toString()}`, { token }),
        api.get<Stats>(`/api/returns/stats`, { token }),
      ]);

      setReturns(listRes.data || []);
      setPagination(listRes.pagination || null);
      setStats(statsRes.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load returns';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-xl">↩</span>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-0.5">
              Returns & refunds
            </h1>
            <p className="text-[#8A8F98] text-sm">
              Shop and website returns in one place
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards (Admin view) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <AdminStatCard
            icon="⚠"
            label="Needs approval"
            value={String(stats.waitingAdmin)}
            tint="#D97706"
          />
          <AdminStatCard
            icon="🔍"
            label="Waiting for inspection"
            value={String(stats.myReturnsToday)}
            tint="#1F4E79"
          />
          <AdminStatCard
            icon="↩"
            label="Refunded (24h)"
            value={tk(stats.refunded24h)}
            tint="#059669"
          />
          <AdminStatCard
            icon="⚠"
            label="Damaged or defective"
            value={`${stats.damagedCount} pcs`}
            tint="#DC2626"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search return number, order number or customer"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
                🔍
              </span>
            </div>
          </form>

          <Link
            href="/staff/returns/new"
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap"
          >
            + New return
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                status === s.value
                  ? 'bg-[#0F2A5C] text-white shadow'
                  : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#8A8F98] text-sm">
            Loading returns...
          </div>
        ) : returns.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-[#5A6270] mb-2">No returns found</p>
            <p className="text-sm text-[#8A8F98]">
              Click &ldquo;+ New return&rdquo; to create one
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Return</th>
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium">Channel</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-center px-4 py-3 font-medium">Items</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                  <th className="text-right px-4 py-3 font-medium">Refund</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => {
                  const statusColor =
                    STATUS_COLORS[r.status] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  const channelColor =
                    CHANNEL_COLORS[r.channel] || 'bg-gray-100 text-gray-700';
                  const statusLabel = STATUS_LABELS[r.status] || r.status;
                  const reasonLabel = REASON_LABELS[r.reason] || r.reason;
                  const itemCount = r.items.reduce((s, it) => s + it.qty, 0);

                  return (
                    <tr
                      key={r.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/returns/${r.id}`}
                          className="font-mono text-xs text-[#0F2A5C] font-semibold hover:underline"
                        >
                          {r.returnNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0F2A5C]">
                        {r.order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${channelColor}`}
                        >
                          {r.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#5A6270]">
                        {r.order.customerName || '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-[#5A6270]">
                        {itemCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#5A6270]">
                        {reasonLabel}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                        {tk(r.refundAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8A8F98] whitespace-nowrap">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/returns/${r.id}`}
                          className="text-xs text-[#0F2A5C] font-medium hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-sm text-[#8A8F98]">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-white border border-[#E8EBF0] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F4F9] disabled:opacity-50 transition"
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-[#E8EBF0] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F4F9] disabled:opacity-50 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Admin StatCard
// ============================================
function AdminStatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: string;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E8EBF0] flex items-center gap-3 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${tint}15`, color: tint }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-[#8A8F98] mb-0.5 truncate">{label}</div>
        <div className="text-xl font-semibold" style={{ color: tint }}>
          {value}
        </div>
      </div>
    </div>
  );
}