'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
  isPrimary: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  categoryId?: string | null;
  category?:
    | string
    | { id: string; name: string; nameBn?: string | null; slug: string }
    | null;
  price: string | number;
  cost?: string | number;
  discount: number;
  status: string;
  active: boolean;
  featured: boolean;
  soldCount: number;
  productImages?: ProductImage[];
  images?: string[];
  variants: { qty: number; reserved: number; reorderLevel?: number }[];
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
const CATEGORIES = ['All', 'Men', 'Women', 'Kids', 'Accessories'];

function getCategoryName(category: Product['category']): string {
  if (!category) return '—';
  if (typeof category === 'string') return category;
  return category.name || '—';
}

function getPrimaryImage(p: Product): string | null {
  if (p.productImages && p.productImages.length > 0) {
    const primary =
      p.productImages.find((i) => i.isPrimary) || p.productImages[0];
    return primary.url;
  }
  if (p.images && p.images.length > 0) return p.images[0];
  return null;
}

function getStatusColor(status: string): string {
  if (status === 'ACTIVE')
    return 'bg-[#E7F7EE] text-[#0B7A47] border-[#A8E5C2]';
  if (status === 'DRAFT')
    return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'ARCHIVED')
    return 'bg-gray-100 text-gray-600 border-gray-300';
  return 'bg-gray-100 text-gray-700 border-gray-300';
}

// ============================================
// Page
// ============================================
export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '20');
      qs.set('page', String(page));
      if (category !== 'All') qs.set('category', category.toLowerCase());
      if (search.trim()) qs.set('search', search.trim());

      const token = getToken() || undefined;
      const res = await api.get<Product[]>(
        `/api/products/admin?${qs.toString()}`,
        { token }
      );
      setProducts(res.data || []);
      setPagination(res.pagination || null);
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
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleArchive(id: string, name: string) {
    if (!confirm(`Archive "${name}"?\n\nThis hides it from the store. You can re-activate later.`)) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/products/${id}`, { token });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive failed');
    }
  }

  async function handleHardDelete(id: string, name: string) {
    const input = prompt(
      `⚠️ PERMANENT DELETE\n\nThis will remove "${name}" from the database FOREVER.\n\n• Cannot be undone!\n\nType "${name}" to confirm:`
    );

    if (input !== name) {
      if (input !== null) alert('Name did not match. Deletion cancelled.');
      return;
    }

    try {
      const token = getToken() || undefined;
      await api.delete(`/api/products/${id}?hard=true`, { token });
      setProducts((p) => p.filter((x) => x.id !== id));
      alert('✓ Product permanently deleted');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function stockOf(p: Product): number {
    return p.variants.reduce((s, v) => s + (v.qty - v.reserved), 0);
  }

  function isLowStock(p: Product): boolean {
    return p.variants.some(
      (v) => v.qty <= (v.reorderLevel ?? 5) || v.qty === 0
    );
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
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
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
              Products
            </h1>
            <p className="text-[#8A8F98] text-sm">
              {pagination?.total ?? 0} products in your catalog
            </p>
          </div>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2 shadow-[0_2px_8px_rgba(15,42,92,0.15)]"
        >
          <span className="text-base">+</span>
          Add Product
        </Link>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                category === c
                  ? 'bg-[#0F2A5C] text-white shadow-[0_2px_6px_rgba(15,42,92,0.2)]'
                  : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 text-sm w-full md:w-64 focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          />
          <button
            type="submit"
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3.5 py-2 rounded-lg text-sm font-medium transition"
          >
            🔍
          </button>
        </form>
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
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-[#5A6270] mb-4">No products found</p>
            <Link
              href="/admin/products/new"
              className="text-[#0F2A5C] font-medium text-sm hover:underline"
            >
              + Add your first product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Cost</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Sold</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = stockOf(p);
                  const low = isLowStock(p);
                  const imgUrl = getPrimaryImage(p);
                  const statusColor = getStatusColor(p.status);
                  const finalPrice = Math.round(
                    Number(p.price) * (1 - p.discount / 100)
                  );

                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                    >
                      {/* Product (image + name + discount) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 bg-[#F1F3F6] rounded-md overflow-hidden flex-shrink-0">
                            {imgUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imgUrl}
                                alt={p.name}
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
                              {p.name}
                            </div>
                            {p.discount > 0 && (
                              <div className="text-xs text-[#0F2A5C] font-medium">
                                -{p.discount}% off
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3 font-mono text-xs text-[#5A6270]">
                        {p.sku}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-[#5A6270]">
                        {getCategoryName(p.category)}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-[#0F2A5C]">
                          {tk(finalPrice)}
                        </div>
                        {p.discount > 0 && (
                          <div className="text-[10px] text-[#8A8F98] line-through">
                            {tk(p.price)}
                          </div>
                        )}
                      </td>

                      {/* Cost (admin only) */}
                      <td className="px-4 py-3 text-right text-xs text-[#8A8F98]">
                        {p.cost ? tk(p.cost) : '—'}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            stock === 0
                              ? 'text-[#C81E1E]'
                              : low
                              ? 'text-[#B45309]'
                              : 'text-[#5A6270]'
                          }`}
                        >
                          {stock}
                        </span>
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
                      <td className="px-4 py-3 text-center text-xs text-[#8A8F98]">
                        {p.soldCount}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="text-[#0F2A5C] hover:underline text-xs font-medium mr-3"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleArchive(p.id, p.name)}
                          className="text-amber-700 hover:underline text-xs font-medium mr-3"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => handleHardDelete(p.id, p.name)}
                          className="text-[#C81E1E] hover:underline text-xs font-medium"
                          title="Permanently delete"
                        >
                          Delete
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
              className="px-4 py-2 bg-white border border-[#E8EBF0] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F4F9] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-[#E8EBF0] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F4F9] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}