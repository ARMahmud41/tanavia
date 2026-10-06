'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

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
  onOrder?: number;
  product: {
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string; slug: string } | null;
    image: string | null;
  };
  // Note: cost/value NOT returned by backend for staff
}

interface Stats {
  totalSkus: number;
  lowCount: number;
  outCount: number;
  held: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW' | 'OUT';

// ============================================
// Page
// ============================================
export default function StaffInventoryPage() {
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
  const [reportFor, setReportFor] = useState<InventoryItem | null>(null);

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
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-lg sm:text-xl">📦</span>
        </div>
        <div>
          <h1
            className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold"
            style={{ color: 'var(--staff-text)' }}
          >
            Inventory
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>
            Stock levels and alerts
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg p-3 mb-4 flex items-start gap-2 text-sm border"
        style={{
          background: 'rgba(31, 78, 121, 0.06)',
          color: 'var(--staff-primary)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <span>ℹ️</span>
        <span>View stock levels. Report issues to admin.</span>
      </div>

      {/* Stats — 4 cards (no cost/value) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          label="Total SKUs"
          value={String(stats?.totalSkus ?? 0)}
          color="navy"
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
          label="Held (Online)"
          value={String(stats?.held ?? 0)}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 flex flex-col gap-3"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search product, SKU or barcode..."
              className="w-full rounded-lg px-3.5 py-2.5 pl-10 text-sm border focus:outline-none min-h-[44px]"
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
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white min-h-[44px]"
            style={{ background: 'var(--staff-primary)' }}
          >
            Search
          </button>
        </form>

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
                  status === s ? 'text-white shadow' : ''
                }`}
                style={
                  status === s
                    ? { background: 'var(--staff-primary)' }
                    : {
                        background: 'var(--staff-tile-bg, #F1F3F6)',
                        color: 'var(--staff-muted)',
                      }
                }
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

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div
          className="p-16 text-center text-sm rounded-lg"
          style={{
            background: 'var(--staff-card)',
            color: 'var(--staff-muted)',
          }}
        >
          Loading inventory...
        </div>
      ) : items.length === 0 ? (
        <div
          className="p-12 sm:p-16 text-center rounded-lg"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium" style={{ color: 'var(--staff-text)' }}>
            No items match
          </p>
          <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
            Try changing the filter or search
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block rounded-lg overflow-hidden" style={{ background: 'var(--staff-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9]" style={{ color: 'var(--staff-muted)' }}>
                    <th className="text-left px-4 py-3 font-semibold">Product</th>
                    <th className="text-left px-3 py-3 font-semibold">SKU</th>
                    <th className="text-center px-3 py-3 font-semibold">On hand</th>
                    <th className="text-center px-3 py-3 font-semibold">Held</th>
                    <th className="text-center px-3 py-3 font-semibold">Available</th>
                    <th className="text-center px-3 py-3 font-semibold">On order</th>
                    <th className="text-center px-3 py-3 font-semibold">Status</th>
                    <th className="text-right px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const b = statusBadge(it.status);
                    return (
                      <tr
                        key={it.id}
                        className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA] cursor-pointer"
                        onClick={() => setSelected(it)}
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
                              <div className="font-semibold truncate" style={{ color: 'var(--staff-text)' }}>
                                {it.product.name}
                              </div>
                              <div className="text-[11px]" style={{ color: 'var(--staff-muted)' }}>
                                {it.size} / {it.color}
                                {it.product.category && ` · ${it.product.category.name}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px]" style={{ color: 'var(--staff-muted)' }}>
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
                            <span style={{ color: 'var(--staff-muted)' }}>0</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold" style={{ color: 'var(--staff-primary)' }}>
                          {it.available}
                        </td>
                        <td className="px-3 py-3 text-center" style={{ color: 'var(--staff-muted)' }}>
                          {it.onOrder || 0}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${b.cls}`}
                          >
                            ● {b.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportFor(it);
                            }}
                            className="text-xs px-3 py-1.5 rounded-md font-medium border min-h-[36px]"
                            style={{
                              borderColor: 'var(--staff-border)',
                              color: 'var(--staff-primary)',
                            }}
                          >
                            🚩 Report
                          </button>
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
                <div
                  key={it.id}
                  className="rounded-lg p-4"
                  style={{
                    background: 'var(--staff-card)',
                    boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
                  }}
                >
                  <button
                    onClick={() => setSelected(it)}
                    className="w-full text-left"
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
                        <div className="font-semibold truncate text-sm" style={{ color: 'var(--staff-text)' }}>
                          {it.product.name}
                        </div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--staff-muted)' }}>
                          {it.size} / {it.color}
                        </div>
                        <div className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--staff-muted)' }}>
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
                        <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--staff-muted)' }}>
                          On hand
                        </div>
                        <div className="text-sm font-bold" style={{ color: 'var(--staff-text)' }}>
                          {it.onHand}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--staff-muted)' }}>
                          Held
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            it.held > 0 ? 'text-amber-700' : ''
                          }`}
                          style={it.held === 0 ? { color: 'var(--staff-muted)' } : {}}
                        >
                          {it.held}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--staff-muted)' }}>
                          Available
                        </div>
                        <div className="text-sm font-bold text-emerald-700">
                          {it.available}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--staff-muted)' }}>
                          On order
                        </div>
                        <div className="text-sm font-bold" style={{ color: 'var(--staff-muted)' }}>
                          {it.onOrder || 0}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setReportFor(it)}
                    className="w-full mt-3 px-4 py-2.5 rounded-lg text-xs font-semibold border min-h-[40px]"
                    style={{
                      borderColor: 'var(--staff-border)',
                      color: 'var(--staff-primary)',
                    }}
                  >
                    🚩 Report a problem
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-xs" style={{ color: 'var(--staff-muted)' }}>
            Page {pagination.page} of {pagination.totalPages} · {total} items
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg text-xs font-medium border disabled:opacity-50 min-h-[40px]"
              style={{
                borderColor: 'var(--staff-border)',
                color: 'var(--staff-primary)',
              }}
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-xs font-medium border disabled:opacity-50 min-h-[40px]"
              style={{
                borderColor: 'var(--staff-border)',
                color: 'var(--staff-primary)',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <DetailPanel item={selected} onClose={() => setSelected(null)} />
      )}

      {/* Report modal */}
      {reportFor && (
        <ReportModal
          item={reportFor}
          onClose={() => setReportFor(null)}
          onSuccess={() => {
            setReportFor(null);
            load();
          }}
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
  color: 'navy' | 'amber' | 'red' | 'blue';
  warn?: boolean;
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-700',
    blue: 'from-[#1F4E79] to-[#2F7D7A]',
  };
  return (
    <div
      className="rounded-lg p-3 sm:p-4 border relative"
      style={{
        background: 'var(--staff-card)',
        borderColor: 'var(--staff-border)',
        boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
      }}
    >
      {warn && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide font-medium truncate" style={{ color: 'var(--staff-muted)' }}>
            {label}
          </div>
          <div className="text-base sm:text-2xl font-bold leading-tight" style={{ color: 'var(--staff-text)' }}>
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Detail Panel (read-only, no cost)
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
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
        style={{ background: 'var(--staff-card)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 p-4 flex items-start gap-3 z-10 border-b"
          style={{ background: 'var(--staff-card)', borderColor: 'var(--staff-border)' }}
        >
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
            <h2 className="font-serif text-base sm:text-lg font-semibold truncate" style={{ color: 'var(--staff-text)' }}>
              {item.product.name}
            </h2>
            <div className="text-xs mt-0.5" style={{ color: 'var(--staff-muted)' }}>
              {item.size} / {item.color}
            </div>
            <div className="font-mono text-[10px] mt-0.5 truncate" style={{ color: 'var(--staff-muted)' }}>
              {item.sku}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 min-h-[40px] min-w-[40px]"
            style={{ color: 'var(--staff-muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${b.cls}`}>
              ● {b.label}
            </span>
          </div>

          {/* Available vs Held bar */}
          <div
            className="rounded-lg p-4"
            style={{ background: 'var(--staff-bg)' }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--staff-muted)' }}>
                  Available
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {item.available}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--staff-muted)' }}>
                  Held
                </div>
                <div className="text-lg font-bold text-amber-700">
                  {item.held}
                </div>
              </div>
            </div>

            <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--staff-card)' }}>
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${100 - heldPct}%` }}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${heldPct}%` }}
              />
            </div>

            <div className="text-[11px] mt-2 text-center" style={{ color: 'var(--staff-muted)' }}>
              On hand: <strong style={{ color: 'var(--staff-text)' }}>{item.onHand}</strong>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--staff-border)' }}>
              <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--staff-muted)' }}>
                On order
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--staff-text)' }}>
                {item.onOrder || 0}
              </div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--staff-border)' }}>
              <div className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--staff-muted)' }}>
                Reorder at
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--staff-text)' }}>
                {item.reorderLevel}
              </div>
            </div>
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
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--staff-text)' }}>
              Recent movements
            </div>
            {loading ? (
              <div className="text-xs" style={{ color: 'var(--staff-muted)' }}>Loading…</div>
            ) : detail?.movements?.length ? (
              <div className="space-y-2">
                {detail.movements.slice(0, 4).map((m: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs p-2 rounded border"
                    style={{ borderColor: 'var(--staff-border)' }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--staff-text)' }}>
                        {m.reason}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--staff-muted)' }}>
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
              <div className="text-xs" style={{ color: 'var(--staff-muted)' }}>No movements yet</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// Report Modal
// ============================================
const REPORT_TYPES = [
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'DAMAGED', label: 'Damaged item' },
  { value: 'COUNT_MISMATCH', label: 'Count mismatch' },
  { value: 'WRONG_BARCODE', label: 'Wrong barcode' },
];

function ReportModal({
  item,
  onClose,
  onSuccess,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [type, setType] = useState('LOW_STOCK');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = getToken() || undefined;
      await api.post(
        '/api/inventory/report',
        { variantId: item.id, type, note: note.trim() || undefined },
        { token }
      );
      onSuccess();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to submit';
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg p-5"
        style={{ background: 'var(--staff-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-lg font-semibold mb-1" style={{ color: 'var(--staff-text)' }}>
          Report a problem
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--staff-muted)' }}>
          {item.product.name} · {item.size}/{item.color}
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--staff-text)' }}>
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`py-2.5 rounded-lg text-xs font-medium border-2 transition min-h-[44px] ${
                    type === t.value
                      ? 'border-[#0F2A5C] bg-[#0F2A5C]/5 text-[#0F2A5C]'
                      : ''
                  }`}
                  style={
                    type === t.value
                      ? {}
                      : { borderColor: 'var(--staff-border)', color: 'var(--staff-muted)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--staff-text)' }}>
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none min-h-[80px]"
              style={{
                borderColor: 'var(--staff-border)',
                background: 'var(--staff-bg)',
                color: 'var(--staff-text)',
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border min-h-[44px]"
            style={{
              borderColor: 'var(--staff-border)',
              color: 'var(--staff-text)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]"
            style={{ background: 'var(--staff-primary)' }}
          >
            {saving ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}