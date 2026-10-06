'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface Expense {
  id: string;
  category: string;
  amount: string | number;
  paidFrom: string;
  note?: string | null;
  spentAt: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

interface ExpenseSummary {
  byCategory: Array<{ category: string; total: number; count: number }>;
  grandTotal: number;
}

interface PendingCashOut {
  id: string;
  amount: string | number;
  description?: string | null;
  reason?: string | null;
  category?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'all';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

const CATEGORIES = [
  { value: 'ALL', label: 'All' },
  { value: 'RENT', label: 'Rent' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'SHOP_SUPPLIES', label: 'Shop supplies' },
  { value: 'OTHER', label: 'Other' },
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

export default function ExpensesPage() {
  const [range, setRange] = useState<RangeKey>('month');
  const [category, setCategory] = useState('ALL');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [pendingCashOuts, setPendingCashOuts] = useState<PendingCashOut[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    category: 'PACKAGING',
    amount: '',
    paidFrom: 'CASH',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const { from, to } = buildRange(range);
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      if (category !== 'ALL') qs.set('category', category);

      const [listRes, sumRes, pendingRes] = await Promise.all([
        api.get<any>(`/api/finance/expenses?${qs.toString()}`, { token }),
        api.get<ExpenseSummary>(`/api/finance/expenses/summary?${qs.toString()}`, { token }),
        api.get<any>('/api/finance/cash-outs/pending', { token }),
      ]);

      const listData = listRes.data;
      const items = Array.isArray(listData) ? listData : listData?.items || [];
      setExpenses(items);
      setSummary(sumRes.data || null);

      const pendingData = pendingRes.data;
      const pendingItems = Array.isArray(pendingData)
        ? pendingData
        : pendingData?.items || [];
      setPendingCashOuts(pendingItems);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [range, category]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.amount || Number(addForm.amount) <= 0) return;
    setSaving(true);
    try {
      const token = getToken() || undefined;
      await api.post('/api/finance/expenses', {
        category: addForm.category,
        amount: Number(addForm.amount),
        paidFrom: addForm.paidFrom,
        note: addForm.note.trim() || undefined,
      }, { token });
      setShowAdd(false);
      setAddForm({ category: 'PACKAGING', amount: '', paidFrom: 'CASH', note: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/finance/expenses/${id}`, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  async function handleApprove(id: string) {
    setActing(id);
    try {
      const token = getToken() || undefined;
      await api.patch(`/api/finance/cash-outs/${id}/approve`, {}, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to approve');
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Reason for rejection:');
    if (!reason?.trim()) return;
    setActing(id);
    try {
      const token = getToken() || undefined;
      await api.patch(`/api/finance/cash-outs/${id}/reject`, { reason }, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject');
    } finally {
      setActing(null);
    }
  }

  const totalSpent = summary?.grandTotal || 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">💰</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">Finance</h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">Money in, money out, all in one place</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] min-h-[44px]"
        >
          + Add expense
        </button>
      </div>

      {/* Tab bar */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-1.5 mb-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'overview', label: 'Overview', href: '/admin/finance' },
            { key: 'pnl', label: 'Profit and loss', href: '/admin/finance/pnl' },
            { key: 'expenses', label: 'Expenses', href: '/admin/finance/expenses', active: true, badge: pendingCashOuts.length },
            { key: 'cash', label: 'Cash and shifts', href: '/admin/finance/cash-shifts' },
            { key: 'tx', label: 'Transactions', href: '/admin/finance/transactions' },
          ].map((t) =>
            t.active ? (
              <span key={t.key} className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold bg-[#0F2A5C] text-white whitespace-nowrap flex items-center gap-2">
                {t.label}
                {t.badge ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.badge}</span> : null}
              </span>
            ) : (
              <Link key={t.key} href={t.href} className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#5A6270] hover:bg-[#F1F3F6] whitespace-nowrap flex items-center gap-2">
                {t.label}
                {t.badge ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.badge}</span> : null}
              </Link>
            )
          )}
        </div>
      </div>

      {/* Range chips */}
      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-[#E8EBF0] mb-5 w-fit">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${range === r.key ? 'bg-[#0F2A5C] text-white' : 'text-[#5A6270] hover:bg-[#F1F3F6]'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Waiting for approval — REAL */}
      {pendingCashOuts.length > 0 && (
        <div className="rounded-lg bg-white shadow-sm border border-amber-200 mb-5">
          <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-amber-200">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-semibold text-amber-900 flex items-center gap-2">
                <span>⏰</span>
                Waiting for your approval
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {pendingCashOuts.length}
                </span>
              </h2>
              <p className="text-xs text-amber-700 mt-1">
                ⓘ Cash taken from the drawer by staff. It is not counted as an expense until you approve it.
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#F1F3F6]">
            {pendingCashOuts.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0F2A5C]">{tk(p.amount)}</span>
                    <span className="text-xs text-[#5A6270] truncate">{p.description || p.reason || 'Cash out'}</span>
                  </div>
                  <div className="text-[11px] text-[#8A8F98] mt-0.5">
                    {p.user?.name || 'Staff'} · {formatDateTime(p.createdAt)}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(p.id)}
                    disabled={acting === p.id}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {acting === p.id ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(p.id)}
                    disabled={acting === p.id}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left: by category */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">By category</h2>
            <span className="text-xs text-[#8A8F98]">{tk(totalSpent)} total</span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#8A8F98]">Loading...</div>
          ) : !summary?.byCategory?.length ? (
            <div className="py-8 text-center text-xs text-[#8A8F98]">No expenses in this period.</div>
          ) : (
            <div className="space-y-3">
              {summary.byCategory.map((cat) => {
                const pct = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#5A6270] font-medium capitalize">
                        {cat.category.toLowerCase().replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-[#0F2A5C]">{tk(cat.total)}</span>
                    </div>
                    <div className="h-1.5 bg-[#F1F3F6] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#0F2A5C] to-[#2F7D7A] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: list */}
        <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] lg:col-span-2 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[#E8EBF0] overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${category === c.value ? 'bg-[#0F2A5C] text-white' : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E8EBF0]'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-sm text-[#8A8F98]">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-3xl mb-2">💵</div>
              <p className="text-sm text-[#0F2A5C] font-medium">No expenses</p>
              <p className="text-xs text-[#8A8F98] mt-1">Nothing recorded in this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                    <th className="text-left px-4 py-3 font-semibold">When</th>
                    <th className="text-left px-3 py-3 font-semibold">What</th>
                    <th className="text-left px-3 py-3 font-semibold">Category</th>
                    <th className="text-left px-3 py-3 font-semibold">Paid from</th>
                    <th className="text-left px-3 py-3 font-semibold">By</th>
                    <th className="text-right px-3 py-3 font-semibold">Amount</th>
                    <th className="text-right px-3 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA]">
                      <td className="px-4 py-3 text-xs text-[#8A8F98] whitespace-nowrap">
                        {formatDateTime(e.spentAt || e.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#0F2A5C] truncate max-w-[200px]">{e.note || '—'}</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F3F6] text-[#5A6270] font-medium capitalize">
                          {e.category.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#8A8F98] uppercase">{e.paidFrom}</td>
                      <td className="px-3 py-3 text-xs text-[#5A6270]">{e.user?.name || 'Admin'}</td>
                      <td className="px-3 py-3 text-right font-semibold text-red-600 tabular-nums">−{tk(e.amount)}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => handleDelete(e.id)} className="text-[10px] text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="w-full max-w-md rounded-lg p-5 bg-white" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">Add expense</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">Category</label>
                <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]">
                  {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">Amount</label>
                <input type="number" step="0.01" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  placeholder="0.00" className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">Paid from</label>
                <select value={addForm.paidFrom} onChange={(e) => setAddForm({ ...addForm, paidFrom: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]">
                  <option value="CASH">Cash drawer</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">Note (optional)</label>
                <textarea value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                  rows={2} className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] resize-none" />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] min-h-[44px]">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] disabled:opacity-50 min-h-[44px]">
                {saving ? 'Adding...' : 'Add expense'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}