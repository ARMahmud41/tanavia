'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string | null;
  size: string;
  color: string;
  onHand: number;
  held: number;
  available: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW' | 'OUT';
  product: {
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string; slug: string } | null;
    image: string | null;
  };
  cost?: number;
  value?: number;
  onOrder?: number;
}

interface Stats {
  totalSkus: number;
  lowCount: number;
  outCount: number;
  held: number;
  stockValue?: number;
  deadStockValue?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type TabKey = 'overview' | 'low' | 'movements' | 'count' | 'valuation';
type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW' | 'OUT';

// ============================================
// Page
// ============================================
export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', '25');
      if (search.trim()) qs.set('search', search.trim());
      if (status !== 'ALL') qs.set('status', status);

      const [listRes, statsRes] = await Promise.all([
        api.get<InventoryItem[]>(`/api/inventory?${qs.toString()}`, { token }),
        api.get<Stats>('/api/inventory/stats', { token }),
      ]);

      setItems(listRes.data || []);
      setPagination(listRes.pagination || null);
      setStats(statsRes.data || null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load inventory'
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function statusBadge(s: string) {
    if (s === 'OUT')
      return { label: 'Out', cls: 'bg-red-50 text-red-700 border-red-200' };
    if (s === 'LOW')
      return { label: 'Low', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'In stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }

  const total = pagination?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">📦</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Inventory
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Stock, alerts, purchases, valuation
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Link
            href="/admin/purchases/new"
            className="flex-1 sm:flex-initial text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition min-h-[44px] flex items-center justify-center"
          >
            + Purchase
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] hover:bg-[#F1F3F6] disabled:opacity-50 min-h-[44px]"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* Tab bar (same as Finance) */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Stock', href: '/admin/inventory', active: true },
            { key: 'low', label: 'Low stock', href: '/admin/inventory/low-stock' },
            { key: 'movements', label: 'Movements', href: '/admin/stock/movements' },
            { key: 'count', label: 'Count', href: '/admin/inventory/count' },
            { key: 'valuation', label: 'Valuation', href: '/admin/inventory/valuation' },
          ].map((t) =>
            t.active ? (
              <span
                key={t.key}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold bg-[#0F2A5C] text-white whitespace-nowrap"
              >
                {t.label}
              </span>
            ) : (
              <Link
                key={t.key}
                href={t.href}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#5A6270] hover:bg-[#F1F3F6] whitespace-nowrap"
              >
                {t.label}
              </Link>
            )
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* Stats cards */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 mb-5">
        <StatCard
          label="Total SKUs"
          value={String(stats?.totalSkus ?? 0)}
          color="navy"
        />
        <StatCard
          label="Stock Value"
          value={tk(stats?.stockValue ?? 0)}
          color="emerald"
        />
        <StatCard
          label="Low Stock"
          value={String(stats?.lowCount ?? 0)}
          color="amber"
          warn={Boolean(stats?.lowCount)}
        />
        <StatCard
          label="Out of Stock"
          value={String(stats?.outCount ?? 0)}
          color="red"
          warn={Boolean(stats?.outCount)}
        />
        <StatCard
          label="Dead Stock"
          value={tk(stats?.deadStockValue ?? 0)}
          color="gray"
        />
      </div>

      {/* ============================================ */}
      {/* Filters */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-3 sm:p-4 mb-4 sm:mb-5 flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search product, SKU or barcode..."
              className="w-full rounded-lg px-3.5 py-2.5 pl-10 text-sm border border-transparent bg-[#F1F3F6] focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
              🔍
            </span>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] min-h-[44px]"
          >
            Search
          </button>
        </form>

        {/* Status chips with counts */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {(['ALL', 'IN_STOCK', 'LOW', 'OUT'] as StatusFilter[]).map((s) => {
            const count =
              s === 'ALL'
                ? stats?.totalSkus ?? 0
                : s === 'LOW'
                ? stats?.lowCount ?? 0
                : s === 'OUT'
                ? stats?.outCount ?? 0
                : (stats?.totalSkus ?? 0) -
                  (stats?.lowCount ?? 0) -
                  (stats?.outCount ?? 0);
            const label =
              s === 'ALL'
                ? 'All'
                : s === 'IN_STOCK'
                ? 'In stock'
                : s === 'LOW'
                ? 'Low'
                : 'Out';
            return (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  status === s
                    ? 'text-white bg-[#0F2A5C] shadow'
                    : 'text-[#8A8F98] bg-[#F1F3F6]'
                }`}
              >
                {label}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    status === s
                      ? 'bg-white/20'
                      : s === 'LOW'
                      ? 'bg-amber-100 text-amber-700'
                      : s === 'OUT'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-white'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ============================================ */}
      {/* Items — desktop table / mobile cards */}
      {/* ============================================ */}
      {loading ? (
        <div className="p-16 text-center text-sm text-[#8A8F98] bg-white rounded-lg">
          Loading inventory...
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-white rounded-lg">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-[#0F2A5C] font-medium">No items match</p>
          <p className="text-sm text-[#8A8F98]">
            Try changing the filter or search
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block rounded-lg overflow-hidden bg-white shadow-sm border border-[#E8EBF0]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                    <th className="text-left px-4 py-3 font-semibold">Product</th>
                    <th className="text-left px-3 py-3 font-semibold">SKU</th>
                    <th className="text-center px-3 py-3 font-semibold">On hand</th>
                    <th className="text-center px-3 py-3 font-semibold">Held</th>
                    <th className="text-center px-3 py-3 font-semibold">Available</th>
                    <th className="text-center px-3 py-3 font-semibold">On order</th>
                    <th className="text-center px-3 py-3 font-semibold">Cost</th>
                    <th className="text-center px-3 py-3 font-semibold">Value</th>
                    <th className="text-center px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const b = statusBadge(it.status);
                    return (
                      <tr
                        key={it.id}
                        onClick={() => setSelected(it)}
                        className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA] cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#F1F3F6] flex-shrink-0 overflow-hidden">
                              {it.product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.product.image}
                                  alt={it.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg">
                                  📷
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#0F2A5C] truncate">
                                {it.product.name}
                              </div>
                              <div className="text-[11px] text-[#8A8F98]">
                                {it.size} / {it.color}
                                {it.product.category && ` · ${it.product.category.name}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-[#5A6270]">
                          {it.sku}
                        </td>
                        <td className="px-3 py-3 text-center font-medium">
                          {it.onHand}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {it.held > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {it.held}
                            </span>
                          ) : (
                            <span className="text-[#8A8F98]">0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-[#0F2A5C]">
                          {it.available}
                        </td>
                        <td className="px-3 py-3 text-center text-[#8A8F98]">
                          {it.onOrder || 0}
                        </td>
                        <td className="px-3 py-3 text-center text-xs">
                          {it.cost != null ? tk(it.cost) : '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-semibold text-[#0F2A5C]">
                          {it.value != null ? tk(it.value) : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${b.cls}`}
                          >
                            ● {b.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {items.map((it) => {
              const b = statusBadge(it.status);
              return (
                <button
                  key={it.id}
                  onClick={() => setSelected(it)}
                  className="w-full text-left bg-white rounded-lg p-4 shadow-sm border border-[#E8EBF0] active:bg-[#F7F8FA]"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-14 h-14 rounded-lg bg-[#F1F3F6] flex-shrink-0 overflow-hidden">
                      {it.product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.product.image}
                          alt={it.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          📷
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#0F2A5C] truncate">
                        {it.product.name}
                      </div>
                      <div className="text-xs text-[#8A8F98] mt-0.5 truncate">
                        {it.size} / {it.color}
                      </div>
                      <div className="font-mono text-[10px] text-[#8A8F98] mt-0.5 truncate">
                        {it.sku}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${b.cls}`}
                    >
                      {b.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#F1F3F6]">
                    <div className="text-center">
                      <div className="text-[9px] uppercase tracking-wide text-[#8A8F98]">
                        On hand
                      </div>
                      <div className="text-sm font-bold text-[#0F2A5C]">
                        {it.onHand}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] uppercase tracking-wide text-[#8A8F98]">
                        Held
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          it.held > 0 ? 'text-amber-700' : 'text-[#8A8F98]'
                        }`}
                      >
                        {it.held}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] uppercase tracking-wide text-[#8A8F98]">
                        Available
                      </div>
                      <div className="text-sm font-bold text-emerald-700">
                        {it.available}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] uppercase tracking-wide text-[#8A8F98]">
                        On order
                      </div>
                      <div className="text-sm font-bold text-[#8A8F98]">
                        {it.onOrder || 0}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-xs text-[#8A8F98]">
            Page {pagination.page} of {pagination.totalPages} · {total} items
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* Detail panel (slide-in from right) */}
      {/* ============================================ */}
      {selected && (
        <DetailPanel
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Stat Card
// ============================================
function StatCard({
  label,
  value,
  color,
  warn,
}: {
  label: string;
  value: string;
  color: 'navy' | 'emerald' | 'amber' | 'red' | 'gray';
  warn?: boolean;
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-700',
    gray: 'from-gray-400 to-gray-600',
  };
  return (
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0] relative">
      {warn && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
            {label}
          </div>
          <div className="text-base sm:text-2xl font-bold text-[#0F2A5C] leading-tight truncate">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Detail Panel
// ============================================
function DetailPanel({
  item,
  onClose,
}: {
  item: InventoryItem;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = getToken() || undefined;
        const res = await api.get<any>(`/api/inventory/${item.id}`, { token });
        setDetail(res.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [item.id]);

  const b = (() => {
    if (item.status === 'OUT')
      return { label: 'Out of stock', cls: 'bg-red-50 text-red-700 border-red-200' };
    if (item.status === 'LOW')
      return { label: 'Low stock', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'In stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  })();

  const heldPct =
    item.onHand > 0 ? Math.min(100, (item.held / item.onHand) * 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E8EBF0] p-4 flex items-start gap-3 z-10">
          <div className="w-14 h-14 rounded-lg bg-[#F1F3F6] flex-shrink-0 overflow-hidden">
            {item.product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                📷
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] truncate">
              {item.product.name}
            </h2>
            <div className="text-xs text-[#8A8F98] mt-0.5">
              {item.size} / {item.color}
            </div>
            <div className="font-mono text-[10px] text-[#8A8F98] mt-0.5 truncate">
              {item.sku}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F1F3F6] flex items-center justify-center text-[#8A8F98] flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Status badge */}
          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${b.cls}`}
            >
              ● {b.label}
            </span>
          </div>

          {/* Available vs Held bar */}
          <div className="rounded-lg bg-[#F7F8FA] p-4">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
                  Available
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {item.available}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
                  Held
                </div>
                <div className="text-lg font-bold text-amber-700">
                  {item.held}
                </div>
              </div>
            </div>

            <div className="h-2 rounded-full overflow-hidden bg-white flex">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${100 - heldPct}%` }}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${heldPct}%` }}
              />
            </div>

            <div className="text-[11px] text-[#8A8F98] mt-2 text-center">
              On hand: <strong className="text-[#0F2A5C]">{item.onHand}</strong>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#E8EBF0] p-3">
              <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
                On order
              </div>
              <div className="text-lg font-bold text-[#0F2A5C]">
                {item.onOrder || 0}
              </div>
            </div>
            <div className="rounded-lg border border-[#E8EBF0] p-3">
              <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
                Reorder at
              </div>
              <div className="text-lg font-bold text-[#0F2A5C]">
                {item.reorderLevel}
              </div>
            </div>
            {item.cost != null && (
              <div className="rounded-lg border border-[#E8EBF0] p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
                  Cost (avg)
                </div>
                <div className="text-base font-bold text-[#0F2A5C]">
                  {tk(item.cost)}
                </div>
              </div>
            )}
            {item.value != null && (
              <div className="rounded-lg border border-[#E8EBF0] p-3">
                <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
                  Stock value
                </div>
                <div className="text-base font-bold text-[#0F2A5C]">
                  {tk(item.value)}
                </div>
              </div>
            )}
          </div>

          {/* Why held */}
          {item.held > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="text-xs font-semibold text-amber-800 mb-1">
                ⚠️ Why {item.held} {item.held === 1 ? 'piece is' : 'pieces are'} held
              </div>
              <div className="text-[11px] text-amber-700">
                {loading
                  ? 'Loading…'
                  : detail?.heldByOrders?.length
                  ? detail.heldByOrders.map((o: any, i: number) => (
                      <div key={i}>
                        • Order {o.orderNumber} — {o.qty} pcs
                      </div>
                    ))
                  : 'Reserved by online orders — will free up on ship/cancel.'}
              </div>
            </div>
          )}

          {/* Recent movements */}
          <div>
            <div className="text-xs font-semibold text-[#0F2A5C] mb-2 uppercase tracking-wide">
              Recent movements
            </div>
            {loading ? (
              <div className="text-xs text-[#8A8F98]">Loading…</div>
            ) : detail?.movements?.length ? (
              <div className="space-y-2">
                {detail.movements.slice(0, 4).map((m: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs p-2 rounded border border-[#F1F3F6]"
                  >
                    <div>
                      <div className="font-medium text-[#0F2A5C]">
                        {m.reason}
                      </div>
                      <div className="text-[10px] text-[#8A8F98]">
                        {m.reference || '—'}
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        m.delta > 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {m.delta > 0 ? '+' : ''}
                      {m.delta}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#8A8F98]">No movements yet</div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#E8EBF0] flex flex-col gap-2">
            <Link
              href={`/admin/inventory/adjust/${item.id}`}
              className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] min-h-[44px] flex items-center justify-center"
            >
              Adjust Stock
            </Link>
            <Link
              href={`/admin/products/${item.product.id}`}
              className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] hover:bg-[#F1F3F6] min-h-[44px] flex items-center justify-center"
            >
              View Product
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}