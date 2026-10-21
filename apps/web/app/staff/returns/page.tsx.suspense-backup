'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import { ReturnSlipModal } from './components/ReturnSlipModal';

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
  refundMethod?: string | null;
  refundTxId?: string | null;
  refundedAt?: string | null;
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
export default function ReturnsPage() {
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
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>(
    'newest'
  );
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);
  const [reprintData, setReprintData] = useState<ReturnRecord | null>(null);
  const [exporting, setExporting] = useState(false);

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
      qs.set('sort', sort);

      // Date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let rangeFrom = '';
      let rangeTo = '';

      if (dateRange === 'today') {
        rangeFrom = today.toISOString().split('T')[0];
        rangeTo = rangeFrom;
      } else if (dateRange === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        rangeFrom = y.toISOString().split('T')[0];
        rangeTo = rangeFrom;
      } else if (dateRange === '7d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        rangeFrom = d.toISOString().split('T')[0];
        rangeTo = today.toISOString().split('T')[0];
      } else if (dateRange === '30d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        rangeFrom = d.toISOString().split('T')[0];
        rangeTo = today.toISOString().split('T')[0];
      } else if (dateRange === 'custom') {
        rangeFrom = fromDate;
        rangeTo = toDate;
      }

      if (rangeFrom) qs.set('from', rangeFrom);
      if (rangeTo) qs.set('to', rangeTo);

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
  }, [status, search, sort, dateRange, fromDate, toDate, page]);

  useEffect(() => {
    load();
  }, [load]);

  // ============================================
  // Export CSV (admin only)
  // ============================================
  async function handleExport() {
    setExporting(true);
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      if (status !== 'ALL') qs.set('status', status);
      if (search.trim()) qs.set('q', search.trim());
      qs.set('sort', sort);

      // Apply same date range logic used by load()
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let rangeFrom = '';
      let rangeTo = '';

      if (dateRange === 'today') {
        rangeFrom = today.toISOString().split('T')[0];
        rangeTo = rangeFrom;
      } else if (dateRange === 'yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        rangeFrom = y.toISOString().split('T')[0];
        rangeTo = rangeFrom;
      } else if (dateRange === '7d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        rangeFrom = d.toISOString().split('T')[0];
        rangeTo = today.toISOString().split('T')[0];
      } else if (dateRange === '30d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        rangeFrom = d.toISOString().split('T')[0];
        rangeTo = today.toISOString().split('T')[0];
      } else if (dateRange === 'custom') {
        rangeFrom = fromDate;
        rangeTo = toDate;
      }

      if (rangeFrom) qs.set('from', rangeFrom);
      if (rangeTo) qs.set('to', rangeTo);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url = `${baseUrl}/api/returns/export?${qs.toString()}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tanavia-returns-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* ============ Header ============ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
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
              Returns and refunds
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Shop and website returns in one place
            </p>
          </div>
        </div>
      </div>

      {/* ============ Stats cards ============ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {isAdmin ? (
            <>
              <StatCard
                icon="⚠"
                label="Needs approval"
                value={String(stats.waitingAdmin)}
                tint="var(--staff-warning)"
              />
              <StatCard
                icon="🔍"
                label="Waiting for inspection"
                value={String(stats.myReturnsToday)}
                tint="var(--staff-primary)"
              />
              <StatCard
                icon="↩"
                label="Refunded (24h)"
                value={tk(stats.refunded24h)}
                tint="var(--staff-success)"
              />
              <StatCard
                icon="⚠"
                label="Damaged or defective"
                value={`${stats.damagedCount} pcs`}
                tint="var(--staff-danger)"
              />
            </>
          ) : (
            <>
              <StatCard
                icon="↩"
                label="My returns today"
                value={String(stats.myReturnsToday)}
                tint="var(--staff-primary)"
              />
              <StatCard
                icon="⏳"
                label="Waiting for admin"
                value={String(stats.waitingAdmin)}
                tint="var(--staff-warning)"
              />
            </>
          )}
        </div>
      )}

      {/* ============ Filters bar ============ */}
      <div
        className="rounded-lg p-4 mb-5 flex flex-col gap-3"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search return number, order number or customer"
                className="w-full rounded-lg px-3.5 py-2 pl-10 text-sm border focus:outline-none"
                style={{
                  background: 'var(--staff-tile-bg, #F1F3F6)',
                  color: 'var(--staff-text)',
                  borderColor: 'transparent',
                }}
              />
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--staff-muted)' }}
              >
                🔍
              </span>
            </div>
          </form>

          {/* Export CSV button (admin only) */}
          {isAdmin && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
              style={{
                background: 'var(--staff-card)',
                color: 'var(--staff-primary)',
                borderColor: 'var(--staff-border)',
              }}
            >
              {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
            </button>
          )}

          {/* New Return button */}
          <Link
            href="/staff/returns/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2 whitespace-nowrap"
            style={{ background: 'var(--staff-primary)' }}
          >
            + New return
          </Link>
        </div>

        {/* Date range quick filters */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--staff-muted)' }}
          >
            Date:
          </span>
          {(['all', 'today', 'yesterday', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setDateRange(r);
                setFromDate('');
                setToDate('');
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                dateRange === r ? 'text-white' : ''
              }`}
              style={
                dateRange === r
                  ? { background: 'var(--staff-primary)' }
                  : {
                      background: 'var(--staff-tile-bg, #F1F3F6)',
                      color: 'var(--staff-muted)',
                    }
              }
            >
              {r === 'all' && 'All'}
              {r === 'today' && 'Today'}
              {r === 'yesterday' && 'Yesterday'}
              {r === '7d' && '7 days'}
              {r === '30d' && '30 days'}
            </button>
          ))}
          <button
            onClick={() => setDateRange('custom')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
              dateRange === 'custom' ? 'text-white' : ''
            }`}
            style={
              dateRange === 'custom'
                ? { background: 'var(--staff-primary)' }
                : {
                    background: 'var(--staff-tile-bg, #F1F3F6)',
                    color: 'var(--staff-muted)',
                  }
            }
          >
            📅 Custom
          </button>
        </div>

        {/* Custom date range inputs */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs border focus:outline-none"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--staff-muted)' }}>
              to
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs border focus:outline-none"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            />
          </div>
        )}

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 mb-2">
          <label
            className="text-xs font-medium"
            style={{ color: 'var(--staff-muted)' }}
          >
            Sort:
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-lg px-3 py-1.5 text-xs border focus:outline-none"
            style={{
              background: 'var(--staff-tile-bg, #F1F3F6)',
              color: 'var(--staff-text)',
              borderColor: 'transparent',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest refund</option>
            <option value="lowest">Lowest refund</option>
          </select>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                status === s.value ? 'text-white shadow' : 'hover:opacity-80'
              }`}
              style={
                status === s.value
                  ? { background: 'var(--staff-primary)' }
                  : {
                      background: 'var(--staff-tile-bg, #F1F3F6)',
                      color: 'var(--staff-muted)',
                    }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ Error ============ */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ============ Table ============ */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        {loading ? (
          <div
            className="p-16 text-center text-sm"
            style={{ color: 'var(--staff-muted)' }}
          >
            Loading returns...
          </div>
        ) : returns.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="mb-2" style={{ color: 'var(--staff-text)' }}>
              No returns found
            </p>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Click &ldquo;+ New return&rdquo; to create one
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase tracking-wide"
                  style={{
                    background: 'var(--staff-tile-bg, #F1F4F9)',
                    color: 'var(--staff-muted)',
                  }}
                >
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
                  const itemCount = r.items.reduce((sum, it) => sum + it.qty, 0);

                  return (
                    <tr
                      key={r.id}
                      className="border-t transition-colors hover:bg-[var(--staff-card-hover)]"
                      style={{ borderColor: 'var(--staff-border)' }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/staff/returns/${r.id}`}
                          className="font-mono text-xs font-semibold hover:underline"
                          style={{ color: 'var(--staff-primary)' }}
                        >
                          {r.returnNumber}
                        </Link>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {r.order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${channelColor}`}
                        >
                          {r.channel}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {r.order.customerName || '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-center"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {itemCount}
                      </td>
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {reasonLabel}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {tk(r.refundAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setActionsOpen(
                                actionsOpen === r.id ? null : r.id
                              )
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                            style={{
                              background: 'var(--staff-card)',
                              color: 'var(--staff-text)',
                              borderColor: 'var(--staff-border)',
                            }}
                            aria-label="Actions"
                          >
                            Actions ▾
                          </button>

                          {actionsOpen === r.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionsOpen(null)}
                              />
                              <div
                                className="absolute right-0 mt-1 w-44 rounded-lg shadow-lg border z-20 overflow-hidden"
                                style={{
                                  background: 'var(--staff-card)',
                                  borderColor: 'var(--staff-border)',
                                }}
                              >
                                <Link
                                  href={`/staff/returns/${r.id}`}
                                  className="block px-3 py-2 text-xs hover:bg-[var(--staff-card-hover)]"
                                  style={{ color: 'var(--staff-text)' }}
                                  onClick={() => setActionsOpen(null)}
                                >
                                  👁 View details
                                </Link>
                                <button
                                  onClick={() => {
                                    setReprintData(r);
                                    setActionsOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--staff-card-hover)]"
                                  style={{ color: 'var(--staff-text)' }}
                                >
                                  🖨️ Reprint slip
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      r.returnNumber
                                    );
                                    setActionsOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--staff-card-hover)]"
                                  style={{ color: 'var(--staff-text)' }}
                                >
                                  📋 Copy return #
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Pagination ============ */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-sm" style={{ color: 'var(--staff-muted)' }}>
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg text-sm border transition disabled:opacity-50"
              style={{
                background: 'var(--staff-card)',
                color: 'var(--staff-primary)',
                borderColor: 'var(--staff-border)',
              }}
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-sm border transition disabled:opacity-50"
              style={{
                background: 'var(--staff-card)',
                color: 'var(--staff-primary)',
                borderColor: 'var(--staff-border)',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Reprint slip modal */}
      {reprintData && (
        <ReturnSlipModal
          data={{
            returnNumber: reprintData.returnNumber,
            createdAt: reprintData.createdAt,
            channel: reprintData.channel,
            status: reprintData.status,
            reason: reprintData.reason,
            refundAmount: reprintData.refundAmount,
            refundMethod: reprintData.refundMethod,
            refundTxId: reprintData.refundTxId,
            refundedAt: reprintData.refundedAt,
            order: {
              orderNumber: reprintData.order.orderNumber,
              customerName: reprintData.order.customerName,
              customerPhone: reprintData.order.customerPhone,
            },
            items: reprintData.items.map((it) => ({
              id: it.id,
              name: it.name,
              size: it.size,
              color: it.color,
              qty: it.qty,
              unitPrice: it.unitPrice,
              condition: it.condition,
            })),
          }}
          onClose={() => setReprintData(null)}
        />
      )}
    </div>
  );
}

// ============================================
// StatCard
// ============================================
function StatCard({
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
    <div
      className="rounded-lg p-4 border flex items-center gap-3"
      style={{
        background: 'var(--staff-card)',
        borderColor: 'var(--staff-border)',
        boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${tint}15`, color: tint }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className="text-xs mb-0.5 truncate"
          style={{ color: 'var(--staff-muted)' }}
        >
          {label}
        </div>
        <div className="text-xl font-semibold" style={{ color: tint }}>
          {value}
        </div>
      </div>
    </div>
  );
}