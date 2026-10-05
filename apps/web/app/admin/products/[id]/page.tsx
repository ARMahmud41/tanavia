'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Variant {
  id: string;
  sku?: string | null;
  barcode?: string | null;
  size: string;
  color: string;
  qty: number;
  reserved: number;
  reorderLevel: number;
}

interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
  isPrimary: boolean;
}

interface Movement {
  id: string;
  type: string;
  qty: number;
  before: number;
  after: number;
  reason?: string | null;
  createdAt: string;
  variant?: {
    id: string;
    size: string;
    color: string;
    sku?: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  nameBn?: string | null;
  description: string;
  descriptionBn?: string | null;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  brand: string;
  sku: string;
  barcode: string;
  cost: string | number;
  price: string | number;
  discount: number;
  status: string;
  active: boolean;
  featured: boolean;
  tryable: boolean;
  shape: string;
  productImages: ProductImage[];
  tags: string[];
  soldCount: number;
  lowStockAt: number;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
}

// ============================================
// Constants
// ============================================
const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE: 'Purchase',
  SALE_ONLINE: 'Online sale',
  SALE_OFFLINE: 'POS sale',
  RETURN: 'Return',
  RETURN_DAMAGE: 'Return (damaged)',
  DAMAGE: 'Damage',
  ADJUSTMENT: 'Adjustment',
  TRANSFER: 'Transfer',
  RESERVE: 'Reserved',
  RESERVE_RELEASE: 'Released',
};

const MOVEMENT_COLORS: Record<string, string> = {
  PURCHASE: 'text-emerald-700',
  SALE_ONLINE: 'text-red-700',
  SALE_OFFLINE: 'text-red-700',
  RETURN: 'text-emerald-700',
  RETURN_DAMAGE: 'text-gray-600',
  DAMAGE: 'text-red-700',
  ADJUSTMENT: 'text-blue-700',
  TRANSFER: 'text-blue-700',
  RESERVE: 'text-amber-700',
  RESERVE_RELEASE: 'text-gray-600',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
  ARCHIVED: 'bg-gray-100 text-gray-600 border-gray-300',
};

// ============================================
// Page
// ============================================
export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'overview' | 'variants' | 'movements'>('overview');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Modal states
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustVariant, setAdjustVariant] = useState<Variant | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('ADJUSTMENT');
  const [adjustNote, setAdjustNote] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const [prodRes, movRes, catRes] = await Promise.all([
        api.get<Product>(`/api/products/${productId}`, { token }),
        api
          .get<Movement[]>(`/api/products/${productId}/movements?limit=30`, { token })
          .catch(() => ({ data: [] })),
        api.get<Category[]>(`/api/categories`, { token }).catch(() => ({ data: [] })),
      ]);

      setProduct(prodRes.data || null);
      setMovements(movRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load product';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (productId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // ============================================
  // Actions
  // ============================================
  async function updateStatus(status: string) {
    if (!product) return;
    if (!confirm(`Change status to ${status}?`)) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/products/${product.id}`,
        { status, active: status === 'ACTIVE' },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // PERMANENT DELETE — Danger zone
  // ============================================
  async function handleDelete() {
    if (!product) return;

    if (deleteConfirmText !== product.name) {
      alert('Name did not match. Type the exact product name to confirm.');
      return;
    }

    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/products/${product.id}?hard=true`, { token });
      alert('✓ Product permanently deleted');
      router.push('/admin/products');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!product) return;
    if (!confirm(`Archive "${product.name}"? It will be hidden from the store.`)) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/products/${product.id}`, { token });
      router.push('/admin/products');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive failed');
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    if (!product) return;
    if (!confirm(`Duplicate "${product.name}"?`)) return;
    setBusy(true);
    try {
      const token = getToken() || undefined;
      const res = await api.post<{ id: string }>(
        `/api/products/${product.id}/duplicate`,
        {},
        { token }
      );
      if (res.data?.id) {
        router.push(`/admin/products/${res.data.id}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Duplicate failed');
      setBusy(false);
    }
  }

  async function handleAdjustStock() {
    if (!adjustVariant || !product) return;
    if (adjustQty === 0) {
      alert('Quantity change is required');
      return;
    }
    setBusy(true);
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/stock/adjust`,
        {
          variantId: adjustVariant.id,
          qtyChange: adjustQty,
          reason: adjustReason,
          note: adjustNote.trim() || undefined,
        },
        { token }
      );
      setShowAdjust(false);
      setAdjustVariant(null);
      setAdjustQty(0);
      setAdjustNote('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Adjust failed');
    } finally {
      setBusy(false);
    }
  }

  // ============================================
  // Loading / Error
  // ============================================
  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
            Product Not Found
          </h1>
          <p className="text-sm text-[#8A8F98] mb-4">
            {error || 'This product does not exist.'}
          </p>
          <Link
            href="/admin/products"
            className="inline-block bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // Derived
  // ============================================
  const totalStock = product.variants.reduce((s, v) => s + v.qty, 0);
  const reserved = product.variants.reduce((s, v) => s + v.reserved, 0);
  const available = totalStock - reserved;
  const finalPrice = Math.round(Number(product.price) * (1 - product.discount / 100));
  const margin = Math.round(
    Number(product.price) - Number(product.cost || 0)
  );
  const primaryImage =
    product.productImages.find((i) => i.isPrimary) || product.productImages[0];
  const statusColor =
    STATUS_COLORS[product.status] || 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Back */}
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to products
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C]">
              {product.name}
            </h1>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
            >
              {product.status}
            </span>
            {product.featured && (
              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                ⭐ Featured
              </span>
            )}
          </div>
          <p className="text-sm text-[#8A8F98]">
            <span className="font-mono">{product.sku}</span> ·{' '}
            {product.category?.name || 'Uncategorized'} · Barcode{' '}
            <span className="font-mono">{product.barcode}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            ✏️ Edit
          </Link>
          <button
            onClick={handleDuplicate}
            disabled={busy}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            📋 Duplicate
          </button>
          {product.status !== 'ACTIVE' && (
            <button
              onClick={() => updateStatus('ACTIVE')}
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              ✓ Activate
            </button>
          )}
          {product.status === 'ACTIVE' && (
            <button
              onClick={() => updateStatus('DRAFT')}
              disabled={busy}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              ○ Set Draft
            </button>
          )}
          <button
            onClick={handleArchive}
            disabled={busy}
            className="border border-amber-300 text-amber-700 hover:bg-amber-50 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            📦 Archive
          </button>
          <button
            onClick={() => {
              setDeleteConfirmText('');
              setShowDelete(true);
            }}
            disabled={busy}
            className="border border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            title="Permanently delete from database"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — images + info */}
        <div className="lg:col-span-1 space-y-5">
          {/* Image */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <div
              className="w-full aspect-square rounded-lg overflow-hidden mb-3 bg-[#F7F8FA]"
            >
              {primaryImage ? (
                <button
                  type="button"
                  onClick={() => setPreviewImage(primaryImage.url)}
                  className="w-full h-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryImage.url}
                    alt={primaryImage.alt || product.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  📷
                </div>
              )}
            </div>

            {product.productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.productImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setPreviewImage(img.url)}
                    className={`aspect-square rounded-md overflow-hidden border transition hover:opacity-80 ${
                      img.isPrimary ? 'border-[#0F2A5C]' : 'border-[#E8EBF0]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt || product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Pricing */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-3">
              Pricing
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Cost</span>
                <span className="font-mono text-[#5A6270]">{tk(product.cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Price</span>
                <span className="font-mono text-[#5A6270]">{tk(product.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8F98]">Discount</span>
                <span className="text-[#5A6270]">{product.discount}%</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-[#E8EBF0]">
                <span className="text-[#0F2A5C]">Selling</span>
                <span className="text-[#0F2A5C]">{tk(finalPrice)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8A8F98]">Margin</span>
                <span className="text-emerald-700 font-medium">{tk(margin)}</span>
              </div>
            </div>
          </section>

          {/* Stock summary */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-3">
              Stock
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#F7F8FA] rounded-lg p-3">
                <div className="text-xl font-bold text-[#0F2A5C]">{totalStock}</div>
                <div className="text-[10px] text-[#8A8F98] mt-0.5">On hand</div>
              </div>
              <div className="bg-[#F7F8FA] rounded-lg p-3">
                <div className="text-xl font-bold text-amber-600">{reserved}</div>
                <div className="text-[10px] text-[#8A8F98] mt-0.5">Held</div>
              </div>
              <div className="bg-[#F7F8FA] rounded-lg p-3">
                <div className="text-xl font-bold text-emerald-600">{available}</div>
                <div className="text-[10px] text-[#8A8F98] mt-0.5">Available</div>
              </div>
            </div>
          </section>
        </div>

        {/* Right — tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <div className="bg-white rounded-lg border border-[#E8EBF0] overflow-x-auto">
            <div className="flex min-w-max">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'variants', label: `Variants (${product.variants.length})` },
                { key: 'movements', label: `Stock history (${movements.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                    tab === t.key
                      ? 'text-[#0F2A5C] border-[#0F2A5C]'
                      : 'text-[#8A8F98] border-transparent hover:text-[#0F2A5C]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <>
              <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
                <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-3">
                  Description
                </h2>
                <p className="text-sm text-[#5A6270] whitespace-pre-wrap">
                  {product.description || 'No description.'}
                </p>
                {product.descriptionBn && (
                  <p className="text-sm text-[#8A8F98] whitespace-pre-wrap mt-3">
                    {product.descriptionBn}
                  </p>
                )}
              </section>

              <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
                <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-3">
                  Details
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Brand</span>
                    <span className="text-[#5A6270]">{product.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Shape</span>
                    <span className="text-[#5A6270] capitalize">{product.shape}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Tryable</span>
                    <span className="text-[#5A6270]">{product.tryable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Sold</span>
                    <span className="text-[#5A6270]">{product.soldCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Low stock at</span>
                    <span className="text-[#5A6270]">{product.lowStockAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8F98]">Created</span>
                    <span className="text-[#5A6270] text-xs">
                      {formatDateTime(product.createdAt)}
                    </span>
                  </div>
                </div>
              </section>

              {product.tags.length > 0 && (
                <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
                  <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-3">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-[#F1F3F6] text-[#5A6270]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Variants */}
          {tab === 'variants' && (
            <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">
                  All variants
                </h2>
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="text-xs text-[#0F2A5C] font-medium hover:underline"
                >
                  Edit variants →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase">
                      <th className="text-left px-3 py-2 font-medium">Size</th>
                      <th className="text-left px-3 py-2 font-medium">Color</th>
                      <th className="text-left px-3 py-2 font-medium">SKU</th>
                      <th className="text-right px-3 py-2 font-medium">Qty</th>
                      <th className="text-right px-3 py-2 font-medium">Reserved</th>
                      <th className="text-right px-3 py-2 font-medium">Available</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                      <th className="text-right px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => {
                      const avail = Math.max(0, v.qty - v.reserved);
                      const low = v.qty <= v.reorderLevel;
                      return (
                        <tr key={v.id} className="border-t border-[#E8EBF0]">
                          <td className="px-3 py-2 text-[#5A6270]">{v.size}</td>
                          <td className="px-3 py-2 text-[#5A6270]">{v.color}</td>
                          <td className="px-3 py-2 font-mono text-xs text-[#8A8F98]">
                            {v.sku || '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-[#0F2A5C]">
                            {v.qty}
                          </td>
                          <td className="px-3 py-2 text-right text-amber-600">
                            {v.reserved}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                            {avail}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {v.qty === 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-50 text-red-700 border-red-200">
                                Out
                              </span>
                            ) : low ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                                Low
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                In
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => {
                                setAdjustVariant(v);
                                setAdjustQty(0);
                                setAdjustReason('ADJUSTMENT');
                                setAdjustNote('');
                                setShowAdjust(true);
                              }}
                              className="text-xs text-[#0F2A5C] font-medium hover:underline"
                            >
                              Adjust stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Movements */}
          {tab === 'movements' && (
            <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Recent stock movements
              </h2>

              {movements.length === 0 ? (
                <p className="text-sm text-[#8A8F98]">No movements yet.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[#E8EBF0]"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#0F2A5C]">
                          {MOVEMENT_LABELS[m.type] || m.type}
                          {m.variant && (
                            <span className="text-xs ml-2 text-[#8A8F98]">
                              {m.variant.size}/{m.variant.color}
                            </span>
                          )}
                        </div>
                        {m.reason && (
                          <div className="text-xs mt-0.5 text-[#8A8F98]">
                            {m.reason}
                          </div>
                        )}
                        <div className="text-xs mt-0.5 text-[#8A8F98]">
                          {formatDateTime(m.createdAt)} · {m.before} → {m.after}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          MOVEMENT_COLORS[m.type] || 'text-gray-700'
                        }`}
                      >
                        {m.qty > 0 ? '+' : ''}
                        {m.qty}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Adjust stock modal */}
      {showAdjust && adjustVariant && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !busy && setShowAdjust(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
              Adjust stock
            </h3>
            <p className="text-sm text-[#8A8F98] mb-4">
              {adjustVariant.size}/{adjustVariant.color} · Currently{' '}
              <strong>{adjustVariant.qty} on hand</strong>
            </p>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Change (use minus to remove)
            </label>
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAdjustQty((q) => q - 1)}
                className="w-10 h-10 rounded-lg bg-[#F1F3F6] hover:bg-[#E3E6EB] text-lg font-bold text-[#0F2A5C]"
              >
                −
              </button>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="flex-1 bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-center text-lg font-semibold focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
              />
              <button
                type="button"
                onClick={() => setAdjustQty((q) => q + 1)}
                className="w-10 h-10 rounded-lg bg-[#F1F3F6] hover:bg-[#E3E6EB] text-lg font-bold text-[#0F2A5C]"
              >
                +
              </button>
            </div>

            <div className="text-xs text-[#8A8F98] text-center mb-4">
              New qty: <strong>{adjustVariant.qty + adjustQty}</strong> (available{' '}
              <strong>
                {Math.max(0, adjustVariant.qty + adjustQty - adjustVariant.reserved)}
              </strong>
              )
            </div>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Reason
            </label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            >
              <option value="PURCHASE">Purchase (new stock)</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="DAMAGE">Damage</option>
              <option value="RETURN">Return</option>
              <option value="TRANSFER">Transfer</option>
            </select>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Note (optional)
            </label>
            <input
              type="text"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Invoice #, reason details..."
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-5"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdjust(false)}
                disabled={busy}
                className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustStock}
                disabled={busy || adjustQty === 0}
                className="flex-1 bg-[#0F2A5C] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDelete && product && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !busy && setShowDelete(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🗑️</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-red-700">
                  Permanently delete?
                </h3>
                <p className="text-xs text-[#8A8F98] mt-0.5">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ You are about to permanently delete:
              </div>
              <div className="text-sm text-red-900 font-bold">
                "{product.name}"
              </div>
            </div>

            <div className="text-sm text-[#5A6270] mb-4 space-y-1">
              <div>• All variants will be deleted</div>
              <div>• All product images deleted</div>
              <div>• Stock movements logged for this product removed</div>
              <div className="text-red-700 font-semibold">
                • This cannot be undone!
              </div>
            </div>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Type the product name to confirm
            </label>
            <div className="text-xs font-mono text-[#0F2A5C] mb-2 bg-[#F1F3F6] px-2 py-1 rounded">
              {product.name}
            </div>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type exact name..."
              autoFocus
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:bg-white focus:border-red-400 mb-5"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowDelete(false)}
                disabled={busy}
                className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy || deleteConfirmText !== product.name}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Deleting...' : '🗑️ Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}