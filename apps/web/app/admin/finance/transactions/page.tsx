'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string | number;
  method?: string | null;
  channel?: string | null;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
  order?: { id: string; orderNumber: string; customerName: string; channel: string } | null;
}

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all';
type TypeFilter = 'ALL' | 'SALE' | 'REFUND' | 'EXPENSE' | 'COURIER_COST';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' }, { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }, { key: 'all', label: 'All' },
];

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'ALL', label: 'All' }, { value: 'SALE', label: 'Sales' },
  { value: 'REFUND', label: 'Refunds' }, { value: 'EXPENSE', label: 'Expenses' },
  { value: 'COURIER_COST', label: 'Courier costs' },
];

function buildRange(range: RangeKey): { from?: string; to?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const from = new Date();
  switch (range) {
    case 'today': from.setHours(0, 0, 0, 0); break;
    case 'week': { const day = now.getDay(); const diff = day === 0 ? 6 : day - 1; from.setDate(now.getDate() - diff); from.setHours(0, 0, 0, 0); break; }
    case 'month': from.setDate(1); from.setHours(0, 0, 0, 0); break;
    case 'year': from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function typeBadge(type: string) {
  if (type === 'SALE') return { label: 'Sale', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (type === 'REFUND') return { label: 'Refund', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (type === 'EXPENSE') return { label: 'Expense', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (type === 'COURIER_COST') return { label: 'Courier', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: type, cls: 'bg-gray-50 text-gray-700 border-gray-200' };
}

export default function TransactionsPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<RangeKey>('today');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const { from, to } = buildRange(range);
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', '25');
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      if (type !== 'ALL') qs.set('type', type);
      if (search.trim()) qs.set('q', search.trim());

      const res = await api.get<any>(`/api/finance/transactions?${qs.toString()}`, { token });
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [range, type, search, page]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); load(); }

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
            { key: 'pnl', label: 'Profit and loss', href: '/admin/finance/pnl' },
            { key: 'expenses', label: 'Expenses', href: '/admin/finance/expenses', badge: 2 },
            { key: 'cash', label: 'Cash and shifts', href: '/admin/finance/cash-shifts' },
            { key: 'tx', label: 'Transactions', href: '/admin/finance/transactions', active: true },
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

      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-4">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-[#E8EBF0]">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => { setRange(r.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${range === r.key ? 'bg-[#0F2A5C] text-white' : 'text-[#5A6270] hover:bg-[#F1F3F6]'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <button className="px-3 py-2 rounded-lg text-xs font-semibold text-[#0F2A5C] bg-white border border-[#E8EBF0] hover:bg-[#F1F3F6]">
          ⬇ Export CSV
        </button>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-3 sm:p-4 mb-5 flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference (order no, return no)..."
              className="w-full rounded-lg px-3.5 py-2.5 pl-10 text-sm border border-transparent bg-[#F1F3F6] focus:outline-none focus:border-[#0F2A5C] min-h-[44px]" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">🔍</span>
          </div>
          <button type="submit" className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] min-h-[44px]">Search</button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} onClick={() => { setType(t.value); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${type === t.value ? 'bg-[#0F2A5C] text-white shadow' : 'bg-[#F1F3F6] text-[#8A8F98]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-[#8A8F98] flex items-center gap-2 pt-1 border-t border-[#E8EBF0]">
          <span>ⓘ</span>
          <span>Every sale, refund, expense and courier cost is one line here. Lines are never edited or deleted.</span>
        </div>
      </div>

      {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#8A8F98]">Loading transactions...</div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-3xl mb-2">💳</div>
            <p className="text-sm text-[#0F2A5C] font-medium">No transactions</p>
            <p className="text-xs text-[#8A8F98] mt-1">Try a different range or filter</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                    <th className="text-left px-4 py-3 font-semibold">When</th>
                    <th className="text-left px-3 py-3 font-semibold">Type</th>
                    <th className="text-left px-3 py-3 font-semibold">Reference</th>
                    <th className="text-left px-3 py-3 font-semibold">Method</th>
                    <th className="text-left px-3 py-3 font-semibold">By</th>
                    <th className="text-right px-3 py-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => {
                    const b = typeBadge(t.type);
                    const amt = Number(t.amount);
                    const isNegative = t.type === 'REFUND' || t.type === 'EXPENSE' || t.type === 'COURIER_COST';
                    return (
                      <tr key={t.id} className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA]">
                        <td className="px-4 py-3 text-xs text-[#8A8F98] whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${b.cls}`}>{b.label}</span>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <div className="text-[#0F2A5C] font-medium">{t.order?.orderNumber || t.reference || '—'}</div>
                          {t.order?.customerName && <div className="text-[10px] text-[#8A8F98]">{t.order.customerName}</div>}
                        </td>
                        <td className="px-3 py-3 text-xs text-[#5A6270] uppercase">{t.method || '—'}</td>
                        <td className="px-3 py-3 text-xs text-[#5A6270]">{t.user?.name || 'Admin'}</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                          {isNegative ? '−' : '+'}{tk(Math.abs(amt))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#E8EBF0] flex items-center justify-between">
                <div className="text-xs text-[#8A8F98]">Page {pagination.page} of {pagination.totalPages}</div>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] disabled:opacity-50">← Previous</button>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] disabled:opacity-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}