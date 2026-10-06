'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface Settlement {
  id: string;
  settlementNo: string;
  courier: { id: string; name: string; slug: string; logo?: string | null };
  periodFrom: string;
  periodTo: string;
  grossCOD: string | number;
  netPayout: string | number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'DISPUTED';
  createdAt: string;
  _count?: { orders: number };
}

interface Stats {
  pendingCount: number;
  completedCount: number;
  pendingAmount: number;
  completedAmount: number;
}

export default function SettlementsPage() {
  const [items, setItems] = useState<Settlement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'COMPLETED'>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = filter !== 'all' ? `?status=${filter}` : '';
      const [listRes, statsRes] = await Promise.all([
        api.get<Settlement[]>(`/api/settlements${qs}`, { token }),
        api.get<Stats>('/api/settlements/stats', { token }),
      ]);
      setItems(listRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courier"
            className="w-9 h-9 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6]"
          >
            ←
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#0F2A5C]">
              COD Settlements
            </h1>
            <p className="text-sm text-[#8A8F98]">
              Reconcile cash collected by couriers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card
          label="Pending"
          value={String(stats?.pendingCount ?? 0)}
          color="amber"
        />
        <Card
          label="Pending Amount"
          value={tk(stats?.pendingAmount ?? 0)}
          color="blue"
        />
        <Card
          label="Completed"
          value={String(stats?.completedCount ?? 0)}
          color="green"
        />
        <Card
          label="Total Received"
          value={tk(stats?.completedAmount ?? 0)}
          color="emerald"
        />
      </div>

      <div className="rounded-lg p-4 mb-5 bg-white shadow-sm">
        <div className="flex gap-2">
          {(['all', 'PENDING', 'COMPLETED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f
                  ? 'text-white bg-[#0F2A5C] shadow'
                  : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'PENDING' ? 'Pending' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#8A8F98]">
            Loading settlements...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">💰</div>
            <p className="text-[#0F2A5C] font-medium">No settlements yet</p>
            <p className="text-sm text-[#8A8F98]">
              Generate one after COD orders are delivered
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                <th className="text-left px-4 py-3 font-medium">Settlement</th>
                <th className="text-left px-4 py-3 font-medium">Courier</th>
                <th className="text-left px-4 py-3 font-medium">Period</th>
                <th className="text-right px-4 py-3 font-medium">Gross COD</th>
                <th className="text-right px-4 py-3 font-medium">Net Payout</th>
                <th className="text-center px-4 py-3 font-medium">Orders</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-[#E8EBF0]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F2A5C]">
                    {s.settlementNo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#F1F3F6] flex items-center justify-center overflow-hidden">
                        {s.courier?.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.courier.logo}
                            alt={s.courier.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-[#0F2A5C]">
                            {s.courier?.name.charAt(0) || 'C'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-[#0F2A5C]">
                        {s.courier?.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8A8F98]">
                    {formatDateTime(s.periodFrom).split(',')[0]} —{' '}
                    {formatDateTime(s.periodTo).split(',')[0]}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {tk(Number(s.grossCOD))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                    {tk(Number(s.netPayout))}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {s._count?.orders || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.status === 'PENDING' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        ● Pending
                      </span>
                    ) : s.status === 'COMPLETED' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        ● Paid
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        {s.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/courier/settlements/${s.id}`}
                      className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A5C] text-white font-medium hover:bg-[#0A1F45]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'amber' | 'blue' | 'green' | 'emerald';
}) {
  const colors = {
    amber: 'from-amber-500 to-amber-600',
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    green: 'from-emerald-500 to-emerald-700',
    emerald: 'from-emerald-400 to-emerald-600',
  };
  return (
    <div className="rounded-lg p-4 bg-white shadow-sm border border-[#E8EBF0]">
      <div className="flex items-center gap-3">
        <div
          className={`w-1 h-10 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            {label}
          </div>
          <div className="text-xl font-bold text-[#0F2A5C]">{value}</div>
        </div>
      </div>
    </div>
  );
}