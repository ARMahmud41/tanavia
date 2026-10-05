'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Movement {
  id: string;
  type: string;
  qty: number;
  before: number;
  after: number;
  reason?: string | null;
  refId?: string | null;
  actorId?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    productImages?: Array<{ url: string; isPrimary: boolean }>;
  } | null;
  variant?: {
    id: string;
    size: string;
    color: string;
    sku?: string | null;
  } | null;
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
const MOVEMENT_TYPES = [
  { value: 'ALL', label: 'All types' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'SALE_ONLINE', label: 'Online sale' },
  { value: 'SALE_OFFLINE', label: 'POS sale' },
  { value: 'RETURN', label: 'Return' },
  { value: 'RETURN_DAMAGE', label: 'Return (damaged)' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'RESERVE', label: 'Reserved' },
  { value: 'RESERVE_RELEASE', label: 'Reservation released' },
];

const TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SALE_ONLINE: 'bg-red-50 text-red-700 border-red-200',
  SALE_OFFLINE: 'bg-red-50 text-red-700 border-red-200',
  RETURN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RETURN_DAMAGE: 'bg-gray-100 text-gray-600 border-gray-300',
  DAMAGE: 'bg-red-50 text-red-700 border-red-200',
  ADJUSTMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  TRANSFER: 'bg-blue-50 text-blue-700 border-blue-200',
  RESERVE: 'bg-amber-50 text-amber-700 border-amber-200',
  RESERVE_RELEASE: 'bg-gray-100 text-gray-600 border-gray-300',
};

// ============================================
// Page
// ============================================
export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [type, setType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      qs.set('limit', '50');
      qs.set('page', String(page));
      if (type !== 'ALL') qs.set('type', type);
      if (search.trim()) qs.set('search', search.trim());
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);

      const res = await api.get<Movement[]>(
        `/api/stock/movements?${qs.toString()}`,
        { token }
      );

      setMovements(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load movements';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [type, search, from, to, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function resetFilters() {
    setType('ALL');
    setSearch('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const hasFilters =
    type !== 'ALL' || search.trim() || from || to;

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/stock"
          className="text-sm text-[#8A8F98] hover:text-[#0F2A5C] inline-flex items-center gap-1 mb-2"
        >
          ← Back to Stock
        </Link>
        <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
          Stock Movements
        </h1>
        <p className="text-[#8A8F98] text-sm">
          Every change to inventory, with reason and actor.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name, SKU..."
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
                🔍
              </span>
            </div>
          </form>

          {/* Type */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Reset */}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#5A6270] px-3 py-2 rounded-lg text-sm font-medium transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[#8A8F98]">Date:</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
          />
          <span className="text-[#8A8F98]">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
          />
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
            Loading movements...
          </div>
        ) : movements.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-[#5A6270] mb-2">No movements found</p>
            <p className="text-sm text-[#8A8F98]">
              {hasFilters ? 'Try changing filters' : 'Movements will appear here as stock changes'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">When</th>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-center px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Change</th>
                  <th className="text-right px-4 py-3 font-medium">Before → After</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const typeColor =
                    TYPE_COLORS[m.type] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  const primaryImg = m.product?.productImages?.find(
                    (i) => i.isPrimary
                  );
                  const imgUrl = primaryImg?.url || m.product?.productImages?.[0]?.url;

                  return (
                    <tr
                      key={m.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                    >
                      {/* When */}
                      <td className="px-4 py-3 text-xs text-[#8A8F98] whitespace-nowrap">
                        {formatDateTime(m.createdAt)}
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        {m.product ? (
                          <Link
                            href={`/admin/products/${m.product.id}`}
                            className="flex items-center gap-2 hover:opacity-80"
                          >
                            <div className="w-8 h-10 rounded bg-[#F1F3F6] overflow-hidden flex-shrink-0">
                              {imgUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imgUrl}
                                  alt={m.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px]">
                                  📷
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[#0F2A5C] text-xs truncate">
                                {m.product.name}
                              </div>
                              <div className="text-[10px] text-[#8A8F98] font-mono truncate">
                                {m.product.sku}
                                {m.variant && ` · ${m.variant.size}/${m.variant.color}`}
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-[#8A8F98]">—</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeColor}`}
                        >
                          {m.type.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Change */}
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          m.qty > 0
                            ? 'text-emerald-600'
                            : m.qty < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {m.qty > 0 ? '+' : ''}
                        {m.qty}
                      </td>

                      {/* Before → After */}
                      <td className="px-4 py-3 text-right text-xs text-[#5A6270] font-mono">
                        {m.before} → {m.after}
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3 text-xs text-[#8A8F98] max-w-xs truncate">
                        {m.reason || '—'}
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
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
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