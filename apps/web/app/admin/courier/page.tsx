'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ============================================
// Types
// ============================================
interface Courier {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  active: boolean;
  isDefault: boolean;
  codEnabled: boolean;
  codFeePercent: string | number;
  codFeeFixed: string | number;
  paymentCycle?: string | null;
  createdAt: string;
  _count?: {
    orders: number;
    rates: number;
    returns: number;
    settlements: number;
  };
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
}

// ============================================
// Page
// ============================================
export default function AdminCourierPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;

      const qs = new URLSearchParams();
      if (activeFilter !== 'all') qs.set('active', String(activeFilter === 'active'));
      if (search.trim()) qs.set('search', search.trim());

      const [listRes, statsRes] = await Promise.all([
        api.get<Courier[]>(`/api/courier?${qs.toString()}`, { token }),
        api.get<Stats>('/api/courier/stats', { token }),
      ]);

      setCouriers(listRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load couriers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-xl">🚚</span>
          </div>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold mb-0.5 text-[#0F2A5C]">
              Couriers
            </h1>
            <p className="text-sm text-[#8A8F98]">
              Shipping partners and rate management
            </p>
          </div>
        </div>
        <Link
          href="/admin/courier/new"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition"
        >
          + Add Courier
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total" value={stats?.total ?? 0} color="blue" />
        <StatCard label="Active" value={stats?.active ?? 0} color="green" />
        <StatCard label="Inactive" value={stats?.inactive ?? 0} color="gray" />
        <StatCard
          label="COD Enabled"
          value={couriers.filter((c) => c.codEnabled).length}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="rounded-lg p-4 mb-5 bg-white shadow-sm flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug or phone..."
              className="w-full rounded-lg px-3.5 py-2 pl-10 text-sm border border-transparent bg-[#F1F3F6] focus:outline-none focus:border-[#0F2A5C]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
              🔍
            </span>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45]"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeFilter === f
                  ? 'text-white bg-[#0F2A5C] shadow'
                  : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
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
      <div className="rounded-lg overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#8A8F98]">
            Loading couriers...
          </div>
        ) : couriers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">🚚</div>
            <p className="mb-2 text-[#0F2A5C] font-medium">
              No couriers yet
            </p>
            <p className="text-sm text-[#8A8F98] mb-4">
              Add Pathao, RedX, Steadfast — your shipping partners
            </p>
            <Link
              href="/admin/courier/new"
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C]"
            >
              + Add Courier
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                  <th className="text-left px-4 py-3 font-medium">Courier</th>
                  <th className="text-left px-4 py-3 font-medium">Contact</th>
                  <th className="text-center px-4 py-3 font-medium">COD Fee</th>
                  <th className="text-center px-4 py-3 font-medium">Orders</th>
                  <th className="text-center px-4 py-3 font-medium">Rates</th>
                  <th className="text-center px-4 py-3 font-medium">Cycle</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id} className="border-t border-[#E8EBF0] hover:bg-[#F7F8FA]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center bg-[#F1F3F6] border border-[#E8EBF0] flex-shrink-0">
                          {c.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.logo}
                              alt={c.name}
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0F2A5C] to-[#1F4E79] flex items-center justify-center text-white font-bold text-sm">
                              {c.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#0F2A5C] flex items-center gap-2">
                            {c.name}
                            {c.isDefault && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#8A8F98]">
                            {c.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-[#0F2A5C] font-medium">
                        {c.phone || '—'}
                      </div>
                      {c.website && (
                        <div className="text-[11px] text-[#8A8F98] truncate max-w-[180px]">
                          {c.website}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-[#0F2A5C]">
                        {Number(c.codFeePercent)}%
                      </span>
                      {Number(c.codFeeFixed) > 0 && (
                        <div className="text-[10px] text-[#8A8F98]">
                          + ৳{Number(c.codFeeFixed)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-[#0F2A5C]">
                        {c._count?.orders ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-[#0F2A5C]">
                        {c._count?.rates ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-[#8A8F98] capitalize">
                      {c.paymentCycle || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.active ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● Active
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                          ○ Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/courier/${c.id}`}
                        className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A5C] text-white font-medium hover:bg-[#0A1F45]"
                      >
                        Manage
                      </Link>
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
  value: number;
  color: 'blue' | 'green' | 'gray' | 'purple';
}) {
  const colors = {
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    green: 'from-emerald-500 to-emerald-700',
    gray: 'from-gray-400 to-gray-600',
    purple: 'from-purple-500 to-purple-700',
  };
  return (
    <div className="rounded-lg p-4 bg-white shadow-sm border border-[#E8EBF0]">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            {label}
          </div>
          <div className="text-2xl font-bold text-[#0F2A5C] leading-tight">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}