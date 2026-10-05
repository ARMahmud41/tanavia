'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface POItem {
  id: string;
  qty: number;
  received: number;
  unitCost: string | number;
  product: { id: string; name: string };
  variant?: { size: string; color: string } | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  subtotal: string | number;
  due: string | number;
  createdAt: string;
  supplier: { id: string; name: string; phone: string };
  items: POItem[];
}

interface Stats {
  draft: number;
  ordered: number;
  partial: number;
  received: number;
  cancelled: number;
  pendingValue: number;
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
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

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
export default function PurchasesPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
        api.get<PurchaseOrder[]>(`/api/purchases?${qs.toString()}`, { token }),
        api.get<Stats>(`/api/purchases/stats`, { token }),
      ]);

      setItems(listRes.data || []);
      setPagination(listRes.pagination || null);
      setStats(statsRes.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load purchases';
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

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Purchases
          </h1>
          <p className="text-[#8A8F98] text-sm">
            Stock coming in from suppliers
          </p>
        </div>
        <Link
          href="/admin/purchases/new"
          className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2"
        >
          <span>+</span> New Purchase Order
        </Link>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Draft" value={String(stats.draft)} tint="#6B7280" />
          <StatCard
            label="Ordered"
            value={String(stats.ordered)}
            tint="#2563EB"
          />
          <StatCard
            label="Partial"
            value={String(stats.partial)}
            tint="#D97706"
          />
          <StatCard
            label="Received"
            value={String(stats.received)}
            tint="#059669"
          />
          <StatCard
            label="Pending value"
            value={tk(stats.pendingValue)}
            tint="#7C3AED"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO number or supplier"
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
              🔍
            </span>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatus(s.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
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
            Loading purchases...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">🛍️</div>
            <p className="text-[#5A6270] mb-4">No purchase orders yet</p>
            <Link
              href="/admin/purchases/new"
              className="text-[#0F2A5C] font-medium text-sm hover:underline"
            >
              + Create your first PO
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">PO #</th>
                  <th className="text-left px-4 py-3 font-medium">Supplier</th>
                  <th className="text-center px-4 py-3 font-medium">Items</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-right px-4 py-3 font-medium">Due</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((po) => {
                  const statusColor =
                    STATUS_COLORS[po.status] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  const totalQty = po.items.reduce((s, i) => s + i.qty, 0);
                  const receivedQty = po.items.reduce(
                    (s, i) => s + i.received,
                    0
                  );

                  return (
                    <tr
                      key={po.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/purchases/${po.id}`}
                          className="font-mono text-xs font-semibold text-[#0F2A5C] hover:underline"
                        >
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#0F2A5C]">
                          {po.supplier.name}
                        </div>
                        <div className="text-xs text-[#8A8F98]">
                          {po.supplier.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-[#5A6270]">
                        {receivedQty > 0 && receivedQty < totalQty ? (
                          <span className="text-amber-600 font-medium">
                            {receivedQty}/{totalQty}
                          </span>
                        ) : (
                          <span>{po.items.length}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                        {tk(po.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#C81E1E] font-mono text-xs">
                        {Number(po.due) > 0 ? tk(po.due) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8A8F98]">
                        {formatDateTime(po.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/purchases/${po.id}`}
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

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E8EBF0] shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
      <div className="text-xs text-[#8A8F98] mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color: tint }}>
        {value}
      </div>
    </div>
  );
}