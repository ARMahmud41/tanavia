'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface CashDrawer {
  id: string;
  userId: string;
  user?: { id: string; name: string; email: string; role: string } | null;
  openingAmount: string | number;
  closingAmount?: string | number | null;
  cashSales?: string | number;
  cashRefunds?: string | number;
  cashOut?: string | number;
  expected?: string | number;
  difference?: string | number | null;
  openedAt: string;
  closedAt?: string | null;
  notes?: string | null;
  status?: string;
}

export default function CashShiftsPage() {
  const [drawers, setDrawers] = useState<CashDrawer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<any>('/api/finance/cash-drawers?limit=50', { token });
      const data = res.data;
      const items = Array.isArray(data) ? data : data?.items || [];
      setDrawers(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDrawers = drawers.filter((d) => !d.closedAt);
  const totalDiff = drawers
    .filter((d) => d.closedAt && d.difference != null)
    .reduce((sum, d) => sum + Number(d.difference || 0), 0);
  const shiftsWithDiff = drawers.filter(
    (d) => d.closedAt && d.difference != null && Math.abs(Number(d.difference)) > 0.01
  ).length;

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
            { key: 'cash', label: 'Cash and shifts', href: '/admin/finance/cash-shifts', active: true },
            { key: 'tx', label: 'Transactions', href: '/admin/finance/transactions' },
          ].map((t) =>
            t.active ? (
              <span key={t.key} className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold bg-[#0F2A5C] text-white whitespace-nowrap flex items-center gap-2">{t.label}</span>
            ) : (
              <Link key={t.key} href={t.href} className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium text-[#5A6270] hover:bg-[#F1F3F6] whitespace-nowrap flex items-center gap-2">
                {t.label}
                {t.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">{t.badge}</span>}
              </Link>
            )
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] px-4 sm:px-5 py-3 mb-5 flex items-start gap-2">
        <span className="text-[#8A8F98]">ⓘ</span>
        <p className="text-xs text-[#8A8F98]">
          Expected cash = opening + cash sales − cash refunds − cash out. At close, staff count the drawer and the difference is recorded. Differences are never erased.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <Stat label="Open shifts" value={String(openDrawers.length)} color="emerald" />
        <Stat label="Total shifts" value={String(drawers.length)} color="navy" />
        <Stat label="Shifts with diff" value={String(shiftsWithDiff)} color="amber" />
        <Stat label="Net difference" value={tk(totalDiff)} color={totalDiff < 0 ? 'red' : 'emerald'} />
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[#E8EBF0]">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">Cash and shifts</h2>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-[#8A8F98]">Loading shifts...</div>
        ) : drawers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-3xl mb-2">💵</div>
            <p className="text-sm text-[#0F2A5C] font-medium">No shifts yet</p>
            <p className="text-xs text-[#8A8F98] mt-1">Cash drawer shifts will appear here</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                    <th className="text-left px-4 py-3 font-semibold">Shift</th>
                    <th className="text-left px-3 py-3 font-semibold">Staff</th>
                    <th className="text-right px-3 py-3 font-semibold">Opening</th>
                    <th className="text-right px-3 py-3 font-semibold">Cash sales</th>
                    <th className="text-right px-3 py-3 font-semibold">Refunds</th>
                    <th className="text-right px-3 py-3 font-semibold">Cash out</th>
                    <th className="text-right px-3 py-3 font-semibold">Expected</th>
                    <th className="text-right px-3 py-3 font-semibold">Counted</th>
                    <th className="text-right px-3 py-3 font-semibold">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {drawers.map((d) => {
                    const diff = d.difference != null ? Number(d.difference) : null;
                    const hasDiff = diff != null && Math.abs(diff) > 0.01;
                    const shiftNum = `SH-${d.id.slice(-3).toUpperCase()}`;
                    const isOpen = !d.closedAt;
                    return (
                      <tr key={d.id} className="border-t border-[#F1F3F6] hover:bg-[#F7F8FA]">
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-semibold text-[#0F2A5C]">{shiftNum}</div>
                          <div className="text-[10px] text-[#8A8F98]">{isOpen ? 'Open now' : formatDateTime(d.closedAt!).split(',')[0]}</div>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#5A6270]">{d.user?.name || '—'}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs">{tk(d.openingAmount)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs">{tk(d.cashSales || 0)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-red-600">{Number(d.cashRefunds || 0) > 0 ? `−${tk(d.cashRefunds)}` : tk(0)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-red-600">{Number(d.cashOut || 0) > 0 ? `−${tk(d.cashOut)}` : tk(0)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold text-[#0F2A5C]">{tk(d.expected || 0)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-xs font-semibold">{isOpen ? '—' : tk(d.closingAmount || 0)}</td>
                        <td className="px-3 py-3 text-right">
                          {isOpen ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">● Not closed</span>
                          ) : hasDiff ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${diff! < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              {diff! < 0 ? 'Short' : 'Over'} {tk(Math.abs(diff!))}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">● Matches</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-[#F1F3F6]">
              {drawers.map((d) => {
                const diff = d.difference != null ? Number(d.difference) : null;
                const hasDiff = diff != null && Math.abs(diff) > 0.01;
                const isOpen = !d.closedAt;
                const shiftNum = `SH-${d.id.slice(-3).toUpperCase()}`;
                return (
                  <div key={d.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-mono text-xs font-semibold text-[#0F2A5C]">{shiftNum}</div>
                        <div className="text-[11px] text-[#8A8F98]">{isOpen ? 'Open now' : formatDateTime(d.closedAt!).split(',')[0]}</div>
                        <div className="text-xs text-[#5A6270] mt-0.5">{d.user?.name || '—'}</div>
                      </div>
                      {isOpen ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Open</span>
                      ) : hasDiff ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${diff! < 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {diff! < 0 ? 'Short' : 'Over'} {tk(Math.abs(diff!))}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Matches</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F1F3F6]">
                      <MiniStat label="Open" value={tk(d.openingAmount)} />
                      <MiniStat label="Sales" value={tk(d.cashSales || 0)} />
                      <MiniStat label="Expected" value={tk(d.expected || 0)} />
                      {!isOpen && (
                        <>
                          <MiniStat label="Counted" value={tk(d.closingAmount || 0)} />
                          <MiniStat label="Refunds" value={tk(d.cashRefunds || 0)} />
                          <MiniStat label="Cash out" value={tk(d.cashOut || 0)} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: 'navy' | 'emerald' | 'amber' | 'red' }) {
  const colors = { navy: 'from-[#0F2A5C] to-[#1F4E79]', emerald: 'from-emerald-500 to-emerald-700', amber: 'from-amber-500 to-amber-600', red: 'from-red-500 to-red-700' };
  return (
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">{label}</div>
          <div className="text-base sm:text-xl font-bold text-[#0F2A5C] leading-tight truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] uppercase tracking-wide text-[#8A8F98]">{label}</div>
      <div className="text-xs font-bold text-[#0F2A5C] tabular-nums">{value}</div>
    </div>
  );
}