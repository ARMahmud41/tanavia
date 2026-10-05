'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import {
  ProductStockGroup,
  getStatus,
  type ProductGroup,
  type VariantData,
} from './components/ProductStockGroup';
import { MovementHistoryModal } from './components/MovementHistoryModal';

interface Variant {
  id: string;
  sku: string | null;
  barcode: string | null;
  size: string;
  color: string;
  qty: number;
  reserved: number;
  reorderLevel: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category:
    | string
    | { id: string; name: string; nameBn?: string | null; slug: string }
    | null;
  active: boolean;
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
  const [expandedAll, setExpandedAll] = useState(false);

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
  // Build product groups (parent + variants)
  // ============================================
  const groups: ProductGroup[] = useMemo(() => {
    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      category:
        typeof p.category === 'string'
          ? p.category
          : p.category?.name || null,
      images: p.images || [],
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        size: v.size,
        color: v.color,
        qty: v.qty,
        reserved: v.reserved,
        reorderLevel: v.reorderLevel || 5,
      })),
    }));
  }, [products]);

  // ============================================
  // Flatten for totals
  // ============================================
  const allVariants = useMemo(() => {
    return groups.flatMap((g) => g.variants);
  }, [groups]);

  const totals = useMemo(() => {
    const totalQty = allVariants.reduce((s, v) => s + v.qty, 0);
    const totalReserved = allVariants.reduce((s, v) => s + v.reserved, 0);
    const totalAvailable = totalQty - totalReserved;
    const lowCount = allVariants.filter(
      (v) => getStatus(v.qty, v.reserved, v.reorderLevel) === 'LOW'
    ).length;
    const outCount = allVariants.filter(
      (v) => getStatus(v.qty, v.reserved, v.reorderLevel) === 'OUT'
    ).length;
    const reservedCount = allVariants.filter((v) => v.reserved > 0).length;

    return {
      totalQty,
      totalReserved,
      totalAvailable,
      lowCount,
      outCount,
      reservedCount,
    };
  }, [allVariants]);

  // ============================================
  // Apply filter + search to groups
  // ============================================
  const filteredGroups = useMemo(() => {
    let list = groups;

    // Filter: keep groups that have matching variants
    if (filter === 'low') {
      list = list
        .map((g) => ({
          ...g,
          variants: g.variants.filter(
            (v) => getStatus(v.qty, v.reserved, v.reorderLevel) === 'LOW'
          ),
        }))
        .filter((g) => g.variants.length > 0);
    } else if (filter === 'out') {
      list = list
        .map((g) => ({
          ...g,
          variants: g.variants.filter(
            (v) => getStatus(v.qty, v.reserved, v.reorderLevel) === 'OUT'
          ),
        }))
        .filter((g) => g.variants.length > 0);
    } else if (filter === 'reserved') {
      list = list
        .map((g) => ({
          ...g,
          variants: g.variants.filter((v) => v.reserved > 0),
        }))
        .filter((g) => g.variants.length > 0);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list
        .map((g) => ({
          ...g,
          variants: g.variants.filter(
            (v) =>
              g.productName.toLowerCase().includes(q) ||
              g.sku.toLowerCase().includes(q) ||
              (v.sku && v.sku.toLowerCase().includes(q)) ||
              v.size.toLowerCase().includes(q) ||
              v.color.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.variants.length > 0);
    }

    return list;
  }, [groups, filter, search]);

  // ============================================
  // CSV Export
  // ============================================
  function handleExportCSV() {
    const rows = [
      ['Product', 'Category', 'Variant SKU', 'Barcode', 'Size', 'Color', 'Stock', 'Reserved', 'Available', 'Reorder Level', 'Status'],
    ];

    for (const g of filteredGroups) {
      for (const v of g.variants) {
        const available = v.qty - v.reserved;
        const status = getStatus(v.qty, v.reserved, v.reorderLevel);
        rows.push([
          g.productName,
          g.category || '',
          v.sku || '',
          v.barcode || '',
          v.size,
          v.color,
          String(v.qty),
          String(v.reserved),
          String(available),
          String(v.reorderLevel),
          status,
        ]);
      }
    }

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tanavia-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ============================================
  // Print
  // ============================================
  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Stock
          </h1>
          <p className="text-[#8A8F98] text-sm">
            Live stock across all variants — grouped by product
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/inventory"
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2"
          >
            📦 Open Inventory
          </Link>
          <Link
            href="/admin/stock/movements"
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2"
          >
            📊 View Movements
          </Link>
          <button
            onClick={() => setExpandedAll((v) => !v)}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            {expandedAll ? '▼ Collapse All' : '▶ Expand All'}
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            📥 CSV
          </button>
          <button
            onClick={handlePrint}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            🖨️ Print
          </button>
          <button
            onClick={load}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            ↻ Refresh
          </button>
        </div>
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
          sub={`${groups.length} products · ${allVariants.length} variants`}
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

      {/* Inventory value card */}
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
            label={`All (${groups.length})`}
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
            label={`Reserved (${totals.reservedCount})`}
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
        ) : filteredGroups.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-[#5A6270] mb-2">No matching products</p>
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
                  <th className="text-left px-4 py-3 font-medium">Variant SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Variant</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-right px-4 py-3 font-medium">Reserved</th>
                  <th className="text-right px-4 py-3 font-medium">Available</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((g) => (
                  <ProductStockGroup
                    key={g.productId}
                    group={g}
                    onVariantClick={(v: VariantData) =>
                      setHistoryFor({
                        productId: g.productId,
                        variantSize: v.size,
                        variantColor: v.color,
                        productName: g.productName,
                        variantSku: v.sku || '—',
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-[#8A8F98] flex justify-between">
        <span>
          Showing {filteredGroups.length} product
          {filteredGroups.length !== 1 ? 's' : ''} · reorder level:{' '}
          {process.env.NEXT_PUBLIC_STOCK_REORDER_LEVEL || 5}
        </span>
        <span>Page 1 of 1</span>
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