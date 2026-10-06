'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Settlement {
  id: string;
  settlementNo: string;
  courier: { id: string; name: string; slug: string; logo?: string | null };
  periodFrom: string;
  periodTo: string;
  grossCOD: string | number;
  netPayout: string | number;
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'DISPUTED';
  paidAt?: string | null;
  createdAt: string;
  _count?: { orders: number };
}

interface Stats {
  pendingCount: number;
  completedCount: number;
  pendingAmount: number;
  completedAmount: number;
}

// ============================================
// Page
// ============================================
export default function StaffCodSettlementPage() {
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
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load settlements';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--staff-primary)' }}
          >
            <span className="text-white font-bold text-xl">💰</span>
          </div>
          <div>
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              COD Settlements
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Cash collected by couriers (read-only)
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg p-3 mb-5 flex items-start gap-2 text-sm border"
        style={{
          background: 'rgba(31, 78, 121, 0.06)',
          color: 'var(--staff-primary)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <span>ℹ️</span>
        <span>
          You can view settlements. Only an admin can generate or mark them
          paid.
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Pending"
          value={String(stats?.pendingCount ?? 0)}
          color="amber"
        />
        <StatCard
          label="Pending Amount"
          value={tk(stats?.pendingAmount ?? 0)}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={String(stats?.completedCount ?? 0)}
          color="green"
        />
        <StatCard
          label="Total Received"
          value={tk(stats?.completedAmount ?? 0)}
          color="emerald"
        />
      </div>

      {/* Filter chips */}
      <div
        className="rounded-lg p-4 mb-5"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <div className="flex flex-wrap gap-2">
          {(['all', 'PENDING', 'COMPLETED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f ? 'text-white shadow' : ''
              }`}
              style={
                filter === f
                  ? { background: 'var(--staff-primary)' }
                  : {
                      background: 'var(--staff-tile-bg, #F1F3F6)',
                      color: 'var(--staff-muted)',
                    }
              }
            >
              {f === 'all' ? 'All' : f === 'PENDING' ? 'Pending' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        {loading ? (
          <div
            className="p-16 text-center text-sm"
            style={{ color: 'var(--staff-muted)' }}
          >
            Loading settlements...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">💰</div>
            <p
              className="mb-2"
              style={{ color: 'var(--staff-text)' }}
            >
              No settlements yet
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--staff-muted)' }}
            >
              COD settlements will appear here after admin generates them
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-xs uppercase tracking-wide"
                  style={{
                    background: 'var(--staff-tile-bg, #F1F4F9)',
                    color: 'var(--staff-muted)',
                  }}
                >
                  <th className="text-left px-4 py-3 font-medium">
                    Settlement
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Courier</th>
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-right px-4 py-3 font-medium">
                    Gross COD
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    Net Payout
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Orders</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t"
                    style={{ borderColor: 'var(--staff-border)' }}
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs font-semibold"
                      style={{ color: 'var(--staff-primary)' }}
                    >
                      {s.settlementNo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{ background: 'var(--staff-bg)' }}
                        >
                          {s.courier?.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.courier.logo}
                              alt={s.courier.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: 'var(--staff-primary)' }}
                            >
                              {s.courier?.name?.charAt(0) || 'C'}
                            </span>
                          )}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--staff-text)' }}
                        >
                          {s.courier?.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {formatDateTime(s.periodFrom).split(',')[0]} —{' '}
                      {formatDateTime(s.periodTo).split(',')[0]}
                    </td>
                    <td
                      className="px-4 py-3 text-right text-xs"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {tk(Number(s.grossCOD))}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {tk(Number(s.netPayout))}
                    </td>
                    <td
                      className="px-4 py-3 text-center text-xs"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {s._count?.orders || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.status === 'PENDING' ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          ● Pending
                        </span>
                      ) : s.status === 'COMPLETED' ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Paid
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                          {s.status}
                        </span>
                      )}
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
// Stat Card
// ============================================
function StatCard({
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
    <div
      className="rounded-lg p-4 border"
      style={{
        background: 'var(--staff-card)',
        borderColor: 'var(--staff-border)',
        boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-1 h-10 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div>
          <div
            className="text-[10px] uppercase tracking-wide font-medium"
            style={{ color: 'var(--staff-muted)' }}
          >
            {label}
          </div>
          <div
            className="text-xl font-bold"
            style={{ color: 'var(--staff-text)' }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}