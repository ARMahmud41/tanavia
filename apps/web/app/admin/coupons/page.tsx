'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string | number;
  minSpend: string | number;
  maxDiscount?: string | number | null;
  usageLimit?: number | null;
  usedCount: number;
  perUser: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  exhausted: number;
  totalUsed: number;
}

// ============================================
// Page
// ============================================
export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'expired' | 'exhausted'>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (status !== 'all') qs.set('status', status);
      if (search.trim()) qs.set('search', search.trim());

      const [listRes, statsRes] = await Promise.all([
        api.get<Coupon[]>(`/api/coupons?${qs.toString()}`, { token }),
        api.get<Stats>('/api/coupons/stats', { token }),
      ]);
      setCoupons(listRes.data || []);
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
  }, [status]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function statusColor(c: Coupon): string {
    if (!c.active) return 'bg-gray-100 text-gray-600 border-gray-300';
    if (c.expiresAt && new Date(c.expiresAt) < new Date())
      return 'bg-red-50 text-red-700 border-red-200';
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit)
      return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  function statusLabel(c: Coupon): string {
    if (!c.active) return 'Inactive';
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'Expired';
    if (c.usageLimit !== null && c.usedCount >= c.usageLimit)
      return 'Exhausted';
    return 'Active';
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header — mobile stack */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">🎟️</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Coupons
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Discount codes and promotions
            </p>
          </div>
        </div>
        <Link
          href="/admin/coupons/new"
          className="w-full sm:w-auto text-center px-4 py-3 sm:py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition min-h-[44px] flex items-center justify-center"
        >
          + New Coupon
        </Link>
      </div>

      {/* Stats — 2 cols mobile, 5 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-5">
        <StatCard label="Total" value={stats?.total ?? 0} color="blue" />
        <StatCard label="Active" value={stats?.active ?? 0} color="green" />
        <StatCard label="Expired" value={stats?.expired ?? 0} color="red" />
        <StatCard label="Exhausted" value={stats?.exhausted ?? 0} color="amber" />
        <StatCard
          label="Total Used"
          value={stats?.totalUsed ?? 0}
          color="purple"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Filters — mobile stack */}
      <div className="rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 bg-white shadow-sm flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coupon code..."
              className="w-full rounded-lg px-3.5 py-2.5 pl-10 text-sm border border-transparent bg-[#F1F3F6] focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
              🔍
            </span>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] min-h-[44px]"
          >
            Search
          </button>
        </form>

        {/* Status chips — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {(['all', 'active', 'inactive', 'expired', 'exhausted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                status === f
                  ? 'text-white bg-[#0F2A5C] shadow'
                  : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Coupons */}
      {loading ? (
        <div className="p-16 text-center text-sm text-[#8A8F98] bg-white rounded-lg">
          Loading coupons...
        </div>
      ) : coupons.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-white rounded-lg">
          <div className="text-4xl mb-3">🎟️</div>
          <p className="mb-2 text-[#0F2A5C] font-medium">No coupons yet</p>
          <p className="text-sm text-[#8A8F98] mb-5">
            Create discount codes to boost sales
          </p>
          <Link
            href="/admin/coupons/new"
            className="inline-block px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] min-h-[44px]"
          >
            + Create Coupon
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table (hidden on mobile) */}
          <div className="hidden lg:block rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                    <th className="text-left px-4 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Discount</th>
                    <th className="text-right px-4 py-3 font-medium">Min Spend</th>
                    <th className="text-center px-4 py-3 font-medium">Usage</th>
                    <th className="text-center px-4 py-3 font-medium">Expires</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-t border-[#E8EBF0] hover:bg-[#F7F8FA]">
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-semibold text-[#0F2A5C]">
                          {c.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#0F2A5C]">
                          {c.type === 'PERCENT'
                            ? `${Number(c.value)}%`
                            : tk(Number(c.value))}
                        </span>
                        {c.maxDiscount && Number(c.maxDiscount) > 0 && (
                          <div className="text-[10px] text-[#8A8F98]">
                            Max {tk(Number(c.maxDiscount))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        {tk(Number(c.minSpend))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium">
                          {c.usedCount}
                          {c.usageLimit !== null ? ` / ${c.usageLimit}` : ''}
                        </span>
                        {c.usageLimit !== null && (
                          <div className="mt-1 h-1 rounded-full bg-[#F1F3F6] overflow-hidden">
                            <div
                              className="h-full bg-[#0F2A5C] rounded-full"
                              style={{
                                width: `${Math.min(100, (c.usedCount / c.usageLimit) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-[#8A8F98]">
                        {c.expiresAt ? formatDateTime(c.expiresAt).split(',')[0] : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor(c)}`}
                        >
                          ● {statusLabel(c)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/coupons/${c.id}`}
                          className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A5C] text-white font-medium hover:bg-[#0A1F45] inline-block"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards (hidden on desktop) */}
          <div className="lg:hidden space-y-3">
            {coupons.map((c) => (
              <Link
                key={c.id}
                href={`/admin/coupons/${c.id}`}
                className="block bg-white rounded-lg p-4 shadow-sm border border-[#E8EBF0] active:bg-[#F7F8FA] transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-base font-bold text-[#0F2A5C] truncate">
                      {c.code}
                    </div>
                    <div className="text-xs text-[#8A8F98] mt-0.5">
                      {c.type === 'PERCENT'
                        ? `${Number(c.value)}% off`
                        : `${tk(Number(c.value))} off`}
                      {Number(c.minSpend) > 0 && ` · Min ${tk(Number(c.minSpend))}`}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor(c)}`}
                  >
                    {statusLabel(c)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#E8EBF0]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#8A8F98]">
                      Used
                    </div>
                    <div className="text-sm font-semibold text-[#0F2A5C]">
                      {c.usedCount}
                      {c.usageLimit !== null ? ` / ${c.usageLimit}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#8A8F98]">
                      Expires
                    </div>
                    <div className="text-sm text-[#0F2A5C]">
                      {c.expiresAt ? formatDateTime(c.expiresAt).split(',')[0] : 'Never'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
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
  className = '',
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  className?: string;
}) {
  const colors = {
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    green: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-700',
  };
  return (
    <div className={`rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0] ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-1 h-8 sm:h-10 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
            {label}
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#0F2A5C] leading-tight">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}