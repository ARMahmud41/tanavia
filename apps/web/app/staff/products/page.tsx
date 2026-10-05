'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface ProductVariant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
  reorderLevel: number;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  sku: string;
  barcode: string;
  price: string | number;
  discount: number;
  status: string;
  active: boolean;
  featured: boolean;
  soldCount: number;
  lowStockAt: number;
  productImages: Array<{
    id: string;
    url: string;
    alt: string | null;
    position: number;
    isPrimary: boolean;
  }>;
  variants: ProductVariant[];
}

interface Stats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  lowOrOut: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// Helpers
// ============================================
function getTotalStock(variants: ProductVariant[]): number {
  return variants.reduce((sum, v) => sum + v.qty, 0);
}

function getAvailableStock(variants: ProductVariant[]): number {
  return variants.reduce((sum, v) => sum + Math.max(0, v.qty - v.reserved), 0);
}

function isLowStock(product: Product): boolean {
  return product.variants.some((v) => v.qty <= v.reorderLevel);
}

function isOutOfStock(product: Product): boolean {
  return getTotalStock(product.variants) === 0;
}

function getStatusColor(status: string): string {
  if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'DRAFT') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'ARCHIVED') return 'bg-gray-100 text-gray-600 border-gray-300';
  return 'bg-gray-100 text-gray-700 border-gray-300';
}

function getStockBadge(product: Product): {
  label: string;
  color: string;
} {
  if (isOutOfStock(product)) {
    return { label: 'Out', color: 'bg-red-50 text-red-700 border-red-200' };
  }
  if (isLowStock(product)) {
    return { label: 'Low', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'In stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

// ============================================
// Constants
// ============================================
const STOCK_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'LOW', label: 'Low' },
];

// ============================================
// Page
// ============================================
export default function StaffProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusParam = searchParams.get('status') || 'ALL';
  const [statusFilter, setStatusFilter] = useState(statusParam);

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  // Sync status to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusFilter === 'ALL') params.delete('status');
    else params.set('status', statusFilter);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    setPage(1);
  }, [statusFilter]);

  // Load products
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      qs.set('limit', '25');
      qs.set('page', String(page));
      qs.set('sort', sort);
      if (search.trim()) qs.set('search', search.trim());
      if (category) qs.set('category', category);
      if (statusFilter !== 'ALL' && statusFilter !== 'LOW') {
        qs.set('status', statusFilter);
      }

      const [listRes, statsRes] = await Promise.all([
        api.get<Product[]>(`/api/products/staff?${qs.toString()}`, { token }),
        api.get<Stats>(`/api/products/stats`, { token }),
      ]);

      let items = listRes.data || [];

      // Client-side filter for LOW status (since backend doesn't have this filter yet)
      if (statusFilter === 'LOW') {
        items = items.filter((p) => isLowStock(p));
      }

      setProducts(items);
      setPagination(listRes.pagination || null);
      setStats(statsRes.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load products';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, category, statusFilter, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const token = getToken() || undefined;
        const res = await api.get<Array<{ id: string; name: string; slug: string }>>(
          '/api/products/categories',
          { token }
        ).catch(() => ({ data: [] }));
        setCategories(res.data || []);
      } catch {
        // Silently ignore
      }
    }
    loadCategories();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
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
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--staff-primary)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/products-icon.png"
              alt="Products"
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
              Products
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Read-only view. Cost, margin and edits are hidden.
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="📦"
            label="Total"
            value={String(stats.total)}
            tint="var(--staff-primary)"
            onClick={() => setStatusFilter('ALL')}
          />
          <StatCard
            icon="✅"
            label="Active"
            value={String(stats.active)}
            tint="var(--staff-success)"
            onClick={() => setStatusFilter('ACTIVE')}
          />
          <StatCard
            icon="📝"
            label="Draft"
            value={String(stats.draft)}
            tint="#7C3AED"
            onClick={() => setStatusFilter('DRAFT')}
          />
          <StatCard
            icon="⚠"
            label="Low / out of stock"
            value={String(stats.lowOrOut)}
            tint="var(--staff-warning)"
            onClick={() => setStatusFilter('LOW')}
          />
        </div>
      )}

      {/* Filters */}
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
                placeholder="Search name, SKU, barcode"
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
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
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
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{
              background: 'var(--staff-tile-bg, #F1F3F6)',
              color: 'var(--staff-text)',
              borderColor: 'transparent',
            }}
          >
            <option value="new">Newest</option>
            <option value="lh">Price: Low to High</option>
            <option value="hl">Price: High to Low</option>
            <option value="disc">Best discount</option>
          </select>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {STOCK_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                statusFilter === s.value ? 'text-white shadow' : ''
              }`}
              style={
                statusFilter === s.value
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
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="mb-2" style={{ color: 'var(--staff-text)' }}>
              No products found
            </p>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Try changing filters or search
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
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Sold</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = getTotalStock(p.variants);
                  const available = getAvailableStock(p.variants);
                  const stockBadge = getStockBadge(p);
                  const statusColor = getStatusColor(p.status);
                  const primaryImage =
                    p.productImages.find((i) => i.isPrimary) ||
                    p.productImages[0];
                  const finalPrice = Math.round(
                    Number(p.price) * (1 - p.discount / 100)
                  );

                  return (
                    <tr
                      key={p.id}
                      className="border-t transition-colors hover:bg-[var(--staff-card-hover)]"
                      style={{ borderColor: 'var(--staff-border)' }}
                    >
                      {/* Product (image + name + SKU) */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/staff/products/${p.id}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <div
                            className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0"
                            style={{ background: 'var(--staff-bg)' }}
                          >
                            {primaryImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={primaryImage.url}
                                alt={primaryImage.alt || p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                📷
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-medium truncate"
                              style={{ color: 'var(--staff-text)' }}
                            >
                              {p.name}
                            </div>
                            <div
                              className="text-xs font-mono truncate"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {p.sku}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Category */}
                      <td
                        className="px-4 py-3"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {p.category?.name || '—'}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        <div
                          className="font-semibold"
                          style={{ color: 'var(--staff-text)' }}
                        >
                          {tk(finalPrice)}
                        </div>
                        {p.discount > 0 && (
                          <div
                            className="text-xs line-through"
                            style={{ color: 'var(--staff-muted)' }}
                          >
                            {tk(p.price)}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stockBadge.color}`}
                          >
                            {stockBadge.label}
                          </span>
                          <span
                            className="text-xs font-semibold"
                            style={{ color: 'var(--staff-text)' }}
                          >
                            {stock}
                          </span>
                          {available < stock && (
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--staff-warning)' }}
                              title={`${stock - available} reserved for online orders`}
                            >
                              ({available} avail)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Sold */}
                      <td
                        className="px-4 py-3 text-center"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {p.soldCount}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/staff/products/${p.id}`}
                          className="text-xs font-medium hover:underline"
                          style={{ color: 'var(--staff-primary)' }}
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