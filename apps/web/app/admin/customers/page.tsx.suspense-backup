'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
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
const SEGMENTS = [
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
export default function AdminCustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [exporting, setExporting] = useState(false);

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

  async function handleExport() {
    setExporting(true);
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (segment !== 'ALL') qs.set('segment', segment);
      if (search.trim()) qs.set('q', search.trim());
      qs.set('sort', sort);

      const url = `${
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      }/api/customers/export?${qs.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tanavia-customers-${new Date().toISOString().split('T')[0]}.csv`;
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

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-0.5">
              Customers
            </h1>
            <p className="text-[#8A8F98] text-sm">
              Shop and website customers, one list
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="👥"
            label="Total customers"
            value={String(stats.total)}
            tint="#0F2A5C"
            onClick={() => setSegment('ALL')}
          />
          <StatCard
            icon="🆕"
            label="New this month"
            value={String(stats.newThisMonth || 0)}
            tint="#7C3AED"
            onClick={() => setSegment('NEW')}
          />
          <StatCard
            icon="📈"
            label="Active (30 days)"
            value={String(stats.active30d)}
            tint="#059669"
            onClick={() => setSegment('ACTIVE')}
          />
          <StatCard
            icon="🔄"
            label="Repeat customers"
            value={String(stats.repeat || 0)}
            tint="#EA580C"
            onClick={() => setSegment('REPEAT')}
          />
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone or email"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
                🔍
              </span>
            </div>
          </form>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          >
            <option value="newest">Newest</option>
            <option value="recently-ordered">Recently ordered</option>
            <option value="most-orders">Most orders</option>
            <option value="highest-spend">Highest spend</option>
          </select>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap disabled:opacity-60"
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap"
          >
            + Add customer
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSegment(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                segment === s.value
                  ? 'bg-[#0F2A5C] text-white shadow'
                  : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
              }`}
            >
              {s.label}
              {segmentCounts[s.value] !== undefined && (
                <span
                  className={`ml-1.5 ${
                    segment === s.value ? 'opacity-90' : 'opacity-60'
                  }`}
                >
                  {segmentCounts[s.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8A8F98] pt-1 border-t border-[#E8EBF0]">
          <span>🔒</span>
          <span>
            Staff can search customers and see their orders. Spending, notes and
            tags are admin only.
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#8A8F98] text-sm">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-[#5A6270] mb-2">No customers found</p>
            <p className="text-sm text-[#8A8F98]">
              Click &ldquo;+ Add customer&rdquo; to create one
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-center px-4 py-3 font-medium">Orders</th>
                  <th className="text-right px-4 py-3 font-medium">
                    Total Spent
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Returns</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Last Order
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <CustomerAvatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-[#0F2A5C] truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-[#8A8F98] truncate">
                            {c.email || 'No email'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:+88${c.phone}`}
                        className="font-mono text-xs text-[#0F2A5C] hover:underline"
                      >
                        {c.phone} 📞
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#0F2A5C]">
                      {c.orders}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                      ৳{Number(c.totalSpent || 0).toLocaleString('en-BD')}
                    </td>
                    <td className="px-4 py-3 text-center text-[#5A6270]">
                      —
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8A8F98]">
                      {timeAgo(c.lastOrder)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <CustomerStatusBadge status={c.status} />
                        {c.needsReview && (
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

      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleCustomerCreated}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-emerald-600">
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
      className={`bg-white rounded-lg p-4 border border-[#E8EBF0] flex items-center gap-3 shadow-[0_2px_10px_rgba(15,42,92,0.06)] transition text-left w-full ${
        onClick ? 'hover:shadow-md hover:border-[#0F2A5C]/30 cursor-pointer' : ''
      }`}
    >
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
    </Tag>
  );
}