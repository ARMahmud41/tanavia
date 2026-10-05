'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface InventoryItem {
  id: string;
  sku?: string | null;
  barcode?: string | null;
  size: string;
  color: string;
  onHand: number;
  held: number;
  available: number;
  reorderLevel: number;
  status: 'IN_STOCK' | 'LOW' | 'OUT';
  cost?: number;
  value?: number;
  product: {
    id: string;
    name: string;
    slug: string;
    category?: { id: string; name: string; slug: string } | null;
    image: string | null;
  };
}

interface Stats {
  totalSkus: number;
  lowCount: number;
  outCount: number;
  held: number;
  stockValue?: number;
  deadStockValue?: number;
}

interface Category {
  id: string;
  name: string;
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
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'LOW', label: 'Low' },
  { value: 'OUT', label: 'Out' },
];

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOW: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'In stock',
  LOW: 'Low',
  OUT: 'Out',
};

const ADJUST_REASONS = [
  { value: 'COUNT_CORRECTION', label: 'Count correction' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST_MISSING', label: 'Lost or missing' },
  { value: 'FOUND', label: 'Found' },
  { value: 'OTHER', label: 'Other' },
];

// ============================================
// Page
// ============================================
export default function AdminInventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusParam = (searchParams.get('status') as any) || 'ALL';
  const [status, setStatus] = useState(statusParam);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustChange, setAdjustChange] = useState(0);
  const [adjustReason, setAdjustReason] = useState('COUNT_CORRECTION');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Sync status to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ALL') params.delete('status');
    else params.set('status', status);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    setPage(1);
  }, [status]);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      qs.set('limit', '50');
      qs.set('page', String(page));
      if (status !== 'ALL') qs.set('status', status);
      if (search.trim()) qs.set('q', search.trim());
      if (categoryId) qs.set('categoryId', categoryId);
      qs.set('sort', 'urgency');

      const [listRes, statsRes] = await Promise.all([
        api.get<InventoryItem[]>(`/api/inventory?${qs.toString()}`, { token }),
        api.get<Stats>(`/api/inventory/stats`, { token }),
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
          : 'Failed to load inventory';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [status, search, categoryId, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Load categories
  useEffect(() => {
    async function loadCats() {
      try {
        const token = getToken() || undefined;
        const res = await api.get<Category[]>(`/api/categories`, { token });
        setCategories(res.data || []);
      } catch {
        // ignore
      }
    }
    loadCats();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  // Open detail
  async function openDetail(item: InventoryItem) {
    setDetailItem(item);
    setShowDetail(true);
  }

  // Open adjust
  function openAdjust(item: InventoryItem) {
    setAdjustItem(item);
    setAdjustChange(0);
    setAdjustReason('COUNT_CORRECTION');
    setAdjustNote('');
  }

  // Save adjustment
  async function handleAdjust() {
    if (!adjustItem) return;
    if (adjustChange === 0) {
      alert('Change cannot be zero');
      return;
    }
    if (adjustReason === 'OTHER' && !adjustNote.trim()) {
      alert('Note is required for Other');
      return;
    }

    setAdjusting(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/inventory/adjust`,
        {
          variantId: adjustItem.id,
          change: adjustChange,
          reason: adjustReason,
          note: adjustNote.trim() || undefined,
        },
        { token }
      );
      setAdjustItem(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Adjust failed');
    } finally {
      setAdjusting(false);
    }
  }

  // Export CSV
  function handleExport() {
    const rows = [
      [
        'Product',
        'SKU',
        'Size',
        'Color',
        'On hand',
        'Held',
        'Available',
        'Reorder',
        'Cost',
        'Value',
        'Status',
      ],
    ];

    for (const i of items) {
      rows.push([
        i.product.name,
        i.sku || '',
        i.size,
        i.color,
        String(i.onHand),
        String(i.held),
        String(i.available),
        String(i.reorderLevel),
        i.cost != null ? String(i.cost) : '',
        i.value != null ? String(i.value) : '',
        i.status,
      ]);
    }

    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tanavia-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/inventory-icon.png"
              alt="Inventory"
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
              Inventory
            </h1>
            <p className="text-[#8A8F98] text-sm">
              One stock for the shop and the website
            </p>
          </div>
        </div>
        <Link
          href="/admin/stock"
          className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2"
        >
          📋 Quick Stock view
        </Link>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon="📦"
            label="Total SKUs"
            value={String(stats.totalSkus)}
            tint="#0F2A5C"
          />
          <StatCard
            icon="💰"
            label="Stock value (cost)"
            value={tk(stats.stockValue || 0)}
            tint="#059669"
          />
          <StatCard
            icon="⚠"
            label="Low stock"
            value={String(stats.lowCount)}
            tint="#D97706"
          />
          <StatCard
            icon="🔴"
            label="Out of stock"
            value={String(stats.outCount)}
            tint="#DC2626"
          />
          <StatCard
            icon="🌙"
            label="Dead stock value"
            value={tk(stats.deadStockValue || 0)}
            tint="#7C3AED"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-t-lg border border-b-0 border-[#E8EBF0] px-4 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {[
            { key: 'stock', label: 'Stock', href: '/admin/inventory' },
            { key: 'low', label: 'Low stock', href: '/admin/inventory?status=LOW' },
            { key: 'purchases', label: 'Purchases', href: '/admin/purchases' },
            { key: 'count', label: 'Count', href: '/admin/inventory/count' },
            { key: 'valuation', label: 'Valuation', href: '/admin/inventory/valuation' },
            { key: 'movements', label: 'Movements', href: '/admin/stock/movements' },
          ].map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                t.key === 'stock'
                  ? 'text-[#0F2A5C] border-[#0F2A5C]'
                  : 'text-[#8A8F98] border-transparent hover:text-[#0F2A5C]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-b-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, variant, SKU or scan a barcode"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
                🔍
              </span>
            </div>
          </form>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExport}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2 items-center">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
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

        <div className="text-xs text-[#8A8F98] flex items-center gap-2 pt-1 border-t border-[#E8EBF0]">
          <span>ℹ️</span>
          <span>
            Available = on hand minus held. Low and Out are judged on Available,
            because that is what can be sold.
          </span>
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
            Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-[#5A6270] mb-2">No items found</p>
            <p className="text-sm text-[#8A8F98]">
              Try changing filters or search
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-center px-4 py-3 font-medium">On hand</th>
                  <th className="text-center px-4 py-3 font-medium">Held</th>
                  <th className="text-center px-4 py-3 font-medium">Available</th>
                  <th className="text-center px-4 py-3 font-medium">On order</th>
                  <th className="text-center px-4 py-3 font-medium">Reorder</th>
                  <th className="text-right px-4 py-3 font-medium">Cost</th>
                  <th className="text-right px-4 py-3 font-medium">Value</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const statusColor = STATUS_COLORS[it.status];
                  return (
                    <tr
                      key={it.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors cursor-pointer"
                      onClick={() => openDetail(it)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 bg-[#F1F3F6] rounded-md overflow-hidden flex-shrink-0">
                            {it.product.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.product.image}
                                alt={it.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-[10px]">
                                📷
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-ink line-clamp-1">
                              {it.product.name}
                            </div>
                            <div className="text-xs text-[#8A8F98]">
                              {it.size} · {it.color}
                              {it.product.category && ` · ${it.product.category.name}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#5A6270]">
                        {it.sku || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#0F2A5C]">
                        {it.onHand}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-600 font-medium">
                        {it.held}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        <span
                          className={
                            it.available === 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }
                        >
                          {it.available}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#8A8F98]">
                        —
                      </td>
                      <td className="px-4 py-3 text-center text-[#5A6270]">
                        {it.reorderLevel}
                      </td>
                      <td className="px-4 py-3 text-right text-[#8A8F98] text-xs font-mono">
                        {it.cost != null ? tk(it.cost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#0F2A5C] font-mono text-xs">
                        {it.value != null ? tk(it.value) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {STATUS_LABELS[it.status]}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openAdjust(it)}
                          className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          Adjust
                        </button>
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

      {/* Adjust modal */}
      {adjustItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !adjusting && setAdjustItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
              Adjust stock
            </h3>
            <p className="text-sm text-[#8A8F98] mb-1">
              {adjustItem.product.name} · {adjustItem.size} {adjustItem.color}
            </p>
            <p className="text-xs text-[#8A8F98] mb-4">
              On hand <strong>{adjustItem.onHand}</strong>, held{' '}
              <strong>{adjustItem.held}</strong>.
            </p>

            <div className="bg-[#F1F4F9] rounded-lg p-3 mb-4 text-xs text-[#5A6270]">
              🔒 Supplier deliveries go through Purchases, and customer returns
              through Returns, so they stay linked to their record.
            </div>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Change (use minus to remove)
            </label>
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAdjustChange((c) => c - 1)}
                className="w-10 h-10 rounded-lg bg-[#F1F3F6] hover:bg-[#E3E6EB] text-lg font-bold text-[#0F2A5C]"
              >
                −
              </button>
              <input
                type="number"
                value={adjustChange}
                onChange={(e) => setAdjustChange(Number(e.target.value))}
                className="flex-1 bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-center text-lg font-semibold focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
              />
              <button
                type="button"
                onClick={() => setAdjustChange((c) => c + 1)}
                className="w-10 h-10 rounded-lg bg-[#F1F3F6] hover:bg-[#E3E6EB] text-lg font-bold text-[#0F2A5C]"
              >
                +
              </button>
            </div>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Reason
            </label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            >
              {ADJUST_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Note {adjustReason === 'OTHER' && '(required)'}
            </label>
            <textarea
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              rows={2}
              placeholder="Optional details"
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />

            <div className="text-xs text-[#5A6270] mb-5">
              New on hand{' '}
              <strong>{adjustItem.onHand + adjustChange}</strong> · available{' '}
              <strong>
                {Math.max(
                  0,
                  adjustItem.onHand + adjustChange - adjustItem.held
                )}
              </strong>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAdjustItem(null)}
                disabled={adjusting}
                className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting || adjustChange === 0}
                className="flex-1 bg-[#0F2A5C] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition disabled:opacity-50"
              >
                {adjusting ? 'Saving...' : 'Save adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && detailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-1">
              {detailItem.product.name}
            </h3>
            <p className="text-sm text-[#8A8F98] mb-4">
              {detailItem.size} {detailItem.color} · {detailItem.sku}
            </p>

            <div className="text-3xl font-bold text-[#0F2A5C] mb-1">
              {detailItem.available}{' '}
              <span className="text-sm font-normal text-[#8A8F98]">
                available to sell
              </span>
            </div>

            <div className="h-2 bg-[#F1F3F6] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${
                    detailItem.onHand > 0
                      ? (detailItem.available / detailItem.onHand) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="flex justify-between text-xs text-[#8A8F98] mb-5">
              <span>Available {detailItem.available}</span>
              <span>Held {detailItem.held}</span>
              <span>On hand {detailItem.onHand}</span>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowDetail(false)}
                className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetail(false);
                  openAdjust(detailItem);
                }}
                className="flex-1 bg-[#0F2A5C] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition"
              >
                Adjust stock
              </button>
            </div>
          </div>
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
}: {
  icon: string;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E8EBF0] flex items-center gap-3 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
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
    </div>
  );
}