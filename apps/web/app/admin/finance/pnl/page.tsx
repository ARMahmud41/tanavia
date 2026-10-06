'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

interface OrderStats {
  revenue: number;
  cost: number;
  profit: number;
}

interface FinanceSummary {
  online: OrderStats;
  offline: OrderStats;
  total: OrderStats;
}

interface ExpenseSummary {
  byCategory: Array<{ category: string; total: number; count: number }>;
  grandTotal: number;
}

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

function buildRange(range: RangeKey): { from?: string; to?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const from = new Date();
  switch (range) {
    case 'today': from.setHours(0, 0, 0, 0); break;
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      from.setDate(now.getDate() - diff);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': from.setDate(1); from.setHours(0, 0, 0, 0); break;
    case 'year': from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function buildPreviousRange(range: RangeKey): { from?: string; to?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const from = new Date();
  switch (range) {
    case 'today':
      from.setDate(now.getDate() - 1); from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1); to.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      from.setDate(now.getDate() - diff - 7); from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - diff - 1); to.setHours(23, 59, 59, 999);
      break;
    }
    case 'month': {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setTime(firstOfThisMonth.getTime());
      from.setMonth(from.getMonth() - 1);
      to.setTime(firstOfThisMonth.getTime());
      to.setDate(0); to.setHours(23, 59, 59, 999);
      break;
    }
    case 'year':
      from.setFullYear(now.getFullYear() - 1, 0, 1); from.setHours(0, 0, 0, 0);
      to.setFullYear(now.getFullYear() - 1, 11, 31); to.setHours(23, 59, 59, 999);
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function PnlPage() {
  const [range, setRange] = useState<RangeKey>('month');
  const [current, setCurrent] = useState<{ summary: FinanceSummary; expenses: ExpenseSummary } | null>(null);
  const [previous, setPrevious] = useState<{ summary: FinanceSummary; expenses: ExpenseSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const { from, to } = buildRange(range);
      const prev = buildPreviousRange(range);

      const curQs = new URLSearchParams();
      if (from) curQs.set('from', from);
      if (to) curQs.set('to', to);

      const prevQs = new URLSearchParams();
      if (prev.from) prevQs.set('from', prev.from);
      if (prev.to) prevQs.set('to', prev.to);

      const [curSum, curExp, prevSum, prevExp] = await Promise.all([
        api.get<FinanceSummary>(`/api/finance/summary?${curQs.toString()}`, { token }),
        api.get<ExpenseSummary>(`/api/finance/expenses/summary?${curQs.toString()}`, { token }),
        range !== 'all'
          ? api.get<FinanceSummary>(`/api/finance/summary?${prevQs.toString()}`, { token })
          : Promise.resolve({ data: null as any }),
        range !== 'all'
          ? api.get<ExpenseSummary>(`/api/finance/expenses/summary?${prevQs.toString()}`, { token })
          : Promise.resolve({ data: null as any }),
      ]);

      setCurrent({
        summary: curSum.data || { online: { revenue: 0, cost: 0, profit: 0 }, offline: { revenue: 0, cost: 0, profit: 0 }, total: { revenue: 0, cost: 0, profit: 0 } },
        expenses: curExp.data || { byCategory: [], grandTotal: 0 },
      });

      if (prevSum.data) {
        setPrevious({
          summary: prevSum.data,
          expenses: prevExp.data || { byCategory: [], grandTotal: 0 },
        });
      } else {
        setPrevious(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const c = current?.summary;
  const cExp = current?.expenses;
  const netSales = Number(c?.total.revenue || 0);
  const costOfGoods = Number(c?.total.cost || 0);
  const grossProfit = Number(c?.total.profit || 0);
  const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const expenses = Number(cExp?.grandTotal || 0);
  const netProfit = grossProfit - expenses;
  const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  const p = previous?.summary;
  const pExp = previous?.expenses;
  const pNetSales = Number(p?.total.revenue || 0);
  const pCostOfGoods = Number(p?.total.cost || 0);
  const pGrossProfit = Number(p?.total.profit || 0);
  const pExpenses = Number(pExp?.grandTotal || 0);
  const pNetProfit = pGrossProfit - pExpenses;

  function pct(cur: number, prev: number): string {
    if (prev === 0) return cur === 0 ? '—' : '↑ 100%';
    const diff = ((cur - prev) / Math.abs(prev)) * 100;
    const sign = diff > 0 ? '↑' : diff < 0 ? '↓' : '—';
    return `${sign} ${Math.abs(diff).toFixed(0)}%`;
  }

  function pctColor(cur: number, prev: number, invert = false): string {
    if (prev === 0 && cur === 0) return 'text-[#8A8F98]';
    const diff = cur - prev;
    if (diff === 0) return 'text-[#8A8F98]';
    const good = invert ? diff < 0 : diff > 0;
    return good ? 'text-emerald-600' : 'text-red-600';
  }

  const rows: Array<{ label: string; cur: number; prev: number; bold?: boolean; color?: string; hint?: string }> = [
    { label: 'Sales', cur: netSales, prev: pNetSales, color: 'text-[#0F2A5C]' },
    { label: 'Net sales', cur: netSales, prev: pNetSales, bold: true },
    { label: 'Cost of goods sold', cur: -costOfGoods, prev: -pCostOfGoods, color: 'text-red-700' },
    { label: 'Gross profit', cur: grossProfit, prev: pGrossProfit, bold: true, hint: `Margin ${grossMargin.toFixed(0)}%` },
    { label: 'Delivery fees', cur: 0, prev: 0, color: 'text-red-700' },
    { label: 'COD fees', cur: 0, prev: 0, color: 'text-red-700' },
    { label: 'Failed delivery losses', cur: 0, prev: 0, color: 'text-red-700' },
    ...(cExp?.byCategory || []).map((cat) => ({
      label: cat.category.charAt(0).toUpperCase() + cat.category.slice(1).toLowerCase(),
      cur: -cat.total,
      prev: -(pExp?.byCategory.find((x) => x.category === cat.category)?.total || 0),
      color: 'text-red-700',
    })),
    { label: 'Total expenses', cur: -expenses, prev: -pExpenses, bold: true, color: 'text-red-700' },
    { label: 'Net profit', cur: netProfit, prev: pNetProfit, bold: true, hint: `Margin ${netMargin.toFixed(0)}%` },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
          <span className="text-white font-bold text-lg sm:text-xl">💰</span>
        </div>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">Finance</h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">Money in, money out, all in one place</p>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Overview', href: '/admin/finance' },
            { key: 'pnl', label: 'Profit and loss', href: '/admin/finance/pnl', active: true },
            { key: 'expenses', label: 'Expenses', href: '/admin/finance/expenses', badge: 2 },
            { key: 'cash', label: 'Cash and shifts', href: '/admin/finance/cash-shifts' },
            { key: 'tx', label: 'Transactions', href: '/admin/finance/transactions' },
          ].map((t) =>
            t.active ? (
              <span key={t.key} className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold bg-[#0F2A5C] text-white whitespace-nowrap">{t.label}</span>
            ) : (
              <Link key={t.key} href={t.href} className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#5A6270] hover:bg-[#F1F3F6] whitespace-nowrap flex items-center gap-2">
                {t.label}
                {t.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.badge}</span>}
              </Link>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-5">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-[#E8EBF0]">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${range === r.key ? 'bg-[#0F2A5C] text-white' : 'text-[#5A6270] hover:bg-[#F1F3F6]'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0F2A5C] bg-white border border-[#E8EBF0] hover:bg-[#F1F3F6]">⬇ Export CSV</button>
          <button className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0F2A5C] bg-white border border-[#E8EBF0] hover:bg-[#F1F3F6]">⬇ Export PDF</button>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-[#E8EBF0]">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">Profit and loss</h2>
            <p className="text-xs text-[#8A8F98] mt-0.5">ⓘ Revenue counts when the cash is in — COD sale counts once delivered.</p>
          </div>
          <span className="text-xs font-medium text-[#8A8F98]">{RANGES.find((r) => r.key === range)?.label}</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-[#8A8F98]">Loading P&L...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                  <th className="text-left px-4 py-3 font-semibold">Line</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">This period</th>
                  {range !== 'all' && (
                    <>
                      <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Before</th>
                      <th className="text-right px-3 py-3 font-semibold whitespace-nowrap">Change</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-[#F1F3F6]">
                    <td className={`px-4 py-3 ${r.bold ? 'font-semibold text-[#0F2A5C]' : 'text-[#5A6270]'}`}>
                      {r.label}
                      {r.hint && <span className="text-[10px] text-[#8A8F98] ml-2 font-normal">{r.hint}</span>}
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums ${r.bold ? 'font-bold' : 'font-medium'} ${r.color || 'text-[#0F2A5C]'}`}>
                      {tk(r.cur)}
                    </td>
                    {range !== 'all' && (
                      <>
                        <td className="px-3 py-3 text-right tabular-nums text-[#8A8F98] text-xs">
                          {previous ? tk(r.prev) : '—'}
                        </td>
                        <td className={`px-3 py-3 text-right text-xs font-semibold ${previous ? pctColor(r.cur, r.prev, r.cur < 0) : 'text-[#8A8F98]'}`}>
                          {previous ? pct(r.cur, r.prev) : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && netSales > 0 && (
          <div className="px-4 sm:px-5 py-4 border-t border-[#E8EBF0] bg-[#F7F8FA]">
            <div className="flex items-center justify-between mb-2 text-xs">
              <div><span className="text-[#8A8F98]">Gross margin </span><strong className="text-[#0F2A5C]">{grossMargin.toFixed(0)}%</strong></div>
              <div><span className="text-[#8A8F98]">Net margin </span><strong className="text-[#0F2A5C]">{netMargin.toFixed(0)}%</strong></div>
            </div>
            <div className="h-2 rounded-full bg-[#E8EBF0] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0F2A5C] to-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, netMargin))}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}