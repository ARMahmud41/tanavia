'use client';

import { useEffect, useState } from 'react';
import Barcode from 'react-barcode';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

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
}

interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  barcode: string;
  price: string | number;
  discount: number;
  productImages?: Array<{ url: string; isPrimary: boolean }>;
  variants: Variant[];
  category?:
    | string
    | { id: string; name: string; slug: string }
    | null;
}

// ============================================
// Page
// ============================================
export default function StaffBarcodesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      qs.set('limit', '100');
      if (search.trim()) qs.set('search', search.trim());

      const res = await api.get<Product[]>(
        `/api/products/staff?${qs.toString()}`,
        { token }
      );
      setProducts(res.data || []);
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
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function getCategoryName(cat: Product['category']): string {
    if (!cat) return 'Uncategorized';
    if (typeof cat === 'string') return cat;
    return cat.name;
  }

  function getImage(p: Product): string | null {
    if (!p.productImages || p.productImages.length === 0) return null;
    const primary =
      p.productImages.find((i) => i.isPrimary) || p.productImages[0];
    return primary.url;
  }

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
            <span className="text-white font-bold text-xl">🏷️</span>
          </div>
          <div>
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              Barcode Labels
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Generate and print labels for products
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div
        className="rounded-lg p-4 mb-5"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product by name or SKU..."
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
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: 'var(--staff-primary)' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Product List */}
      <div className="space-y-3">
        {loading ? (
          <div
            className="p-16 text-center text-sm rounded-lg"
            style={{
              background: 'var(--staff-card)',
              color: 'var(--staff-muted)',
            }}
          >
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div
            className="p-16 text-center rounded-lg"
            style={{ background: 'var(--staff-card)' }}
          >
            <div className="text-4xl mb-3">🏷️</div>
            <p style={{ color: 'var(--staff-text)' }}>No products found</p>
          </div>
        ) : (
          products.map((p) => {
            const img = getImage(p);
            const finalPrice = Math.round(
              Number(p.price) * (1 - p.discount / 100)
            );
            return (
              <div
                key={p.id}
                className="rounded-lg p-4 flex items-center gap-4"
                style={{
                  background: 'var(--staff-card)',
                  boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
                }}
              >
                <div
                  className="w-16 h-20 rounded-md overflow-hidden flex-shrink-0"
                  style={{ background: 'var(--staff-bg)' }}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      📷
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-base"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {p.name}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    {getCategoryName(p.category)} · {p.sku} ·{' '}
                    {p.variants.length} variants
                  </div>
                  <div
                    className="text-xs mt-1 flex items-center gap-2"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    <span>🏷️ {p.barcode}</span>
                    <span>· {tk(finalPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(p)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
                  style={{ background: 'var(--staff-primary)' }}
                >
                  🏷️ Generate
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Preview Modal */}
      {selected && (
        <BarcodePreviewModal
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Barcode Preview Modal
// ============================================
function BarcodePreviewModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  function handlePrint() {
    window.print();
  }

  const finalPrice = Math.round(
    Number(product.price) * (1 - product.discount / 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:block print:p-0 print:bg-white"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="rounded-lg w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:rounded-none print:shadow-none"
        style={{ background: 'var(--staff-card)' }}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between print:hidden"
          style={{ borderColor: 'var(--staff-border)' }}
        >
          <div>
            <h2
              className="font-serif text-lg font-semibold"
              style={{ color: 'var(--staff-text)' }}
            >
              Barcode Preview
            </h2>
            <p className="text-xs" style={{ color: 'var(--staff-muted)' }}>
              {product.name} — {product.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg hover:opacity-70"
            style={{ color: 'var(--staff-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div
          className="px-4 py-3 border-b flex flex-wrap items-center gap-4 print:hidden"
          style={{
            background: 'var(--staff-bg)',
            borderColor: 'var(--staff-border)',
          }}
        >
          <span
            className="text-xs"
            style={{ color: 'var(--staff-muted)' }}
          >
            Label Size: <strong>50 × 25 mm (Standard Retail)</strong>
          </span>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
            />
            Show product name
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
            />
            Show price
          </label>
        </div>

        {/* Labels grid */}
        <div
          className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible"
          id="barcode-print-area"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
            {product.variants.map((v) => {
              const variantBarcode =
                v.barcode || `${product.barcode}-${v.id.slice(-2)}`;

              return (
                <div
                  key={v.id}
                  className="border rounded p-2 bg-white flex flex-col items-center"
                  style={{
                    borderColor: '#E5E7EB',
                    pageBreakInside: 'avoid',
                    minHeight: '105px',
                  }}
                >
                  {/* Real Barcode */}
                  <Barcode
                    value={variantBarcode}
                    width={1.2}
                    height={35}
                    fontSize={9}
                    margin={0}
                    displayValue={true}
                    background="#FFFFFF"
                    lineColor="#000000"
                  />

                  {/* Size/Color */}
                  <div className="text-[10px] font-bold text-black mt-0.5">
                    {v.size} / {v.color}
                  </div>

                  {/* Product name */}
                  {showName && (
                    <div className="text-[8px] text-gray-700 truncate w-full text-center">
                      {product.name}
                    </div>
                  )}

                  {/* SKU */}
                  <div className="text-[7px] font-mono text-gray-500 truncate w-full text-center">
                    {v.sku || product.sku}
                  </div>

                  {/* Bottom row */}
                  <div className="w-full flex justify-between items-center mt-1 pt-1 border-t border-gray-200">
                    <div className="text-[8px] font-bold text-[#0F2A5C]">
                      TANAVIA
                    </div>
                    {showPrice && (
                      <div className="text-[10px] font-bold text-black">
                        {tk(finalPrice)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex justify-end gap-2 print:hidden"
          style={{ borderColor: 'var(--staff-border)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border transition"
            style={{
              background: 'var(--staff-card)',
              color: 'var(--staff-text)',
              borderColor: 'var(--staff-border)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2"
            style={{ background: 'var(--staff-primary)' }}
          >
            🖨️ Print {product.variants.length} Labels
          </button>
        </div>
      </div>

      {/* Print stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #barcode-print-area,
          #barcode-print-area * {
            visibility: visible;
          }
          #barcode-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
