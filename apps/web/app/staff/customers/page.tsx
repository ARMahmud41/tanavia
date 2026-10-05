'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { CustomerStatusBadge } from '@/components/customers/StatusBadge';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';

// ============================================
// Types
// ============================================
interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  orders: number;
  totalSpent?: number;
  lastOrder?: string | null;
  status: string;
  tags: string[];
  blockedReason?: string | null;
  needsReview?: boolean;
  returnRate?: number;
}

interface Stats {
  total: number;
  newThisMonth?: number;
  active30d: number;
  repeat?: number;
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
const SEGMENTS_STAFF = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REPEAT', label: 'Repeat' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const SEGMENTS_ADMIN = [
  { value: 'ALL', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REPEAT', label: 'Repeat' },
  { value: 'VIP', label: 'VIP' },
  { value: 'AT_RISK', label: 'At risk' },
  { value: 'RETURN_PRONE', label: 'Return-prone' },
  { value: 'BLOCKED', label: 'Blocked' },
];

// ============================================
// Helpers
// ============================================
function timeAgo(date: string | null | undefined): string {
  if (!date) return 'Never';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================
// Page
// ============================================
export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const user = getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';

  const segmentParam = searchParams.get('segment') || 'ALL';
  const [segment, setSegment] = useState(segmentParam);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Sync segment to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (segment === 'ALL') params.delete('segment');
    else params.set('segment', segment);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    setPage(1);
  }, [segment]);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      qs.set('limit', '25');
      qs.set('page', String(page));
      if (segment !== 'ALL') qs.set('segment', segment);
      if (search.trim()) qs.set('q', search.trim());
      qs.set('sort', sort);

      const countsQs = new URLSearchParams();
      if (search.trim()) countsQs.set('q', search.trim());

      const [listRes, statsRes, countsRes] = await Promise.all([
        api.get<Customer[]>(`/api/customers?${qs.toString()}`, { token }),
        api.get<Stats>(`/api/customers/stats`, { token }),
        api.get<Record<string, number>>(
          `/api/customers/segment-counts?${countsQs.toString()}`,
          { token }
        ),
      ]);

      setCustomers(listRes.data || []);
      setPagination(listRes.pagination || null);
      setStats(statsRes.data || null);
      setSegmentCounts(countsRes.data || {});
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load customers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [segment, search, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function handleCustomerCreated(customer: Customer) {
    setShowAddModal(false);
    setToast(`✓ Customer added: ${customer.name}`);
    setTimeout(() => setToast(null), 3000);
    load();
  }

  const segments = isAdmin ? SEGMENTS_ADMIN : SEGMENTS_STAFF;

  // ============================================
  // Render
  // ============================================
  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--staff-primary)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/customers-icon.svg"
              alt="Customers"
              width={22}
              height={22}
            />
          </div>
          <div>
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              Customers
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Shop and website customers, one list
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className={`grid gap-4 mb-6 ${isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
          <StatCard
            icon="👥"
            label="Total customers"
            value={String(stats.total)}
            tint="var(--staff-primary)"
            onClick={() => setSegment('ALL')}
          />
          {isAdmin && (
            <StatCard
              icon="🆕"
              label="New this month"
              value={String(stats.newThisMonth || 0)}
              tint="#7C3AED"
              onClick={() => setSegment('NEW')}
            />
          )}
          <StatCard
            icon="📈"
            label="Active (30 days)"
            value={String(stats.active30d)}
            tint="var(--staff-success)"
            onClick={() => setSegment('ACTIVE')}
          />
          {isAdmin && (
            <StatCard
              icon="🔄"
              label="Repeat customers"
              value={String(stats.repeat || 0)}
              tint="var(--staff-warning)"
              onClick={() => setSegment('REPEAT')}
            />
          )}
        </div>
      )}

      {/* Filters bar */}
      <div
        className="rounded-lg p-4 mb-5 flex flex-col gap-3"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone or email"
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

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{
              background: 'var(--staff-tile-bg, #F1F3F6)',
              color: 'var(--staff-text)',
              borderColor: 'transparent',
            }}
          >
            <option value="newest">Newest</option>
            <option value="recently-ordered">Recently ordered</option>
            <option value="most-orders">Most orders</option>
            {isAdmin && <option value="highest-spend">Highest spend</option>}
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2 whitespace-nowrap"
            style={{ background: 'var(--staff-primary)' }}
          >
            + Add customer
          </button>
        </div>

        {/* Segment chips */}
        <div className="flex flex-wrap gap-2">
          {segments.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                segment === s.value ? 'text-white shadow' : ''
              }`}
              style={
                segment === s.value
                  ? { background: 'var(--staff-primary)' }
                  : {
                      background: 'var(--staff-tile-bg, #F1F3F6)',
                      color: 'var(--staff-muted)',
                    }
              }
            >
              {s.label}
              {segmentCounts[s.value] !== undefined && (
                <span className="ml-1.5 opacity-70">
                  {segmentCounts[s.value]}
                </span>
              )}
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
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="mb-2" style={{ color: 'var(--staff-text)' }}>
              No customers found
            </p>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Click &ldquo;+ Add customer&rdquo; to create one
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
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-center px-4 py-3 font-medium">Orders</th>
                  <th className="text-center px-4 py-3 font-medium">Returns</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 font-medium">
                      Total spent
                    </th>
                  )}
                  <th className="text-left px-4 py-3 font-medium">
                    Last order
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t transition-colors hover:bg-[var(--staff-card-hover)]"
                    style={{ borderColor: 'var(--staff-border)' }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/customers/${c.id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <CustomerAvatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div
                            className="font-medium truncate"
                            style={{ color: 'var(--staff-text)' }}
                          >
                            {c.name}
                          </div>
                          {c.email ? (
                            <div
                              className="text-xs truncate"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {c.email}
                            </div>
                          ) : (
                            <div
                              className="text-xs"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              No email
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:+88${c.phone}`}
                        className="font-mono text-xs hover:underline"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {c.phone} 📞
                      </a>
                    </td>
                    <td
                      className="px-4 py-3 text-center font-semibold"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {c.orders}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      —
                    </td>
                    {isAdmin && (
                      <td
                        className="px-4 py-3 text-right font-semibold"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        ৳{Number(c.totalSpent || 0).toLocaleString('en-BD')}
                      </td>
                    )}
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {timeAgo(c.lastOrder)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <CustomerStatusBadge status={c.status} />
                        {isAdmin && c.needsReview && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            Needs review
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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

      {/* Add customer modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCustomerCreated}
        />
      )}

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

// ============================================
// StatCard
// ============================================
function StatCard({
  icon,
  label,
  value,
  tint,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  tint: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-lg p-4 border flex items-center gap-3 text-left w-full transition ${
        onClick ? 'hover:shadow-md cursor-pointer' : ''
      }`}
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
    </Tag>
  );
}