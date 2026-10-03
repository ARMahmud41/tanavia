'use client';

import { useMemo, useState } from 'react';
import { tk } from '@/lib/staff-pos';

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
  barcode: string | null;
  sku: string | null;
}

export interface ProductForPOS {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  price: number | string;
  discount: number;
  images: string[];
  variants: ProductVariant[];
}

interface Props {
  products: ProductForPOS[];
  onSelectVariant: (product: ProductForPOS, variant: ProductVariant) => void;
  loading?: boolean;
}

const CATEGORIES = ['All', 'Men', 'Women', 'Kids', 'Accessories'];

export function ProductGrid({ products, onSelectVariant, loading }: Props) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Filter products
  const filtered = useMemo(() => {
    let list = products;

    if (category !== 'All') {
      list = list.filter(
        (p) => (p.category || '').toLowerCase() === category.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        if (p.name.toLowerCase().includes(q)) return true;
        if (p.slug.toLowerCase().includes(q)) return true;
        return p.variants.some(
          (v) =>
            (v.barcode && v.barcode.toLowerCase().includes(q)) ||
            (v.sku && v.sku.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [products, category, search]);

  if (loading) {
    return (
      <div className="staff-card p-8 text-center text-sm text-[var(--staff-muted)]">
        Loading products...
      </div>
    );
  }

  return (
    <div className="staff-card p-4">
      {/* Category filter + search */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                category === c
                  ? 'bg-[var(--staff-accent)] text-white'
                  : 'bg-[var(--staff-tile-bg)] text-[var(--staff-muted)] hover:text-[var(--staff-text)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product..."
          className="bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-3 py-1.5 text-xs w-full md:w-52 text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
        />
      </div>

      {/* Product tiles */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--staff-muted)]">
          No products found
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[500px] overflow-y-auto pr-1 staff-scroll-light">
          {filtered.map((p) => {
            const totalQty = p.variants.reduce((s, v) => s + v.qty, 0);
            const totalReserved = p.variants.reduce(
              (s, v) => s + v.reserved,
              0
            );
            const available = totalQty - totalReserved;

            return (
              <div
                key={p.id}
                className="border border-[var(--staff-border)] rounded-lg overflow-hidden bg-[var(--staff-card)] hover:border-[var(--staff-accent)] transition"
              >
                {/* Image */}
                <div className="aspect-square bg-[var(--staff-tile-bg)] relative">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--staff-muted)] text-xs">
                      No img
                    </div>
                  )}
                  {p.discount > 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-[var(--staff-danger)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      -{p.discount}%
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <div className="font-medium text-[var(--staff-text)] text-xs line-clamp-1">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-[var(--staff-muted)] mt-0.5 mb-2">
                    {p.category || '—'} · {p.variants.length} var
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-[var(--staff-text)]">
                      {tk(p.price)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        available === 0
                          ? 'text-[var(--staff-danger)]'
                          : available <= 5
                          ? 'text-[var(--staff-warning)]'
                          : 'text-[var(--staff-success)]'
                      }`}
                    >
                      {available === 0
                        ? 'OUT'
                        : available <= 5
                        ? `Low: ${available}`
                        : `${available} avl`}
                    </div>
                  </div>

                  {/* Variant quick pick */}
                  {available === 0 ? (
                    <button
                      disabled
                      className="w-full py-1.5 rounded text-[10px] font-medium bg-[var(--staff-tile-bg)] text-[var(--staff-muted)] cursor-not-allowed"
                    >
                      Out of stock
                    </button>
                  ) : p.variants.length === 1 ? (
                    <button
                      onClick={() => onSelectVariant(p, p.variants[0])}
                      className="w-full py-1.5 rounded text-[10px] font-medium bg-[var(--staff-accent)] hover:opacity-90 text-white transition"
                    >
                      Add {p.variants[0].size}/{p.variants[0].color}
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {p.variants.slice(0, 4).map((v) => {
                        const vAvail = v.qty - v.reserved;
                        const disabled = vAvail <= 0;
                        return (
                          <button
                            key={v.id}
                            disabled={disabled}
                            onClick={() => onSelectVariant(p, v)}
                            title={`${v.size} / ${v.color} — ${vAvail} avail`}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                              disabled
                                ? 'border-[var(--staff-border)] text-[var(--staff-muted)] line-through cursor-not-allowed'
                                : 'border-[var(--staff-accent)] text-[var(--staff-accent)] hover:bg-[var(--staff-accent)] hover:text-white'
                            }`}
                          >
                            {v.size}/{v.color.slice(0, 3)}
                          </button>
                        );
                      })}
                      {p.variants.length > 4 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-[var(--staff-muted)]">
                          +{p.variants.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}