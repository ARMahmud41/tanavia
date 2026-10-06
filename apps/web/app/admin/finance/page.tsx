'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ============================================
// Types (matching backend)
// ============================================
interface OrderStats {
  revenue: number;
  cost: number;
  profit: number;
  count?: number;
  items?: number;
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
  range: { from: string | null; to: string | null };
  byCategory: Array<{ category: string; total: number; count: number }>;
  grandTotal: number;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string | number;
  method?: string | null;
  reference?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    channel: string;
  } | null;
}

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

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
// Date range helper (client-side)
// ============================================
function buildDateRange(range: RangeKey): { from?: string; to?: string } {
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
      const diff = day === 0 ? 6 : day - 1; // Monday start
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

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

// ============================================
// Page
// ============================================
export default function AdminFinancePage() {
  const [range, setRange] = useState<RangeKey>('month');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const { from, to } = buildDateRange(range);
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);

      const [summaryRes, expRes, txRes] = await Promise.all([
        api.get<FinanceSummary>(`/api/finance/summary?${qs.toString()}`, {
          token,
        }),
        api.get<ExpenseSummary>(
          `/api/finance/expenses/summary?${qs.toString()}`,
          { token }
        ),
        api.get<{ items: Transaction[]; pagination: any }>(
          `/api/finance/transactions?${qs.toString()}&limit=8`,
          { token }
        ),
      ]);

      setSummary(summaryRes.data || null);
      setExpenses(expRes.data || null);
      // Backend returns { items, pagination } — handle both shapes
      const txData: any = txRes.data;
      setTransactions(Array.isArray(txData) ? txData : txData?.items || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load finance data'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // ---- Derived values ----
  const totalStats = summary?.total || { revenue: 0, cost: 0, profit: 0 };
  const revenue = Number(totalStats.revenue || 0);
  const cost = Number(totalStats.cost || 0);
  const profit = Number(totalStats.profit || 0);
  const expenseTotal = Number(expenses?.grandTotal || 0);
  const netProfit = profit - expenseTotal;
  const pendingCOD = Number(summary?.pendingCOD?.amount || 0);
  const pendingCODCount = Number(summary?.pendingCOD?.count || 0);

  // Channel breakdown
  const channelData = [
    { name: 'Online', value: Number(summary?.online?.revenue || 0) },
    { name: 'POS', value: Number(summary?.offline?.revenue || 0) },
  ].filter((d) => d.value > 0);

  // Payment method breakdown
  const paymentData = summary?.byPaymentMethod
    ? Object.entries(summary.byPaymentMethod)
        .map(([name, value]) => ({ name, value: Number(value) }))
        .filter((d) => d.value > 0)
    : [];

  // Expense categories
  const expenseData = (expenses?.byCategory || []).map((c) => ({
    name: c.category.toLowerCase().replace(/_/g, ' '),
    value: c.total,
    category: c.category,
  }));

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header — mobile stack */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">💰</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Finance
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Money in, money out — all in one place
            </p>
          </div>
        </div>

        <Link
          href="/admin/finance/expenses/new"
          className="w-full sm:w-auto text-center px-4 py-3 sm:py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition min-h-[44px] flex items-center justify-center"
        >
          + Add Expense
        </Link>
      </div>

      {/* Range selector — horizontal scroll on mobile */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-4 sm:mb-5 inline-flex gap-1 max-w-full overflow-x-auto">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-md text-xs font-medium transition ${
              range === opt.key
                ? 'bg-[#0F2A5C] text-white'
                : 'text-[#5A6270] hover:bg-[#F1F3F6]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Stat cards — 2 cols mobile, 4 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          label="Revenue"
          value={revenue}
          color="emerald"
          hint={`Cost ${tk(cost)}`}
        />
        <StatCard
          label="Expenses"
          value={expenseTotal}
          color="red"
          hint={`${expenses?.byCategory?.length || 0} categories`}
        />
        <StatCard
          label="Net Profit"
          value={netProfit}
          color="navy"
          hint={netProfit >= 0 ? 'Profitable' : 'Loss'}
        />
        <StatCard
          label="Pending COD"
          value={pendingCOD}
          color="amber"
          hint={`${pendingCODCount} order${pendingCODCount !== 1 ? 's' : ''} in transit`}
        />
      </div>

      {/* Channel + Payment breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-5">
        {/* Channel bar chart */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Revenue by Channel
          </h2>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#8A8F98]">
              Loading...
            </div>
          ) : channelData.length === 0 || channelData.every((d) => d.value === 0) ? (
            <div className="h-56 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">📊</div>
              <p>No revenue in this period</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={channelData}>
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
                    formatter={(v: any) => [`৳${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="value" fill="#0F2A5C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Payment method pie */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Payment Methods
          </h2>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#8A8F98]">
              Loading...
            </div>
          ) : paymentData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">💳</div>
              <p>No payments yet</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div style={{ width: 160, height: 160 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={2}
                    >
                      {paymentData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
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
              <div className="flex-1 space-y-1.5 w-full">
                {paymentData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-[#5A6270] font-medium">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#0F2A5C]">{tk(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom grid — Expenses + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Expense breakdown pie */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
              Expenses
            </h2>
            <Link
              href="/admin/finance/expenses"
              className="text-xs text-[#0F2A5C] hover:underline font-medium"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#8A8F98]">
              Loading...
            </div>
          ) : expenseData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">📊</div>
              <p>No expenses yet</p>
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={42}
                      paddingAngle={2}
                    >
                      {expenseData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
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
                {expenseData.slice(0, 5).map((item, i) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-[#5A6270] capitalize truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#0F2A5C] whitespace-nowrap">
                      {tk(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
              Recent Transactions
            </h2>
            <Link
              href="/admin/finance/transactions"
              className="text-xs text-[#0F2A5C] hover:underline font-medium"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-[#8A8F98]">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm text-[#8A8F98]">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F3F6] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#0F2A5C]">
                      {t.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[10px] text-[#8A8F98] truncate">
                      {t.order?.orderNumber || t.reference || '—'} ·{' '}
                      {formatDateTime(t.createdAt).split(',')[0]}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-[#0F2A5C]">
                      {tk(t.amount)}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        t.status === 'COMPLETED' || t.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
  color,
  hint,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'red' | 'navy' | 'amber';
  hint?: string;
}) {
  const colors = {
    emerald: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
            {label}
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#0F2A5C] leading-tight">
            {tk(value)}
          </div>
          {hint && (
            <div className="text-[9px] sm:text-[10px] text-[#8A8F98] truncate mt-0.5">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}