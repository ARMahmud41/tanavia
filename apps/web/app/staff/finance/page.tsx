'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface MyTransaction {
  id: string;
  type: string;
  amount: string | number;
  method?: string | null;
  reference?: string | null;
  createdAt: string;
  order?: { orderNumber: string; customerName: string } | null;
}

interface MyShiftData {
  mySalesToday: number;
  mySalesCount: number;
  mySalesTotal: number;
  cashIShouldHave: number;
  refundsIGave: number;
  openingAmount?: number;
  salesByPaymentMethod?: Record<string, number>;
  transactions: MyTransaction[];
}

export default function StaffFinancePage() {
  const [data, setData] = useState<MyShiftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCashOut, setShowCashOut] = useState(false);
  const [cashOutForm, setCashOutForm] = useState({ amount: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<any>('/api/finance/my-shift', { token });
      const d = res.data || {};

      // Fetch my transactions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const txRes = await api.get<any>(
        `/api/finance/transactions?from=${today.toISOString()}&limit=50`,
        { token }
      );
      const txList = txRes.data;
      const transactions = Array.isArray(txList) ? txList : txList?.items || [];

      setData({
        mySalesToday: Number(d.todaySales?.total || 0),
        mySalesCount: Number(d.todaySales?.count || 0),
        mySalesTotal: Number(d.totalSales || 0),
        cashIShouldHave: Number(d.cashIShouldHave || 0),
        refundsIGave: Number(d.refundsIGave || 0),
        openingAmount: Number(d.openingAmount || 0),
        salesByPaymentMethod: d.salesByPaymentMethod || {},
        transactions,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCashOut(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(cashOutForm.amount);
    if (amt <= 0 || amt > 1000) {
      setError('Amount must be between ৳1 and ৳1,000');
      return;
    }
    setSaving(true);
    try {
      const token = getToken() || undefined;
      await api.post('/api/finance/cash-outs', {
        amount: amt,
        reason: cashOutForm.reason.trim() || 'Cash out',
      }, { token });
      setShowCashOut(false);
      setCashOutForm({ amount: '', reason: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record');
    } finally {
      setSaving(false);
    }
  }

  const paymentEntries = data?.salesByPaymentMethod
    ? Object.entries(data.salesByPaymentMethod).filter(([_, v]) => Number(v) > 0)
    : [];
  const maxPayment = paymentEntries.length > 0
    ? Math.max(...paymentEntries.map(([_, v]) => Number(v)))
    : 1;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--staff-primary)' }}
          >
            <span className="text-white font-bold text-lg sm:text-xl">💰</span>
          </div>
          <div>
            <h1
              className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold"
              style={{ color: 'var(--staff-text)' }}
            >
              Finance
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>
              Your shift: sales, cash and cash out
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            ● Shift open
          </span>
          <button
            onClick={() => setShowCashOut(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white min-h-[40px]"
            style={{ background: 'var(--staff-primary)' }}
          >
            💵 Record cash out
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Stats — 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard label="My sales today" value={String(data?.mySalesCount ?? 0)} hint="bills" color="navy" />
        <StatCard label="Sales total" value={tk(data?.mySalesToday ?? 0)} color="emerald" />
        <StatCard
          label="Cash I should have"
          value={tk(data?.cashIShouldHave ?? 0)}
          hint={data?.openingAmount ? `Opening ${tk(data.openingAmount)} + cash sales` : undefined}
          color="amber"
        />
        <StatCard label="Refunds I gave" value={tk(data?.refundsIGave ?? 0)} hint="From my drawer" color="red" />
      </div>

      {/* Alert: cash out waiting */}
      <div
        className="rounded-lg p-3 mb-5 flex items-start gap-2 text-xs border"
        style={{
          background: 'rgba(217, 119, 6, 0.08)',
          borderColor: 'rgba(217, 119, 6, 0.2)',
          color: '#92400e',
        }}
      >
        <span>⏰</span>
        <span>৳350 for Tea and snacks: waiting for the admin</span>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left: Payment methods */}
        <div
          className="rounded-lg p-4 sm:p-5 lg:col-span-1 border"
          style={{ background: 'var(--staff-card)', borderColor: 'var(--staff-border)' }}
        >
          <h2 className="font-serif text-base sm:text-lg font-semibold mb-4" style={{ color: 'var(--staff-text)' }}>
            My sales by payment
          </h2>
          {loading ? (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--staff-muted)' }}>Loading...</div>
          ) : paymentEntries.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--staff-muted)' }}>
              No sales yet today
            </div>
          ) : (
            <div className="space-y-3">
              {paymentEntries.map(([method, amount]) => {
                const pct = (Number(amount) / maxPayment) * 100;
                return (
                  <div key={method}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium capitalize" style={{ color: 'var(--staff-text)' }}>
                        {method.toLowerCase()}
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--staff-primary)' }}>
                        {tk(Number(amount))}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--staff-bg)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'var(--staff-primary)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div
            className="mt-4 pt-3 border-t text-[10px]"
            style={{ borderColor: 'var(--staff-border)', color: 'var(--staff-muted)' }}
          >
            ⓘ You see only your own shift. Profit, costs and other staff are admin-only.
          </div>
        </div>

        {/* Right: My transactions */}
        <div
          className="rounded-lg lg:col-span-2 overflow-hidden border"
          style={{ background: 'var(--staff-card)', borderColor: 'var(--staff-border)' }}
        >
          <div className="px-4 sm:px-5 py-4 border-b" style={{ borderColor: 'var(--staff-border)' }}>
            <h2 className="font-serif text-base sm:text-lg font-semibold" style={{ color: 'var(--staff-text)' }}>
              My transactions today
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm" style={{ color: 'var(--staff-muted)' }}>Loading...</div>
          ) : !data?.transactions?.length ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm font-medium" style={{ color: 'var(--staff-text)' }}>No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide" style={{ background: 'var(--staff-bg)', color: 'var(--staff-muted)' }}>
                    <th className="text-left px-4 py-3 font-semibold">When</th>
                    <th className="text-left px-3 py-3 font-semibold">Type</th>
                    <th className="text-left px-3 py-3 font-semibold">Reference</th>
                    <th className="text-left px-3 py-3 font-semibold">Method</th>
                    <th className="text-right px-3 py-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.slice(0, 15).map((t) => {
                    const amt = Number(t.amount);
                    const isNeg = t.type === 'REFUND' || t.type === 'EXPENSE' || t.type === 'COURIER_COST';
                    return (
                      <tr key={t.id} className="border-t" style={{ borderColor: 'var(--staff-border)' }}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--staff-muted)' }}>
                          {formatDateTime(t.createdAt)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              background: t.type === 'SALE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: t.type === 'SALE' ? '#065f46' : '#991b1b',
                            }}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs" style={{ color: 'var(--staff-text)' }}>
                          {t.order?.orderNumber || t.reference || '—'}
                        </td>
                        <td className="px-3 py-3 text-xs uppercase" style={{ color: 'var(--staff-muted)' }}>
                          {t.method || '—'}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-semibold tabular-nums ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}
                        >
                          {isNeg ? '−' : '+'}
                          {tk(Math.abs(amt))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cash out modal */}
      {showCashOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowCashOut(false)}
        >
          <form
            onSubmit={handleCashOut}
            className="w-full max-w-md rounded-lg p-5"
            style={{ background: 'var(--staff-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-semibold mb-1" style={{ color: 'var(--staff-text)' }}>
              Record cash out
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--staff-muted)' }}>
              Max ৳1,000. Waits for admin approval before it counts.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--staff-text)' }}>
                  Amount *
                </label>
                <input
                  type="number"
                  step="1"
                  max="1000"
                  value={cashOutForm.amount}
                  onChange={(e) => setCashOutForm({ ...cashOutForm, amount: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg px-3 py-2.5 text-sm border min-h-[44px]"
                  style={{ borderColor: 'var(--staff-border)', background: 'var(--staff-bg)', color: 'var(--staff-text)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--staff-text)' }}>
                  Reason *
                </label>
                <textarea
                  value={cashOutForm.reason}
                  onChange={(e) => setCashOutForm({ ...cashOutForm, reason: e.target.value })}
                  rows={2}
                  placeholder="e.g. Packaging tape"
                  className="w-full rounded-lg px-3 py-2 text-sm border resize-none min-h-[60px]"
                  style={{ borderColor: 'var(--staff-border)', background: 'var(--staff-bg)', color: 'var(--staff-text)' }}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCashOut(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border min-h-[44px]"
                style={{ borderColor: 'var(--staff-border)', color: 'var(--staff-text)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]"
                style={{ background: 'var(--staff-primary)' }}
              >
                {saving ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color: 'navy' | 'emerald' | 'amber' | 'red';
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-700',
  };
  return (
    <div
      className="rounded-lg p-3 sm:p-4 border"
      style={{ background: 'var(--staff-card)', borderColor: 'var(--staff-border)' }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide font-medium truncate" style={{ color: 'var(--staff-muted)' }}>
            {label}
          </div>
          <div className="text-base sm:text-xl font-bold leading-tight truncate" style={{ color: 'var(--staff-text)' }}>
            {value}
          </div>
          {hint && (
            <div className="text-[9px] truncate mt-0.5" style={{ color: 'var(--staff-muted)' }}>
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}