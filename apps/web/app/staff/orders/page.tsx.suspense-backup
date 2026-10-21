'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import { SegmentedControl } from '@/components/SegmentedControl';

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
}

interface Order {
  id: string;
  orderNumber: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  district?: string | null;
  total: string | number;
  subtotal: string | number;
  discount: string | number;
  paymentMethod: string;
  paymentStatus: string;
  paymentTxId?: string | null;
  senderPhone?: string | null;
  createdAt: string;
  items: OrderItem[];
  _count?: { items: number };
  profit?: number;
}

interface Stats {
  todayOrders: number;
  needsAction: number;
  todayRevenue: number;
  codToCollect: number;
}

interface ChannelCounts {
  all: number;
  online: number;
  offline: number;
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
const STATUSES = [
  { value: 'ALL', label: 'All' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURNED', label: 'Returned' },
];

const PAYMENT_STATUSES = [
  { value: 'ALL', label: 'All payments' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

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

// ============================================
// Page
// ============================================
export default function StaffOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  // URL-backed channel state
  const channelParam = (searchParams.get('channel') as
    | 'all'
    | 'online'
    | 'offline'
    | null) || (isAdmin ? 'all' : 'offline');

  const [channel, setChannel] = useState<'all' | 'online' | 'offline'>(
    channelParam
  );

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [counts, setCounts] = useState<ChannelCounts>({
    all: 0,
    online: 0,
    offline: 0,
  });
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [status, setStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>(
    'newest'
  );
  const [page, setPage] = useState(1);

  // ============================================
  // Sync channel to URL
  // ============================================
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (channel === (isAdmin ? 'all' : 'offline')) {
      params.delete('channel');
    } else {
      params.set('channel', channel);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    setPage(1);
  }, [channel]);

  // ============================================
  // Load data
  // ============================================
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const baseQs = new URLSearchParams();
      baseQs.set('limit', '25');
      baseQs.set('page', String(page));
      if (status !== 'ALL') baseQs.set('status', status);
      if (paymentStatus !== 'ALL') baseQs.set('paymentStatus', paymentStatus);
      if (search.trim()) baseQs.set('q', search.trim());
      baseQs.set('sort', sort);

      const listQs = new URLSearchParams(baseQs);
      if (channel !== 'all') listQs.set('channel', channel.toUpperCase());

      const countsQs = new URLSearchParams(baseQs);
      countsQs.delete('page');
      countsQs.delete('limit');
      countsQs.delete('sort');

      const [listRes, countsRes, statsRes] = await Promise.all([
        api.get<Order[]>(`/api/orders?${listQs.toString()}`, { token }),
        api.get<ChannelCounts>(
          `/api/orders/counts?${countsQs.toString()}`,
          { token }
        ),
        api.get<Stats>(`/api/orders/stats`, { token }),
      ]);

      setOrders(listRes.data || []);
      setPagination(listRes.pagination || null);
      setCounts(countsRes.data || { all: 0, online: 0, offline: 0 });
      setStats(statsRes.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load orders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [channel, status, paymentStatus, search, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  // ============================================
  // Segmented control options
  // ============================================
  const segments = isAdmin
    ? [
        { value: 'all', label: 'All', count: counts.all },
        { value: 'online', label: 'Online', count: counts.online },
        { value: 'offline', label: 'Offline', count: counts.offline },
      ]
    : [
        {
          value: 'offline',
          label: 'My POS sales',
          count: counts.offline,
        },
        {
          value: 'online',
          label: 'Online',
          count: counts.online,
          locked: true,
          lockedHint: 'read-only',
        },
      ];

  const showReadOnlyNotice = !isAdmin && channel === 'online';

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      {/* ============ Header ============ */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1
            className="font-serif text-3xl font-semibold mb-1"
            style={{ color: 'var(--staff-text)' }}
          >
            Orders
          </h1>
          <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
            {pagination?.total ?? 0} orders found
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              // TODO: Export CSV (Phase 4)
              window.alert('Export CSV coming soon');
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition"
            style={{
              background: 'var(--staff-card)',
              color: 'var(--staff-primary)',
              borderColor: 'var(--staff-border)',
            }}
          >
            ↓ Export CSV
          </button>
        )}
      </div>

      {/* ============ Stats cards ============ */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Today's orders"
            value={String(stats.todayOrders)}
            tint="var(--staff-primary)"
          />
          <StatCard
            label="Needs action"
            value={String(stats.needsAction)}
            tint="var(--staff-warning)"
            highlight={stats.needsAction > 0}
          />
          <StatCard
            label="Today's revenue"
            value={tk(stats.todayRevenue)}
            tint="var(--staff-success)"
          />
          <StatCard
            label="COD to collect"
            value={tk(stats.codToCollect)}
            tint="var(--staff-accent)"
          />
        </div>
      )}

      {/* ============ Segmented control ============ */}
      <div className="mb-4">
        <SegmentedControl
          options={segments}
          value={channel}
          onChange={(v) => setChannel(v as any)}
          ariaLabel="Order channel"
        />
      </div>

      {/* ============ Read-only notice (staff + online) ============ */}
      {showReadOnlyNotice && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm border flex items-center gap-2"
          style={{
            background: 'rgba(31, 78, 121, 0.06)',
            color: 'var(--staff-primary)',
            borderColor: 'var(--staff-border)',
          }}
        >
          <span aria-hidden="true">🔒</span>
          <span>Online orders are read-only for staff.</span>
        </div>
      )}

      {/* ============ Filters bar ============ */}
      <div
        className="rounded-lg p-4 mb-5 flex flex-col md:flex-row md:items-center gap-3"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        {/* Status pills */}
        <div className="flex flex-wrap gap-2 flex-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatus(s.value);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                status === s.value
                  ? 'text-white shadow'
                  : 'hover:opacity-80'
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

        {/* Payment status + sort */}
        <div className="flex items-center gap-2">
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-sm border transition focus:outline-none"
            style={{
              background: 'var(--staff-tile-bg, #F1F3F6)',
              color: 'var(--staff-text)',
              borderColor: 'transparent',
            }}
          >
            {PAYMENT_STATUSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as any);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-sm border transition focus:outline-none"
            style={{
              background: 'var(--staff-tile-bg, #F1F3F6)',
              color: 'var(--staff-text)',
              borderColor: 'transparent',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order # or phone..."
              className="rounded-lg px-3.5 py-2 text-sm w-full md:w-56 focus:outline-none border transition"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg text-sm font-medium transition"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-primary)',
              }}
              aria-label="Search"
            >
              🔍
            </button>
          </form>
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
          <div className="p-16 text-center text-sm" style={{ color: 'var(--staff-muted)' }}>
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="mb-2" style={{ color: 'var(--staff-text)' }}>
              No orders found
            </p>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Try changing filters or channel
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
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium">Channel</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-center px-4 py-3 font-medium">Items</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Payment</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const statusColor =
                    STATUS_COLORS[o.status.toUpperCase()] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  const channelColor =
                    CHANNEL_COLORS[o.channel] || 'bg-gray-100 text-gray-700';
                  return (
                    <tr
                      key={o.id}
                      className="border-t transition-colors hover:bg-[var(--staff-card-hover)]"
                      style={{ borderColor: 'var(--staff-border)' }}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="font-mono text-xs font-semibold"
                          style={{ color: 'var(--staff-primary)' }}
                        >
                          {o.orderNumber}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          {formatDateTime(o.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${channelColor}`}
                        >
                          {o.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={{ color: 'var(--staff-text)' }}
                        >
                          {o.customerName}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          {o.customerPhone || '—'}
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-center"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {o._count?.items ?? o.items?.length ?? 0}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {tk(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="text-xs"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          {o.paymentMethod}
                        </div>
                        <div className="text-xs mt-0.5">
                          <span
                            style={{
                              color:
                                o.paymentStatus === 'PAID'
                                  ? 'var(--staff-success)'
                                  : 'var(--staff-warning)',
                            }}
                          >
                            {o.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/staff/orders/${o.id}`}
                          className="text-xs font-medium hover:underline"
                          style={{ color: 'var(--staff-primary)' }}
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
              className="px-4 py-2 rounded-lg text-sm border transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-4 py-2 rounded-lg text-sm border transition disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

// ============================================
// StatCard component
// ============================================
function StatCard({
  label,
  value,
  tint,
  highlight,
}: {
  label: string;
  value: string;
  tint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        background: 'var(--staff-card)',
        borderColor: highlight ? tint : 'var(--staff-border)',
        boxShadow: highlight
          ? `0 0 0 1px ${tint}20, 0 2px 10px rgba(15,42,92,0.06)`
          : '0 2px 10px rgba(15,42,92,0.06)',
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--staff-muted)' }}>
        {label}
      </div>
      <div className="text-xl font-semibold" style={{ color: tint }}>
        {value}
      </div>
    </div>
  );
}