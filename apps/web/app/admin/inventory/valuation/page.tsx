'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ============================================
// Types (matching backend exactly)
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

const CATEGORY_COLORS = [
  '#0F2A5C',
  '#2F7D7A',
  '#D97706',
  '#7C3AED',
  '#DC2626',
  '#1F4E79',
  '#6B7280',
  '#059669',
];

// ============================================
// Page
// ============================================
export default function ValuationPage() {
  const [data, setData] = useState<Valuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllDead, setShowAllDead] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<Valuation>('/api/inventory/valuation', { token });
      setData(res.data || null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load valuation'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const margin =
    data && data.totalRetailValue > 0
      ? ((data.potentialProfit / data.totalRetailValue) * 100).toFixed(1)
      : '0.0';

  const chartData =
    data?.byCategory?.map((c) => ({
      name: c.name,
      Cost: c.costValue,
      Retail: c.retailValue,
    })) || [];

  const pieData =
    data?.byCategory?.map((c) => ({
      name: c.name,
      value: c.costValue,
    })) || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">📦</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Inventory
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Stock, alerts, purchases, valuation
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] hover:bg-[#F1F3F6] disabled:opacity-50 min-h-[44px]"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ============================================ */}
      {/* Tab bar */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-5 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Stock', href: '/admin/inventory' },
            { key: 'low', label: 'Low stock', href: '/admin/inventory/low-stock' },
            { key: 'movements', label: 'Movements', href: '/admin/stock/movements' },
            { key: 'count', label: 'Count', href: '/admin/inventory/count' },
            { key: 'valuation', label: 'Valuation', href: '/admin/inventory/valuation', active: true },
          ].map((t) =>
            t.active ? (
              <span
                key={t.key}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold bg-[#0F2A5C] text-white whitespace-nowrap"
              >
                {t.label}
              </span>
            ) : (
              <Link
                key={t.key}
                href={t.href}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#5A6270] hover:bg-[#F1F3F6] whitespace-nowrap"
              >
                {t.label}
              </Link>
            )
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ============================================ */}
      {/* Stats cards */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          label="Total Quantity"
          value={String(data?.totalQty ?? 0)}
          hint="pieces on hand"
          color="navy"
        />
        <StatCard
          label="Stock at Cost"
          value={tk(data?.totalCostValue ?? 0)}
          hint="what you paid"
          color="red"
        />
        <StatCard
          label="Stock at Retail"
          value={tk(data?.totalRetailValue ?? 0)}
          hint="if all sold"
          color="emerald"
        />
        <StatCard
          label="Potential Profit"
          value={tk(data?.potentialProfit ?? 0)}
          hint={`Margin ${margin}%`}
          color="purple"
        />
      </div>

      {/* ============================================ */}
      {/* Charts */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
        {/* Category bar chart */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Value by Category
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#8A8F98]">
              Loading...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">📊</div>
              <p>No stock yet</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#8A8F98' }}
                    stroke="#E8EBF0"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8A8F98' }}
                    stroke="#E8EBF0"
                    tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E8EBF0',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => `৳${Number(v).toLocaleString()}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar dataKey="Cost" fill="#0F2A5C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Retail" fill="#2F7D7A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cost distribution pie */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Cost Distribution
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#8A8F98]">
              Loading...
            </div>
          ) : pieData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">💼</div>
              <p>No categories</p>
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #E8EBF0',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => `৳${Number(v).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {pieData.slice(0, 5).map((c, i) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          background:
                            CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }}
                      />
                      <span className="text-[#5A6270] capitalize truncate">
                        {c.name}
                      </span>
                    </div>
                    <span className="font-semibold text-[#0F2A5C] whitespace-nowrap">
                      {tk(c.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* Category breakdown table */}
      {/* ============================================ */}
      {!loading && (data?.byCategory?.length || 0) > 0 && (
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] mb-5 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-[#E8EBF0]">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
              Breakdown by Category
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-center px-3 py-3 font-semibold">Qty</th>
                  <th className="text-right px-3 py-3 font-semibold">Cost Value</th>
                  <th className="text-right px-3 py-3 font-semibold">Retail Value</th>
                  <th className="text-right px-3 py-3 font-semibold">Profit</th>
                  <th className="text-center px-3 py-3 font-semibold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data!.byCategory.map((c) => {
                  const profit = c.retailValue - c.costValue;
                  const catMargin =
                    c.retailValue > 0
                      ? ((profit / c.retailValue) * 100).toFixed(0)
                      : '0';
                  return (
                    <tr
                      key={c.name}
                      className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA]"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0F2A5C]">
                        {c.name}
                      </td>
                      <td className="px-3 py-3 text-center text-xs">
                        {c.qty}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {tk(c.costValue)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {tk(c.retailValue)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-emerald-700">
                        {tk(profit)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                          {catMargin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* Dead stock */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[#E8EBF0] flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
              Dead Stock
            </h2>
            <p className="text-xs text-[#8A8F98] mt-0.5">
              No sales in the last 60 days · {data?.deadStockCount ?? 0} variants
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
              Tied-up Cost
            </div>
            <div className="text-lg sm:text-xl font-bold text-red-600">
              {tk(data?.deadStockValue ?? 0)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[#8A8F98]">
            Loading...
          </div>
        ) : !data?.deadStock || data.deadStock.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-[#0F2A5C] font-medium">
              No dead stock
            </p>
            <p className="text-xs text-[#8A8F98] mt-1">
              Everything is moving
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                    <th className="text-left px-4 py-3 font-semibold">Product</th>
                    <th className="text-left px-3 py-3 font-semibold">Variant</th>
                    <th className="text-center px-3 py-3 font-semibold">Qty</th>
                    <th className="text-right px-3 py-3 font-semibold">
                      Tied-up Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllDead
                    ? data.deadStock
                    : data.deadStock.slice(0, 5)
                  ).map((d) => (
                    <tr
                      key={d.variantId}
                      className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA]"
                    >
                      <td className="px-4 py-3 font-semibold text-[#0F2A5C]">
                        {d.productName}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#8A8F98]">
                        {d.size} / {d.color}
                      </td>
                      <td className="px-3 py-3 text-center font-medium">
                        {d.qty}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-red-600">
                        {tk(d.costValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-[#F1F3F6]">
              {(showAllDead ? data.deadStock : data.deadStock.slice(0, 5)).map(
                (d) => (
                  <div key={d.variantId} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#0F2A5C] truncate text-sm">
                          {d.productName}
                        </div>
                        <div className="text-[11px] text-[#8A8F98] mt-0.5">
                          {d.size} / {d.color}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-red-600">
                          {tk(d.costValue)}
                        </div>
                        <div className="text-[10px] text-[#8A8F98]">
                          {d.qty} pcs
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {data.deadStock.length > 5 && (
              <div className="p-3 sm:p-4 border-t border-[#F1F3F6] text-center">
                <button
                  onClick={() => setShowAllDead((v) => !v)}
                  className="text-xs font-semibold text-[#0F2A5C] hover:underline min-h-[44px] px-4"
                >
                  {showAllDead
                    ? 'Show less'
                    : `Show all ${data.deadStock.length} variants →`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// Stat Card
// ============================================
function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color: 'navy' | 'emerald' | 'red' | 'purple';
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    emerald: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
    purple: 'from-purple-500 to-purple-700',
  };
  return (
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
            {label}
          </div>
          <div className="text-base sm:text-2xl font-bold text-[#0F2A5C] leading-tight truncate">
            {value}
          </div>
          {hint && (
            <div className="text-[9px] sm:text-[10px] text-[#8A8F98] mt-0.5 truncate">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}