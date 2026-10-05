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
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
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
export default function StaffPurchasesPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
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

      const res = await api.get<PurchaseOrder[]>(
        `/api/purchases?${qs.toString()}`,
        { token }
      );

      setItems(res.data || []);
      setPagination(res.pagination || null);
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
            <span className="text-white font-bold text-xl">🛍️</span>
          </div>
          <div>
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              Purchases
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Stock coming in from suppliers (read-only)
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg p-3 mb-5 flex items-start gap-2 text-sm border"
        style={{
          background: 'rgba(31, 78, 121, 0.06)',
          color: 'var(--staff-primary)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <span>ℹ️</span>
        <span>
          You can view purchase orders. Only an admin can create or receive
          stock.
        </span>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-4 mb-5 flex flex-col gap-3"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO number or supplier"
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

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatus(s.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                status === s.value ? 'text-white shadow' : ''
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
            Loading purchases...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">🛍️</div>
            <p style={{ color: 'var(--staff-text)' }}>
              No purchase orders found
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
                  <th className="text-left px-4 py-3 font-medium">PO #</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Supplier
                  </th>
                  <th className="text-center px-4 py-3 font-medium">
                    Progress
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((po) => {
                  const statusColor =
                    STATUS_COLORS[po.status] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  const totalQty = po.items.reduce(
                    (s, i) => s + i.qty,
                    0
                  );
                  const receivedQty = po.items.reduce(
                    (s, i) => s + i.received,
                    0
                  );
                  const pct =
                    totalQty > 0 ? (receivedQty / totalQty) * 100 : 0;

                  return (
                    <tr
                      key={po.id}
                      className="border-t"
                      style={{ borderColor: 'var(--staff-border)' }}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="font-mono text-xs font-semibold"
                          style={{ color: 'var(--staff-primary)' }}
                        >
                          {po.poNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={{ color: 'var(--staff-text)' }}
                        >
                          {po.supplier.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: 'var(--staff-muted)' }}
                        >
                          {po.supplier.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[60px]"
                            style={{ background: 'var(--staff-bg)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background:
                                  pct === 100
                                    ? 'var(--staff-success)'
                                    : 'var(--staff-primary)',
                              }}
                            />
                          </div>
                          <span
                            className="text-xs whitespace-nowrap"
                            style={{ color: 'var(--staff-muted)' }}
                          >
                            {receivedQty}/{totalQty}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-right font-semibold"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {tk(po.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs whitespace-nowrap"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {formatDateTime(po.createdAt)}
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
    </div>
  );
}