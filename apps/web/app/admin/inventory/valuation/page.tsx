'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface CategoryValuation {
  name: string;
  qty: number;
  costValue: number;
  retailValue: number;
}

interface DeadStockItem {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  qty: number;
  costValue: number;
}

interface Valuation {
  totalQty: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  byCategory: CategoryValuation[];
  deadStock: DeadStockItem[];
  deadStockValue: number;
  deadStockCount: number;
}

// ============================================
// Page
// ============================================
export default function ValuationPage() {
  const [data, setData] = useState<Valuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllDead, setShowAllDead] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getToken() || undefined;
        const res = await api.get<Valuation>(
          `/api/inventory/valuation`,
          { token }
        );
        setData(res.data || null);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to load valuation';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">
          Loading valuation...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-2">
            Could not load valuation
          </h1>
          <p className="text-sm text-[#8A8F98] mb-4">
            {error || 'Try again later.'}
          </p>
          <Link
            href="/admin/inventory"
            className="inline-block bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            ← Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  const maxCategoryValue = Math.max(
    ...data.byCategory.map((c) => c.costValue),
    1
  );

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Back */}
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to Inventory
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
          Valuation
        </h1>
        <p className="text-[#8A8F98] text-sm">
          What your stock is worth at cost and at selling price.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total quantity"
          value={String(data.totalQty)}
          sub="pieces on hand"
          tint="#0F2A5C"
        />
        <SummaryCard
          label="Stock at cost"
          value={tk(data.totalCostValue)}
          sub="what you paid"
          tint="#DC2626"
        />
        <SummaryCard
          label="Stock at retail"
          value={tk(data.totalRetailValue)}
          sub="if all sold"
          tint="#059669"
        />
        <SummaryCard
          label="Potential profit"
          value={tk(data.potentialProfit)}
          sub="retail − cost"
          tint="#7C3AED"
        />
      </div>

      {/* By category */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5 mb-5">
        <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
          Value by category
        </h2>

        {data.byCategory.length === 0 ? (
          <p className="text-sm text-[#8A8F98]">No stock yet.</p>
        ) : (
          <div className="space-y-4">
            {data.byCategory.map((c) => {
              const widthPct = (c.costValue / maxCategoryValue) * 100;
              return (
                <div key={c.name}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <div className="font-medium text-[#0F2A5C]">{c.name}</div>
                    <div className="text-xs text-[#8A8F98]">
                      {c.qty} pcs
                    </div>
                  </div>
                  <div className="h-2 bg-[#F1F3F6] rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-[#0F2A5C] to-[#2E5A9C] rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#8A8F98]">
                    <span>
                      Cost: <strong className="text-[#0F2A5C]">{tk(c.costValue)}</strong>
                    </span>
                    <span>Retail: {tk(c.retailValue)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dead stock */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-1">
              Dead stock
            </h2>
            <p className="text-xs text-[#8A8F98]">
              Items with no sales in the last 60 days. Tied-up cost:{' '}
              <strong className="text-[#C81E1E]">
                {tk(data.deadStockValue)}
              </strong>{' '}
              · {data.deadStockCount} variants
            </p>
          </div>
          {data.deadStock.length > 5 && (
            <button
              onClick={() => setShowAllDead((v) => !v)}
              className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              {showAllDead ? 'Show less' : `Show all (${data.deadStockCount})`}
            </button>
          )}
        </div>

        {data.deadStock.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-sm text-[#8A8F98]">
              No dead stock. Everything moves!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-medium">Product</th>
                  <th className="text-left px-3 py-2 font-medium">Variant</th>
                  <th className="text-right px-3 py-2 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 font-medium">Cost value</th>
                </tr>
              </thead>
              <tbody>
                {(showAllDead
                  ? data.deadStock
                  : data.deadStock.slice(0, 5)
                ).map((d) => (
                  <tr
                    key={d.variantId}
                    className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9]"
                  >
                    <td className="px-3 py-2 text-[#0F2A5C]">
                      {d.productName}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#8A8F98]">
                      {d.size} · {d.color}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-[#0F2A5C]">
                      {d.qty}
                    </td>
                    <td className="px-3 py-2 text-right text-[#C81E1E] font-mono text-xs">
                      {tk(d.costValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SummaryCard
// ============================================
function SummaryCard({
  label,
  value,
  sub,
  tint,
}: {
  label: string;
  value: string;
  sub: string;
  tint: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 border border-[#E8EBF0] shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
      <div className="text-xs text-[#8A8F98] mb-1">{label}</div>
      <div className="text-2xl font-bold mb-0.5" style={{ color: tint }}>
        {value}
      </div>
      <div className="text-[10px] text-[#8A8F98] uppercase tracking-wide">
        {sub}
      </div>
    </div>
  );
}