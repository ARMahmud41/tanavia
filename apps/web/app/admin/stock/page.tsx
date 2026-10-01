'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import { MovementHistoryModal } from './components/MovementHistoryModal';

interface Variant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  active: boolean;
  lowStockAt?: number;
  images: string[];
  variants: Variant[];
}

interface Summary {
  productsCount: number;
  totalQty: number;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
}

type FilterType = 'all' | 'low' | 'out' | 'reserved';

export default function AdminStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [historyFor, setHistoryFor] = useState<{
    productId: string;
    variantSize: string;
    variantColor: string;
    productName: string;
    variantSku: string;
  } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const [prodRes, sumRes] = await Promise.all([
        api.get<Product[]>('/api/products/admin?limit=100', { token }),
        api.get<Summary>('/api/stock/summary', { token }),
      ]);

      setProducts(prodRes.data || []);
      setSummary(sumRes.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load stock';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ============================================
  // Flatten all variants into rows
  // ============================================
  const rows = useMemo(() => {
    const list: Array<{
      productId: string;
      productName: string;
      sku: string;
      category: string | null;
      variantId: string;
      size: string;
      color: string;
      qty: number;
      reserved: number;
      available: number;
      status: 'ok' | 'low' | 'out';
      image?: string;
    }> = [];

    for (const p of products) {
      for (const v of p.variants) {
        const available = v.qty - v.reserved;
        const threshold = 5;
        let status: 'ok' | 'low' | 'out' = 'ok';
        if (v.qty === 0) status = 'out';
        else if (v.qty <= threshold) status = 'low';

        list.push({
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          category: p.category,
          variantId: v.id,
          size: v.size,
          color: v.color,
          qty: v.qty,
          reserved: v.reserved,
          available,
          status,
          image: p.images?.[0],
        });
      }
    }

    return list;
  }, [products]);

  // ============================================
  // Apply filters + search
  // ============================================
  const filteredRows = useMemo(() => {
    let list = rows;

    if (filter === 'low') list = list.filter((r) => r.status === 'low');
    else if (filter === 'out') list = list.filter((r) => r.status === 'out');
    else if (filter === 'reserved') list = list.filter((r) => r.reserved > 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.size.toLowerCase().includes(q) ||
          r.color.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, filter, search]);

  // ============================================
  // Totals
  // ============================================
  const totals = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const totalReserved = rows.reduce((s, r) => s + r.reserved, 0);
    const totalAvailable = totalQty - totalReserved;
    const lowCount = rows.filter((r) => r.status === 'low').length;
    const outCount = rows.filter((r) => r.status === 'out').length;

    return { totalQty, totalReserved, totalAvailable, lowCount, outCount };
  }, [rows]);

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Stock Management
          </h1>
          <p className="text-[#8A8F98] text-sm">
            Live stock across all variants
          </p>
        </div>
        <button
          onClick={load}
          className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold transition"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard
          label="Total Stock"
          value={`${totals.totalQty} units`}
          sub={`${rows.length} variants`}
        />
        <SummaryCard
          label="Available"
          value={`${totals.totalAvailable}`}
          sub="ready to sell"
          color="leaf"
        />
        <SummaryCard
          label="Reserved"
          value={`${totals.totalReserved}`}
          sub="for online orders"
          color="amber"
        />
        <SummaryCard
          label="Low Stock"
          value={`${totals.lowCount}`}
          sub="needs restock"
          color={totals.lowCount > 0 ? 'amber' : undefined}
        />
        <SummaryCard
          label="Out of Stock"
          value={`${totals.outCount}`}
          sub="variants"
          color={totals.outCount > 0 ? 'red' : undefined}
        />
      </div>

      {/* Stock value card */}
      {summary && (
        <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5 mb-5">
          <h2 className="font-serif text-base font-semibold text-[#0F2A5C] mb-3">
            Inventory Value
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-[#8A8F98] text-xs mb-1">Cost Value</div>
              <div className="font-semibold text-[#0F2A5C]">
                {tk(summary.costValue)}
              </div>
            </div>
            <div>
              <div className="text-[#8A8F98] text-xs mb-1">Retail Value</div>
              <div className="font-semibold text-[#0F2A5C]">
                {tk(summary.retailValue)}
              </div>
            </div>
            <div>
              <div className="text-[#8A8F98] text-xs mb-1">Potential Profit</div>
              <div className="font-semibold text-[#0B7A47]">
                {tk(summary.potentialProfit)}
              </div>
            </div>
            <div>
              <div className="text-[#8A8F98] text-xs mb-1">Products</div>
              <div className="font-semibold text-[#0F2A5C]">
                {summary.productsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <FilterPill
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label={`All (${rows.length})`}
          />
          <FilterPill
            active={filter === 'low'}
            onClick={() => setFilter('low')}
            label={`Low Stock (${totals.lowCount})`}
          />
          <FilterPill
            active={filter === 'out'}
            onClick={() => setFilter('out')}
            label={`Out of Stock (${totals.outCount})`}
          />
          <FilterPill
            active={filter === 'reserved'}
            onClick={() => setFilter('reserved')}
            label={`Reserved (${rows.filter((r) => r.reserved > 0).length})`}
          />
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU, size, color..."
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 text-sm w-full md:w-72 focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#8A8F98] text-sm">
            Loading stock...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-[#5A6270] mb-2">No matching variants</p>
            <p className="text-sm text-[#8A8F98]">
              Try changing the filter or search term
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Variant</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-right px-4 py-3 font-medium">Reserved</th>
                  <th className="text-right px-4 py-3 font-medium">Available</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr
                    key={r.variantId}
                    onClick={() =>
                      setHistoryFor({
                        productId: r.productId,
                        variantSize: r.size,
                        variantColor: r.color,
                        productName: r.productName,
                        variantSku: `${r.sku}-${r.size.toUpperCase()}-${r.color.toUpperCase().slice(0, 3)}`,
                      })
                    }
                    className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 bg-[#F1F3F6] rounded overflow-hidden flex-shrink-0">
                          {r.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.image}
                              alt={r.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-xs">
                              📷
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-ink">
                            {r.productName}
                          </div>
                          {r.category && (
                            <div className="text-xs text-[#8A8F98]">
                              {r.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5A6270]">
                      {r.sku}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-[#F1F3F6] rounded text-xs font-medium text-[#0F2A5C]">
                        {r.size} / {r.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#0F2A5C]">
                      {r.qty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.reserved > 0 ? (
                        <span className="text-amber-600 font-medium">
                          {r.reserved}
                        </span>
                      ) : (
                        <span className="text-[#8A8F98]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span
                        className={
                          r.available === 0
                            ? 'text-[#C81E1E]'
                            : r.available <= 5
                            ? 'text-[#B45309]'
                            : 'text-[#0B7A47]'
                        }
                      >
                        {r.available}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={r.status} reserved={r.reserved} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement History Modal */}
      {historyFor && (
        <MovementHistoryModal
          productId={historyFor.productId}
          variantSize={historyFor.variantSize}
          variantColor={historyFor.variantColor}
          productName={historyFor.productName}
          variantSku={historyFor.variantSku}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'leaf' | 'amber' | 'red';
}) {
  const valueColor =
    color === 'leaf'
      ? 'text-[#0B7A47]'
      : color === 'amber'
      ? 'text-[#B45309]'
      : color === 'red'
      ? 'text-[#C81E1E]'
      : 'text-[#0F2A5C]';

  return (
    <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4">
      <div className="text-xs text-[#8A8F98] uppercase tracking-wide mb-1.5">
        {label}
      </div>
      <div className={`font-serif text-2xl font-semibold ${valueColor}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-[#8A8F98] mt-0.5">{sub}</div>}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
        active
          ? 'bg-[#0F2A5C] text-white shadow-[0_2px_6px_rgba(15,42,92,0.2)]'
          : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  status,
  reserved,
}: {
  status: 'ok' | 'low' | 'out';
  reserved: number;
}) {
  if (status === 'out' && reserved === 0) {
    return (
      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-red-50 text-red-700 border-red-200">
        OUT
      </span>
    );
  }
  if (status === 'out' && reserved > 0) {
    return (
      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
        RESERVED
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
        LOW
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
      OK
    </span>
  );
}