'use client';

import { useEffect, useMemo, useState } from 'react';
import Barcode from 'react-barcode';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Variant {
  id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string | null;
  images: string[];
  price: number | string;
  discount: number;
  variants: Variant[];
}

export default function AdminBarcodesPage() {
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
      const res = await api.get<Product[]>('/api/products/admin?limit=100', {
        token,
      });
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
  }, []);

  // Filter products by search
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
          Barcode Generator
        </h1>
        <p className="text-[#8A8F98] text-sm">
          Generate and print barcode labels for products
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8F98]">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product by name or SKU..."
            className="w-full bg-[#F1F3F6] border border-transparent rounded-lg pl-11 pr-3.5 py-3 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          />
        </div>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-16 text-center text-[#8A8F98] text-sm">
          Loading products...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-16 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-[#5A6270] mb-2">No products found</p>
          <p className="text-sm text-[#8A8F98]">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden">
          <div className="divide-y divide-[#E8EBF0]">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 p-4 hover:bg-[#FAFBFC] transition-colors"
              >
                {/* Image */}
                <div className="w-14 h-16 bg-[#F1F3F6] rounded-md overflow-hidden flex-shrink-0">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-xs">
                      📷
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink">{p.name}</div>
                  <div className="text-xs text-[#8A8F98] mt-0.5">
                    {p.category || '—'} · {p.sku} · {p.variants.length} variants
                  </div>
                  {p.barcode && (
                    <div className="text-xs font-mono text-[#0F2A5C] mt-1">
                      📊 {p.barcode}
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <button
                  onClick={() => setSelected(p)}
                  className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex-shrink-0"
                >
                  🏷️ Generate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barcode Preview Modal */}
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
// Fixed: Product Label Size (Standard Retail)
// ============================================
const PRODUCT_LABEL_SIZE = 'product' as const;

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
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col print:max-h-none print:max-w-none print:rounded-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F2A5C] text-white px-5 py-4 flex items-start justify-between no-print">
          <div>
            <h2 className="font-serif text-lg font-semibold">
              Barcode Preview
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              {product.name} — {product.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className="px-5 py-3 bg-[#F1F4F9] border-b border-[#E8EBF0] flex flex-wrap items-center gap-4 no-print">
          <div className="text-xs text-[#5A6270]">
            📏 Label Size: <strong>50 × 25 mm</strong> (Standard Retail)
          </div>

          <div>
            <label className="text-xs text-[#5A6270] mr-2">Copies:</label>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="bg-white border border-[#E8EBF0] rounded px-2 py-1 text-sm"
            >
              <option value={1}>1 per variant</option>
              <option value={2}>2 per variant</option>
              <option value={3}>3 per variant</option>
              <option value={5}>5 per variant</option>
              <option value={10}>10 per variant</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#5A6270] cursor-pointer">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
            />
            Show product name
          </label>

          <label className="flex items-center gap-2 text-sm text-[#5A6270] cursor-pointer">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
            />
            Show price
          </label>
        </div>

        {/* Barcode list */}
        <div className="flex-1 overflow-y-auto p-5 print-area size-product">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 label-grid">
            {product.variants.flatMap((v) =>
              Array.from({ length: copies }, (_, i) => (
                <BarcodeLabel
                  key={`${v.id}-${i}`}
                  barcode={v.barcode}
                  productName={product.name}
                  size={v.size}
                  color={v.color}
                  sku={v.sku}
                  price={Number(product.price)}
                  discount={product.discount || 0}
                  showName={showName}
                  showPrice={showPrice}
                />
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-[#F1F4F9] border-t border-[#E8EBF0] flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E3E6EB] text-[#5A6270] hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
          >
            🖨️ Print {product.variants.length * copies} Labels
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Single Barcode Label
// ============================================
function BarcodeLabel({
  barcode,
  productName,
  size,
  color,
  sku,
  price,
  discount,
  showName,
  showPrice,
}: {
  barcode: string | null;
  productName: string;
  size: string;
  color: string;
  sku: string | null;
  price: number;
  discount: number;
  showName: boolean;
  showPrice: boolean;
}) {
  const finalPrice =
    discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
  const hasDiscount = discount > 0;

  if (!barcode) {
    return (
      <div className="border border-dashed border-red-300 rounded p-3 text-center text-xs text-red-600 bg-red-50">
        ⚠ No barcode — {size}/{color}
      </div>
    );
  }

  return (
    <div className="barcode-label border border-[#E8EBF0] rounded-lg p-3 text-center bg-white">
      {/* Barcode SVG — real Code128 */}
      <div className="flex justify-center items-center bg-white py-2 overflow-hidden">
        <Barcode
          value={barcode}
          format="CODE128"
          width={1.2}
          height={40}
          fontSize={0}
          margin={0}
          displayValue={false}
        />
      </div>

      {/* Barcode number */}
      <div className="font-mono text-xs text-ink mt-1">{barcode}</div>

      {/* Size/Color */}
      <div className="text-xs font-semibold text-[#0F2A5C] mt-1">
        {size} / {color}
      </div>

      {/* Product name */}
      {showName && (
        <div className="text-[10px] text-[#5A6270] mt-0.5 line-clamp-1">
          {productName}
        </div>
      )}

      {/* SKU */}
      {sku && (
        <div className="text-[9px] font-mono text-[#8A8F98] mt-0.5">
          {sku}
        </div>
      )}

      {/* Price + Branding */}
      <div className="mt-1.5 pt-1.5 border-t border-dashed border-[#E8EBF0]">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-semibold text-[#0F2A5C] tracking-widest">
            TANAVIA
          </div>
          {showPrice && (
            <div className="flex items-baseline gap-1">
              {hasDiscount && (
                <span className="text-[9px] text-[#8A8F98] line-through">
                  ৳{price.toLocaleString()}
                </span>
              )}
              <span className="text-sm font-bold text-[#0F2A5C]">
                ৳{finalPrice.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}