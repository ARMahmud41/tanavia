'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string | null;
  price: string | number;
  discount: number;
  images: string[];
  active: boolean;
  featured: boolean;
  soldCount: number;
  variants: { qty: number; reserved: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIES = ['All', 'Men', 'Women', 'Kids', 'Accessories'];

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
      if (search.trim()) qs.set('q', search.trim());

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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/products/${id}`, { token });
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function stockOf(p: Product): number {
    return p.variants.reduce((s, v) => s + (v.qty - v.reserved), 0);
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Products
          </h1>
          <p className="text-[#8A8F98] text-sm">
            {pagination?.total ?? 0} products in your catalog
          </p>
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
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = stockOf(p);
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 bg-[#F1F3F6] rounded-md overflow-hidden flex-shrink-0">
                            {p.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-[10px]">
                                📷
                              </div>
                            )}
                          </div>
                          <div>
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
                      <td className="px-4 py-3 font-mono text-xs text-[#5A6270]">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3 text-[#5A6270]">
                        {p.category || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#0F2A5C]">
                        {tk(p.price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            stock === 0
                              ? 'text-[#C81E1E]'
                              : stock <= 5
                              ? 'text-[#B45309]'
                              : 'text-[#5A6270]'
                          }`}
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.active
                              ? 'bg-[#E7F7EE] text-[#0B7A47]'
                              : 'bg-[#EEF1F5] text-[#4B5563]'
                          }`}
                        >
                          {p.active ? '● Active' : '○ Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="text-[#0F2A5C] hover:underline text-xs font-medium mr-3"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-[#C81E1E] hover:underline text-xs font-medium"
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