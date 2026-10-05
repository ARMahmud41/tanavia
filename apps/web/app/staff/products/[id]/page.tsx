'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
    nameBn?: string | null;
    slug: string;
  } | null;
  brand: string;
  sku: string;
  barcode: string;
  price: string | number;
  discount: number;
  status: string;
  active: boolean;
  featured: boolean;
  tryable: boolean;
  shape: string;
  productImages: ProductImage[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  lowStockAt: number;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
}

// ============================================
// Helpers
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
  RESERVE: 'Reserved for online',
  RESERVE_RELEASE: 'Reservation released',
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

function getTotalStock(variants: Variant[]): number {
  return variants.reduce((sum, v) => sum + v.qty, 0);
}

function getReservedStock(variants: Variant[]): number {
  return variants.reduce((sum, v) => sum + v.reserved, 0);
}

function isVariantLow(v: Variant): boolean {
  return v.qty <= v.reorderLevel;
}

// ============================================
// Page
// ============================================
export default function StaffProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'variants' | 'movements'>(
    'overview'
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const [prodRes, movRes] = await Promise.all([
        api.get<Product>(`/api/products/${productId}`, { token }),
        api.get<Movement[]>(`/api/products/${productId}/movements?limit=30`, {
          token,
        }).catch(() => ({ data: [] })),
      ]);

      setProduct(prodRes.data || null);
      setMovements(movRes.data || []);
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
  // Loading / Error
  // ============================================
  if (loading) {
    return (
      <div className="p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
        <div className="text-center py-16" style={{ color: 'var(--staff-muted)' }}>
          Loading product...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
        <div
          className="max-w-md mx-auto rounded-lg p-8 text-center"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">⚠️</div>
          <h1
            className="font-serif text-xl font-semibold mb-2"
            style={{ color: 'var(--staff-text)' }}
          >
            Product Not Found
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--staff-muted)' }}>
            {error || 'This product does not exist.'}
          </p>
          <Link
            href="/staff/products"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--staff-primary)' }}
          >
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const totalStock = getTotalStock(product.variants);
  const reserved = getReservedStock(product.variants);
  const available = totalStock - reserved;
  const finalPrice = Math.round(
    Number(product.price) * (1 - product.discount / 100)
  );
  const primaryImage =
    product.productImages.find((i) => i.isPrimary) || product.productImages[0];

  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Back */}
      <Link
        href="/staff/products"
        className="inline-flex items-center gap-1 text-sm mb-5 hover:underline"
        style={{ color: 'var(--staff-muted)' }}
      >
        ← Back to products
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold"
              style={{ color: 'var(--staff-text)' }}
            >
              {product.name}
            </h1>
            <span
              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                product.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : product.status === 'DRAFT'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-100 text-gray-600 border-gray-300'
              }`}
            >
              {product.status}
            </span>
            {product.featured && (
              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                ⭐ Featured
              </span>
            )}
          </div>
          <p
            className="text-sm font-mono"
            style={{ color: 'var(--staff-muted)' }}
          >
            {product.sku} · {product.category?.name || 'Uncategorized'}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Image + info */}
        <div className="lg:col-span-1 space-y-5">
          {/* Main image */}
          <section
            className="rounded-lg p-5"
            style={{
              background: 'var(--staff-card)',
              boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
            }}
          >
            <div className="w-full aspect-square rounded-lg overflow-hidden mb-3" style={{ background: 'var(--staff-bg)' }}>
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

            {/* Thumbnails */}
            {product.productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.productImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setPreviewImage(img.url)}
                    className="aspect-square rounded-md overflow-hidden border transition hover:opacity-80"
                    style={{
                      borderColor: img.isPrimary
                        ? 'var(--staff-primary)'
                        : 'var(--staff-border)',
                    }}
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
          <section
            className="rounded-lg p-5"
            style={{
              background: 'var(--staff-card)',
              boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
            }}
          >
            <h2
              className="font-serif text-lg font-semibold mb-3"
              style={{ color: 'var(--staff-text)' }}
            >
              Pricing
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-baseline">
                <span style={{ color: 'var(--staff-muted)' }}>Selling price</span>
                <div className="text-right">
                  <div
                    className="text-xl font-bold"
                    style={{ color: 'var(--staff-primary)' }}
                  >
                    {tk(finalPrice)}
                  </div>
                  {product.discount > 0 && (
                    <div
                      className="text-xs line-through"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {tk(product.price)} ({product.discount}% off)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Attributes */}
          <section
            className="rounded-lg p-5"
            style={{
              background: 'var(--staff-card)',
              boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
            }}
          >
            <h2
              className="font-serif text-lg font-semibold mb-3"
              style={{ color: 'var(--staff-text)' }}
            >
              Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Barcode</span>
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--staff-text)' }}
                >
                  {product.barcode}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Brand</span>
                <span style={{ color: 'var(--staff-text)' }}>
                  {product.brand}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Shape</span>
                <span
                  className="capitalize"
                  style={{ color: 'var(--staff-text)' }}
                >
                  {product.shape}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Tryable</span>
                <span style={{ color: 'var(--staff-text)' }}>
                  {product.tryable ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Sold</span>
                <span style={{ color: 'var(--staff-text)' }}>
                  {product.soldCount}
                </span>
              </div>
            </div>
          </section>

          {/* Tags */}
          {product.tags.length > 0 && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-3"
                style={{ color: 'var(--staff-text)' }}
              >
                Tags
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    style={{
                      background: 'var(--staff-tile-bg)',
                      color: 'var(--staff-muted)',
                      borderColor: 'var(--staff-border)',
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right — Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stock summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="rounded-lg p-4 border"
              style={{
                background: 'var(--staff-card)',
                borderColor: 'var(--staff-border)',
              }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--staff-muted)' }}>
                On hand
              </div>
              <div
                className="text-2xl font-bold"
                style={{ color: 'var(--staff-text)' }}
              >
                {totalStock}
              </div>
            </div>
            <div
              className="rounded-lg p-4 border"
              style={{
                background: 'var(--staff-card)',
                borderColor: 'var(--staff-border)',
              }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--staff-muted)' }}>
                Held online
              </div>
              <div
                className="text-2xl font-bold"
                style={{ color: 'var(--staff-warning)' }}
              >
                {reserved}
              </div>
            </div>
            <div
              className="rounded-lg p-4 border"
              style={{
                background: 'var(--staff-card)',
                borderColor: 'var(--staff-border)',
              }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--staff-muted)' }}>
                Available
              </div>
              <div
                className="text-2xl font-bold"
                style={{ color: 'var(--staff-success)' }}
              >
                {available}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="rounded-lg border overflow-x-auto"
            style={{
              background: 'var(--staff-card)',
              borderColor: 'var(--staff-border)',
            }}
          >
            <div className="flex min-w-max">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'variants', label: `Variants (${product.variants.length})` },
                { key: 'movements', label: `Stock history (${movements.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className="px-4 py-3 text-sm font-medium transition border-b-2"
                  style={{
                    color:
                      tab === t.key ? 'var(--staff-primary)' : 'var(--staff-muted)',
                    borderColor:
                      tab === t.key ? 'var(--staff-primary)' : 'transparent',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Overview */}
          {tab === 'overview' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-3"
                style={{ color: 'var(--staff-text)' }}
              >
                Description
              </h2>
              <p
                className="text-sm whitespace-pre-wrap"
                style={{ color: 'var(--staff-text)' }}
              >
                {product.description || 'No description.'}
              </p>
              {product.descriptionBn && (
                <p
                  className="text-sm whitespace-pre-wrap mt-3"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  {product.descriptionBn}
                </p>
              )}
            </section>
          )}

          {/* Tab: Variants */}
          {tab === 'variants' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                All variants
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-xs uppercase"
                      style={{
                        background: 'var(--staff-tile-bg, #F1F4F9)',
                        color: 'var(--staff-muted)',
                      }}
                    >
                      <th className="text-left px-3 py-2 font-medium">Size</th>
                      <th className="text-left px-3 py-2 font-medium">Color</th>
                      <th className="text-left px-3 py-2 font-medium">SKU</th>
                      <th className="text-right px-3 py-2 font-medium">On hand</th>
                      <th className="text-right px-3 py-2 font-medium">Held</th>
                      <th className="text-right px-3 py-2 font-medium">Available</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => {
                      const avail = Math.max(0, v.qty - v.reserved);
                      const low = isVariantLow(v);
                      return (
                        <tr
                          key={v.id}
                          className="border-t"
                          style={{ borderColor: 'var(--staff-border)' }}
                        >
                          <td
                            className="px-3 py-2"
                            style={{ color: 'var(--staff-text)' }}
                          >
                            {v.size}
                          </td>
                          <td
                            className="px-3 py-2"
                            style={{ color: 'var(--staff-text)' }}
                          >
                            {v.color}
                          </td>
                          <td
                            className="px-3 py-2 font-mono text-xs"
                            style={{ color: 'var(--staff-muted)' }}
                          >
                            {v.sku || '—'}
                          </td>
                          <td
                            className="px-3 py-2 text-right font-semibold"
                            style={{ color: 'var(--staff-text)' }}
                          >
                            {v.qty}
                          </td>
                          <td
                            className="px-3 py-2 text-right"
                            style={{ color: 'var(--staff-warning)' }}
                          >
                            {v.reserved}
                          </td>
                          <td
                            className="px-3 py-2 text-right font-semibold"
                            style={{ color: 'var(--staff-success)' }}
                          >
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tab: Movements */}
          {tab === 'movements' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                Recent stock movements
              </h2>

              {movements.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
                  No stock movements yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                      style={{ borderColor: 'var(--staff-border)' }}
                    >
                      <div className="flex-1">
                        <div
                          className="text-sm font-medium"
                          style={{ color: 'var(--staff-text)' }}
                        >
                          {MOVEMENT_LABELS[m.type] || m.type}
                          {m.variant && (
                            <span
                              className="text-xs ml-2"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {m.variant.size}/{m.variant.color}
                            </span>
                          )}
                        </div>
                        {m.reason && (
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--staff-muted)' }}
                          >
                            {m.reason}
                          </div>
                        )}
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: 'var(--staff-muted)' }}
                        >
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