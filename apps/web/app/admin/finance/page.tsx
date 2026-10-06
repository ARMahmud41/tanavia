'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============================================
// Types
// ============================================
interface OrderStats {
  revenue: number;
  cost: number;
  profit: number;
  orders?: number;
}

interface FinanceSummary {
  range: { from: string | null; to: string | null };
  online: OrderStats;
  offline: OrderStats;
  total: OrderStats;
  byPaymentMethod: Record<string, number>;
  pendingCOD: { amount: number; count: number };
}

interface ExpenseSummary {
  byCategory: Array<{ category: string; total: number; count: number }>;
  grandTotal: number;
}

interface AccountsSummary {
  cash: number;
  bkash: number;
  nagad: number;
  bank: number;
  withCouriers: number;
  withCouriersCount: number;
}

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

const PIE_COLORS = [
  '#0F2A5C', '#2F7D7A', '#D97706', '#7C3AED',
  '#DC2626', '#1F4E79', '#6B7280', '#059669',
];

// ============================================
// Date helper
// ============================================
function buildRange(range: RangeKey): { from?: string; to?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const from = new Date();
  switch (range) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      break;
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      from.setDate(now.getDate() - diff);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

// ============================================
// Page
// ============================================
export default function AdminFinancePage() {
  const [range, setRange] = useState<RangeKey>('today');
  const [compare, setCompare] = useState(false);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const { from, to } = buildRange(range);
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);

      const [sumRes, expRes, accRes] = await Promise.all([
        api.get<FinanceSummary>(`/api/finance/summary?${qs.toString()}`, { token }),
        api.get<ExpenseSummary>(`/api/finance/expenses/summary?${qs.toString()}`, { token }),
        api.get<AccountsSummary>('/api/finance/accounts', { token }),
      ]);
      setSummary(sumRes.data || null);
      setExpenses(expRes.data || null);
      setAccounts(accRes.data || null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load'
      );
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Derived values ----
  const total = summary?.total || { revenue: 0, cost: 0, profit: 0 };
  const netSales = Number(total.revenue || 0);
  const costOfGoods = Number(total.cost || 0);
  const grossProfit = Number(total.profit || 0);
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const expensesTotal = Number(expenses?.grandTotal || 0);
  const netProfit = grossProfit - expensesTotal;
  const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
  const codHeld = Number(summary?.pendingCOD?.amount || 0);
  const codHeldCount = Number(summary?.pendingCOD?.count || 0);

  // Payment method chart
  const paymentData = summary?.byPaymentMethod
    ? Object.entries(summary.byPaymentMethod)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .filter((d) => d.value > 0)
    : [];

  // Channel chart
  const channelData = [
    { name: 'Shop (POS)', value: Number(summary?.offline?.revenue || 0), profit: Number(summary?.offline?.profit || 0) },
    { name: 'Website', value: Number(summary?.online?.revenue || 0), profit: Number(summary?.online?.profit || 0) },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">💰</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Finance
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Money in, money out, all in one place
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Tab bar */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Overview', href: '/admin/finance', active: true },
            { key: 'pnl', label: 'Profit and loss', href: '/admin/finance/pnl' },
            { key: 'expenses', label: 'Expenses', href: '/admin/finance/expenses', badge: 2 },
            { key: 'cash', label: 'Cash and shifts', href: '/admin/finance/cash-shifts' },
            { key: 'tx', label: 'Transactions', href: '/admin/finance/transactions' },
          ].map((t) =>
            t.active ? (
              <span
                key={t.key}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold bg-[#0F2A5C] text-white whitespace-nowrap flex items-center gap-2"
              >
                {t.label}
              </span>
            ) : (
              <Link
                key={t.key}
                href={t.href}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#5A6270] hover:bg-[#F1F3F6] whitespace-nowrap flex items-center gap-2"
              >
                {t.label}
                {t.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                    {t.badge}
                  </span>
                )}
              </Link>
            )
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* Range chips + compare */}
      {/* ============================================ */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-[#E8EBF0]">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                range === r.key
                  ? 'bg-[#0F2A5C] text-white'
                  : 'text-[#5A6270] hover:bg-[#F1F3F6]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-[#5A6270] cursor-pointer">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="rounded"
          />
          Compare with the period before
        </label>
      </div>

      {/* ============================================ */}
      {/* Stat cards — all clickable */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
        <StatCard
          label="Net Sales"
          value={tk(netSales)}
          color="navy"
          href="/admin/finance/transactions"
        />
        <StatCard
          label="Gross Profit"
          value={tk(grossProfit)}
          hint={`Margin ${grossMargin.toFixed(0)}% · ${costOfGoods > 0 ? `Cost ${tk(costOfGoods)}` : 'No cost yet'}`}
          color="emerald"
          href="/admin/finance/pnl"
        />
        <StatCard
          label="Expenses & Courier Costs"
          value={tk(expensesTotal)}
          hint={`${expenses?.byCategory?.length || 0} categories`}
          color="red"
          href="/admin/finance/expenses"
        />
        <StatCard
          label="Net Profit"
          value={tk(netProfit)}
          hint={`Margin ${netMargin.toFixed(0)}% · ${netProfit >= 0 ? 'Profit' : 'Loss'}`}
          color="purple"
          href="/admin/finance/pnl"
        />
        <StatCard
          label="COD Held by Couriers"
          value={tk(codHeld)}
          hint={codHeldCount > 0 ? `${codHeldCount} orders in transit` : 'Not yet paid to you'}
          color="amber"
          href="/admin/courier"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* ============================================ */}
      {/* Alert chips — clickable */}
      {/* ============================================ */}
      <div className="flex flex-wrap gap-2 mb-5">
        {codHeldCount > 0 && (
          <Link
            href="/admin/courier"
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition cursor-pointer"
          >
            <span>⏰</span>
            <span>
              <strong>{tk(codHeld)}</strong> is with couriers for {codHeldCount} order{codHeldCount !== 1 ? 's' : ''}
            </span>
            <span className="text-amber-500">→</span>
          </Link>
        )}
        {expensesTotal > 0 && (
          <Link
            href="/admin/finance/expenses"
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer"
          >
            <span>💵</span>
            <span>
              <strong>{tk(expensesTotal)}</strong> spent this period
            </span>
            <span className="text-blue-500">→</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ============================================ */}
      {/* Charts row */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5">
        {/* Sales and profit */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5 lg:col-span-2">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Sales and profit
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-[#8A8F98]">Loading...</div>
          ) : netSales === 0 && grossProfit === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">📊</div>
              <p>No sales in this period</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A8F98' }} stroke="#E8EBF0" />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8A8F98' }}
                    stroke="#E8EBF0"
                    tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => `৳${Number(v).toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
                  <Bar dataKey="value" name="Revenue" fill="#0F2A5C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#2F7D7A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Where the money is */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Where the money is now
          </h2>
          <div className="space-y-2.5">
            <MoneyRow icon="💵" label="Cash in the shop" value={accounts?.cash ?? 0} />
            <MoneyRow icon="📱" label="bKash" value={accounts?.bkash ?? 0} />
            <MoneyRow icon="📱" label="Nagad" value={accounts?.nagad ?? 0} />
            <MoneyRow icon="🏦" label="Bank" value={accounts?.bank ?? 0} />
            <MoneyRow icon="🚚" label="With couriers (COD)" value={accounts?.withCouriers ?? codHeld} highlight />
          </div>
          <div className="mt-4 pt-3 border-t border-[#E8EBF0] text-[10px] text-[#8A8F98] leading-relaxed">
            ⓘ Balances start from opening amounts. Confirm real cash at shift close, and check bKash and bank statements.
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Bottom row: payment methods + channel */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Payment methods */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Net sales by payment method
          </h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm text-[#8A8F98]">Loading...</div>
          ) : paymentData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">💳</div>
              <p>No payments</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={65} innerRadius={40}
                      paddingAngle={2}
                    >
                      {paymentData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => `৳${Number(v).toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 w-full">
                {paymentData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[#5A6270] font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#0F2A5C]">{tk(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* By channel */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            By channel
          </h2>
          <div className="space-y-3">
            {channelData.map((c) => {
              const max = Math.max(...channelData.map((x) => x.value), 1);
              const pct = (c.value / max) * 100;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#5A6270] font-medium">{c.name}</span>
                    <span className="font-semibold text-[#0F2A5C]">{tk(c.value)}</span>
                  </div>
                  <div className="h-2 bg-[#F1F3F6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0F2A5C] to-[#2F7D7A] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {channelData.every((c) => c.value === 0) && (
            <div className="text-center text-xs text-[#8A8F98] py-4">No channel data</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Stat Card — clickable
// ============================================
function StatCard({
  label,
  value,
  hint,
  color,
  className = '',
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  color: 'navy' | 'emerald' | 'red' | 'purple' | 'amber';
  className?: string;
  href?: string;
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    emerald: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
    purple: 'from-purple-500 to-purple-700',
    amber: 'from-amber-500 to-amber-600',
  };

  const inner = (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]} flex-shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
          {label}
        </div>
        <div className="text-base sm:text-xl font-bold text-[#0F2A5C] leading-tight truncate">
          {value}
        </div>
        {hint && (
          <div className="text-[9px] sm:text-[10px] text-[#8A8F98] mt-0.5 truncate">
            {hint}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0] hover:border-[#0F2A5C]/40 hover:shadow-md transition cursor-pointer block ${className}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={`rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0] ${className}`}>
      {inner}
    </div>
  );
}

// ============================================
// Money Row
// ============================================
function MoneyRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-[#5A6270]">{label}</span>
      </div>
      <span
        className={`font-semibold ${
          highlight ? 'text-amber-700' : 'text-[#0F2A5C]'
        }`}
      >
        {tk(value)}
      </span>
    </div>
  );
}