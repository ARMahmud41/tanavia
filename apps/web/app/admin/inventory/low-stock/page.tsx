'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface LowStockItem {
  id: string;
  sku: string;
  barcode?: string | null;
  size: string;
  color: string;
  onHand: number;
  held: number;
  available: number;
  reorderLevel: number;
  status: 'LOW' | 'OUT';
  sold30: number;
  onOrder: number;
  suggested: number;
  product: {
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string; slug: string } | null;
    image: string | null;
  };
}

interface Report {
  id: string;
  type: string;
  note?: string | null;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  variantId: string;
  variant?: {
    sku: string;
    size: string;
    color: string;
    product: { name: string };
  };
  createdBy?: { name: string; email: string } | null;
}

// ============================================
// Page
// ============================================
export default function LowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showReports, setShowReports] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const [listRes, reportsRes] = await Promise.all([
        api.get<LowStockItem[]>('/api/inventory/low-stock', { token }),
        api
          .get<Report[]>('/api/inventory/reports?status=OPEN', { token })
          .catch(() => ({ data: [] as Report[] })),
      ]);
      setItems(listRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((it) => it.id)));
    }
  }

  const selectedItems = items.filter((it) => selectedIds.has(it.id));
  const selectedTotal = selectedItems.reduce(
    (sum, it) => sum + it.suggested * 0,
    0
  );

  const lowCount = items.filter((i) => i.status === 'LOW').length;
  const outCount = items.filter((i) => i.status === 'OUT').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
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

        <div className="flex gap-2">
          <button
            onClick={() => setShowReports((v) => !v)}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition min-h-[44px] ${
              showReports
                ? 'bg-[#0F2A5C] text-white border-[#0F2A5C]'
                : 'bg-white text-[#0F2A5C] border-[#E8EBF0]'
            }`}
          >
            📋 Reports {reports.length > 0 && `(${reports.length})`}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] hover:bg-[#F1F3F6] disabled:opacity-50 min-h-[44px]"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Stock', href: '/admin/inventory' },
            { key: 'low', label: 'Low stock', href: '/admin/inventory/low-stock', active: true },
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <Stat label="Low stock" value={String(lowCount)} color="amber" />
        <Stat label="Out of stock" value={String(outCount)} color="red" />
        <Stat
          label="Open reports"
          value={String(reports.length)}
          color={reports.length > 0 ? 'blue' : 'gray'}
        />
        <Stat
          label="Selected"
          value={String(selectedIds.size)}
          color="navy"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Reports inbox (collapsible) */}
      {showReports && (
        <div className="mb-5 rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-3">
            📋 Staff Reports Inbox
          </h2>
          {reports.length === 0 ? (
            <p className="text-sm text-[#8A8F98] py-4 text-center">
              No open reports. All good!
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 py-3 border-b border-[#F1F3F6] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#0F2A5C]">
                        {r.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">
                        OPEN
                      </span>
                    </div>
                    {r.variant && (
                      <div className="text-[11px] text-[#8A8F98] mt-0.5">
                        {r.variant.product.name} — {r.variant.size}/{r.variant.color}
                      </div>
                    )}
                    {r.note && (
                      <div className="text-xs text-[#5A6270] mt-1">{r.note}</div>
                    )}
                    <div className="text-[10px] text-[#8A8F98] mt-0.5">
                      By {r.createdBy?.name || 'staff'} ·{' '}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="p-16 text-center text-sm text-[#8A8F98] bg-white rounded-lg">
          Loading low stock items...
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-white rounded-lg">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-[#0F2A5C] font-medium">All stocked up!</p>
          <p className="text-sm text-[#8A8F98]">
            No items are running low right now
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
                    <th className="text-left px-4 py-3 font-semibold w-10">
                      <input
                        type="checkbox"
                        checked={
                          items.length > 0 && selectedIds.size === items.length
                        }
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left px-3 py-3 font-semibold">Product</th>
                    <th className="text-center px-3 py-3 font-semibold">Available</th>
                    <th className="text-center px-3 py-3 font-semibold">Held</th>
                    <th className="text-center px-3 py-3 font-semibold">On order</th>
                    <th className="text-center px-3 py-3 font-semibold">Sold (30d)</th>
                    <th className="text-center px-3 py-3 font-semibold">Suggested</th>
                    <th className="text-center px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr
                      key={it.id}
                      className={`border-t border-[#F1F3F6] hover:bg-[#F7F8FA] ${
                        selectedIds.has(it.id) ? 'bg-[#F7F8FA]' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(it.id)}
                          onChange={() => toggleSelect(it.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-3">
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
                              {it.size} / {it.color} · {it.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-[#0F2A5C]">
                        {it.available}
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
                      <td className="px-3 py-3 text-center text-[#8A8F98]">
                        {it.onOrder || 0}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-medium text-[#5A6270]">
                          {it.sold30 || 0}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {it.suggested > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#0F2A5C]/10 text-[#0F2A5C] font-bold text-xs">
                            {it.suggested}
                          </span>
                        ) : (
                          <span className="text-[#8A8F98]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={it.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className={`bg-white rounded-lg p-4 shadow-sm border transition ${
                  selectedIds.has(it.id)
                    ? 'border-[#0F2A5C] ring-1 ring-[#0F2A5C]/20'
                    : 'border-[#E8EBF0]'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(it.id)}
                    onChange={() => toggleSelect(it.id)}
                    className="mt-1 rounded"
                  />
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
                    <div className="font-semibold text-[#0F2A5C] truncate text-sm">
                      {it.product.name}
                    </div>
                    <div className="text-[11px] text-[#8A8F98] truncate">
                      {it.size} / {it.color}
                    </div>
                    <div className="font-mono text-[10px] text-[#8A8F98] truncate">
                      {it.sku}
                    </div>
                  </div>
                  <StatusBadge status={it.status} />
                </div>

                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#F1F3F6]">
                  <Stat label="Avail" value={String(it.available)} />
                  <Stat
                    label="Held"
                    value={String(it.held)}
                    warn={it.held > 0}
                  />
                  <Stat label="Order" value={String(it.onOrder || 0)} />
                  <Stat
                    label="Sugg."
                    value={it.suggested > 0 ? String(it.suggested) : '—'}
                    highlight={it.suggested > 0}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sticky action bar (when items selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-30">
          <div className="rounded-lg bg-[#0F2A5C] text-white p-3 shadow-2xl flex items-center gap-3">
            <div className="flex-1 text-sm">
              <div className="font-bold">
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'}{' '}
                selected
              </div>
              <div className="text-[11px] opacity-80">
                {selectedItems.filter((it) => it.suggested > 0).length} need
                reorder
              </div>
            </div>
            <Link
              href={{
                pathname: '/admin/purchases/new',
                query: {
                  fromLowStock: '1',
                  variantIds: selectedItems.map((it) => it.id).join(','),
                },
              }}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white text-[#0F2A5C] hover:bg-white/90 transition min-h-[44px] flex items-center"
            >
              Create PO
            </Link>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// UI Components
// ============================================
function Stat({
  label,
  value,
  color,
  warn,
  highlight,
}: {
  label: string;
  value: string;
  color?: 'amber' | 'red' | 'blue' | 'gray' | 'navy';
  warn?: boolean;
  highlight?: boolean;
}) {
  const colors = {
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-700',
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    gray: 'from-gray-400 to-gray-600',
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
  };
  const c = color ? colors[color] : null;

  if (!c) {
    // mini stat (used inside mobile cards)
    return (
      <div className="text-center">
        <div className="text-[9px] uppercase tracking-wide text-[#8A8F98] font-medium">
          {label}
        </div>
        <div
          className={`text-sm font-bold ${
            highlight
              ? 'text-[#0F2A5C] bg-[#0F2A5C]/10 rounded px-1 inline-block'
              : warn
              ? 'text-amber-700'
              : 'text-[#0F2A5C]'
          }`}
        >
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0] relative">
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${c}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
            {label}
          </div>
          <div className="text-base sm:text-2xl font-bold text-[#0F2A5C] leading-tight">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'OUT') {
    return (
      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
        ● Out
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      ● Low
    </span>
  );
}