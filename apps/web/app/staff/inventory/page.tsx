'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

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
  product: {
    id: string;
    name: string;
    slug: string;
    category?: { id: string; name: string; slug: string } | null;
    image: string | null;
  };
}

interface VariantDetail extends InventoryItem {
  onOrder: number;
  heldOrders: Array<{ orderNumber: string; status: string; qty: number }>;
  movements: Array<{
    id: string;
    type: string;
    qty: number;
    before: number;
    after: number;
    reason?: string | null;
    createdAt: string;
  }>;
}

interface Stats {
  totalSkus: number;
  lowCount: number;
  outCount: number;
  held: number;
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

const REPORT_TYPES = [
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'DAMAGED_ITEM', label: 'Damaged item' },
  { value: 'COUNT_MISMATCH', label: 'Count mismatch' },
  { value: 'WRONG_BARCODE', label: 'Wrong barcode' },
];

// ============================================
// Page
// ============================================
export default function StaffInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Detail modal
  const [detail, setDetail] = useState<VariantDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Report modal
  const [reportItem, setReportItem] = useState<InventoryItem | null>(null);
  const [reportType, setReportType] = useState('LOW_STOCK');
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);

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
    try {
      const token = getToken() || undefined;
      const res = await api.get<VariantDetail>(
        `/api/inventory/${item.id}`,
        { token }
      );
      setDetail(res.data || null);
      setShowDetail(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load detail');
    }
  }

  // Open report modal
  function openReport(item: InventoryItem) {
    setReportItem(item);
    setReportType('LOW_STOCK');
    setReportNote('');
  }

  async function handleReport() {
    if (!reportItem) return;
    setReporting(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/inventory/report`,
        {
          variantId: reportItem.id,
          type: reportType,
          note: reportNote.trim() || undefined,
        },
        { token }
      );
      alert('✓ Report sent to admin');
      setReportItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send report');
    } finally {
      setReporting(false);
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--staff-primary)' }}
          >
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
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              Inventory
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              One stock for the shop and the website
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards (4 for staff) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="📦"
            label="Total SKUs"
            value={String(stats.totalSkus)}
            tint="var(--staff-primary)"
          />
          <StatCard
            icon="⚠"
            label="Low stock"
            value={String(stats.lowCount)}
            tint="var(--staff-warning)"
          />
          <StatCard
            icon="🔴"
            label="Out of stock"
            value={String(stats.outCount)}
            tint="var(--staff-danger)"
          />
          <StatCard
            icon="🔒"
            label="Held for online orders"
            value={`${stats.held} pcs`}
            tint="#7C3AED"
          />
        </div>
      )}

      {/* Tabs */}
      <div
        className="rounded-t-lg border border-b-0 px-4 overflow-x-auto"
        style={{
          background: 'var(--staff-card)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <div className="flex min-w-max gap-1">
          {[
            { key: 'stock', label: 'Stock' },
            { key: 'low', label: `Low stock (${stats?.lowCount || 0})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setStatus(t.key === 'stock' ? 'ALL' : 'LOW');
              }}
              className="px-4 py-3 text-sm font-medium border-b-2 transition"
              style={{
                color:
                  (t.key === 'stock' && status === 'ALL') ||
                  (t.key === 'low' && status === 'LOW')
                    ? 'var(--staff-primary)'
                    : 'var(--staff-muted)',
                borderColor:
                  (t.key === 'stock' && status === 'ALL') ||
                  (t.key === 'low' && status === 'LOW')
                    ? 'var(--staff-primary)'
                    : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-b-lg p-4 mb-5 flex flex-col gap-3"
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
                placeholder="Search product, variant, SKU or scan a barcode"
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
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{
              background: 'var(--staff-tile-bg, #F1F3F6)',
              color: 'var(--staff-text)',
              borderColor: 'transparent',
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2 items-center">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
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

        <div
          className="text-xs flex items-center gap-2 pt-1 border-t"
          style={{
            color: 'var(--staff-muted)',
            borderColor: 'var(--staff-border)',
          }}
        >
          <span>ℹ️</span>
          <span>
            You can view stock and report problems. Only an admin can change
            stock.
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
            Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="mb-2" style={{ color: 'var(--staff-text)' }}>
              No items found
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
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-center px-4 py-3 font-medium">On hand</th>
                  <th className="text-center px-4 py-3 font-medium">Held</th>
                  <th className="text-center px-4 py-3 font-medium">
                    Available
                  </th>
                  <th className="text-center px-4 py-3 font-medium">
                    Reorder
                  </th>
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
                      className="border-t transition-colors cursor-pointer hover:bg-[var(--staff-card-hover)]"
                      style={{ borderColor: 'var(--staff-border)' }}
                      onClick={() => openDetail(it)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-12 rounded-md overflow-hidden flex-shrink-0"
                            style={{ background: 'var(--staff-bg)' }}
                          >
                            {it.product.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.product.image}
                                alt={it.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px]">
                                📷
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-medium line-clamp-1"
                              style={{ color: 'var(--staff-text)' }}
                            >
                              {it.product.name}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {it.size} · {it.color}
                              {it.product.category &&
                                ` · ${it.product.category.name}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {it.sku || '—'}
                      </td>
                      <td
                        className="px-4 py-3 text-center font-semibold"
                        style={{ color: 'var(--staff-text)' }}
                      >
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
                      <td
                        className="px-4 py-3 text-center"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {it.reorderLevel}
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
                          onClick={() => openReport(it)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
                          style={{
                            background: 'var(--staff-card)',
                            color: 'var(--staff-primary)',
                            borderColor: 'var(--staff-border)',
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

      {/* Detail modal */}
      {showDetail && detail && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-auto"
            style={{ background: 'var(--staff-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-serif text-xl font-semibold mb-1"
              style={{ color: 'var(--staff-text)' }}
            >
              {detail.product.name}
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--staff-muted)' }}
            >
              {detail.size} {detail.color} · {detail.sku}
            </p>

            <div
              className="text-3xl font-bold mb-1"
              style={{ color: 'var(--staff-text)' }}
            >
              {detail.available}{' '}
              <span
                className="text-sm font-normal"
                style={{ color: 'var(--staff-muted)' }}
              >
                available to sell
              </span>
            </div>

            <div
              className="h-2 rounded-full overflow-hidden mb-3"
              style={{ background: 'var(--staff-bg)' }}
            >
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${
                    detail.onHand > 0
                      ? (detail.available / detail.onHand) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div
              className="flex justify-between text-xs mb-4"
              style={{ color: 'var(--staff-muted)' }}
            >
              <span>Available {detail.available}</span>
              <span>Held {detail.held}</span>
              <span>On hand {detail.onHand}</span>
            </div>

            {detail.onOrder > 0 && (
              <div
                className="rounded-lg p-3 mb-4 text-xs"
                style={{ background: 'var(--staff-bg)' }}
              >
                📦 {detail.onOrder} pcs on order from a supplier
              </div>
            )}

            {detail.heldOrders.length > 0 && (
              <div className="mb-4">
                <div
                  className="text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  Why it is held
                </div>
                <div className="space-y-1">
                  {detail.heldOrders.map((h, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      <span className="font-mono">{h.orderNumber}</span>
                      <span>{h.qty} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.movements.length > 0 && (
              <div className="mb-4">
                <div
                  className="text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  Recent movements
                </div>
                <div className="space-y-1">
                  {detail.movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between text-xs"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      <span>{m.reason || m.type}</span>
                      <span
                        className={
                          m.qty > 0 ? 'text-emerald-600' : 'text-red-600'
                        }
                      >
                        {m.qty > 0 ? '+' : ''}
                        {m.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowDetail(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border transition"
                style={{
                  background: 'var(--staff-card)',
                  color: 'var(--staff-text)',
                  borderColor: 'var(--staff-border)',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetail(false);
                  openReport(detail);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--staff-primary)' }}
              >
                🚩 Report a problem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !reporting && setReportItem(null)}
        >
          <div
            className="rounded-lg max-w-md w-full p-6"
            style={{ background: 'var(--staff-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-serif text-xl font-semibold mb-1"
              style={{ color: 'var(--staff-text)' }}
            >
              Report a problem
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--staff-muted)' }}
            >
              {reportItem.product.name} · {reportItem.size} {reportItem.color}.
              An admin will see this and act on it.
            </p>

            <label
              className="block text-xs uppercase tracking-wide mb-1 font-medium"
              style={{ color: 'var(--staff-muted)' }}
            >
              What is wrong?
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none mb-3"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label
              className="block text-xs uppercase tracking-wide mb-1 font-medium"
              style={{ color: 'var(--staff-muted)' }}
            >
              Note (optional)
            </label>
            <textarea
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              rows={3}
              placeholder="Optional details"
              className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none mb-5"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setReportItem(null)}
                disabled={reporting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border transition disabled:opacity-50"
                style={{
                  background: 'var(--staff-card)',
                  color: 'var(--staff-text)',
                  borderColor: 'var(--staff-border)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={reporting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--staff-primary)' }}
              >
                {reporting ? 'Sending...' : 'Send report'}
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
    <div
      className="rounded-lg p-4 border flex items-center gap-3"
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
    </div>
  );
}