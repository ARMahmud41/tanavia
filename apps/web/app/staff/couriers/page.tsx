'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Courier {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  phone?: string | null;
  website?: string | null;
  active: boolean;
  isDefault: boolean;
  codEnabled: boolean;
  codFeePercent: string | number;
  codFeeFixed: string | number;
  paymentCycle?: string | null;
  _count?: {
    orders: number;
    rates: number;
  };
}

interface Rate {
  id: string;
  district: string;
  weightUpTo: string | number;
  deliveryFee: string | number;
  extraPerKg: string | number;
  codFee: string | number;
  returnFee: string | number;
  active: boolean;
}

// ============================================
// Page
// ============================================
export default function StaffCouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, Rate[]>>({});
  const [loadingRates, setLoadingRates] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      qs.set('active', 'true');
      if (search.trim()) qs.set('search', search.trim());

      const res = await api.get<Courier[]>(`/api/courier?${qs.toString()}`, {
        token,
      });
      setCouriers(res.data || []);
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
  }, []);

  async function toggleRates(courierId: string) {
    if (expandedId === courierId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(courierId);

    if (rates[courierId]) return;

    setLoadingRates(courierId);
    try {
      const token = getToken() || undefined;
      const res = await api.get<Rate[]>(`/api/courier/${courierId}/rates`, {
        token,
      });
      setRates((r) => ({ ...r, [courierId]: res.data || [] }));
    } catch {
      // silent
    } finally {
      setLoadingRates(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

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
            <span className="text-white font-bold text-xl">🚚</span>
          </div>
          <div>
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              Courier Partners
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Delivery rates and contact info
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
          View delivery rates by district. Contact an admin to book a courier
          for an order.
        </span>
      </div>

      {/* Search */}
      <div
        className="rounded-lg p-4 mb-5"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courier by name or phone..."
              className="w-full rounded-lg px-3.5 py-2 pl-10 text-sm border focus:outline-none"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            />
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--staff-muted)' }}
            >
              🔍
            </span>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: 'var(--staff-primary)' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Courier cards */}
      <div className="space-y-3">
        {loading ? (
          <div
            className="p-16 text-center text-sm rounded-lg"
            style={{
              background: 'var(--staff-card)',
              color: 'var(--staff-muted)',
            }}
          >
            Loading couriers...
          </div>
        ) : couriers.length === 0 ? (
          <div
            className="p-16 text-center rounded-lg"
            style={{ background: 'var(--staff-card)' }}
          >
            <div className="text-4xl mb-3">🚚</div>
            <p style={{ color: 'var(--staff-text)' }}>
              No active couriers found
            </p>
          </div>
        ) : (
          couriers.map((c) => {
            const isExpanded = expandedId === c.id;
            const courierRates = rates[c.id] || [];

            return (
              <div
                key={c.id}
                className="rounded-lg overflow-hidden"
                style={{
                  background: 'var(--staff-card)',
                  boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
                }}
              >
                {/* Courier header */}
                <button
                  onClick={() => toggleRates(c.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:opacity-90 transition"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: 'var(--staff-bg)' }}
                  >
                    {c.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.logo}
                        alt={c.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold text-base"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {c.name}
                      </span>
                      {c.isDefault && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">
                          Default
                        </span>
                      )}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {c.phone || '—'}
                      {c.website && ` · ${c.website}`}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-xs font-medium"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      COD {Number(c.codFeePercent)}%
                      {Number(c.codFeeFixed) > 0 &&
                        ` + ${tk(Number(c.codFeeFixed))}`}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {isExpanded ? '▲ Hide rates' : '▼ View rates'}
                    </div>
                  </div>
                </button>

                {/* Rates (expanded) */}
                {isExpanded && (
                  <div
                    className="border-t px-4 py-3"
                    style={{
                      borderColor: 'var(--staff-border)',
                      background: 'var(--staff-bg)',
                    }}
                  >
                    {loadingRates === c.id ? (
                      <div
                        className="text-center py-6 text-sm"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        Loading rates...
                      </div>
                    ) : courierRates.length === 0 ? (
                      <div
                        className="text-center py-6 text-sm"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        No rates configured yet
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr
                              className="uppercase tracking-wide"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              <th className="text-left py-2 font-medium">
                                District
                              </th>
                              <th className="text-center py-2 font-medium">
                                Weight
                              </th>
                              <th className="text-right py-2 font-medium">
                                Delivery
                              </th>
                              <th className="text-right py-2 font-medium">
                                Extra/kg
                              </th>
                              <th className="text-right py-2 font-medium">
                                COD
                              </th>
                              <th className="text-right py-2 font-medium">
                                Return
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {courierRates.map((r) => (
                              <tr
                                key={r.id}
                                className="border-t"
                                style={{ borderColor: 'var(--staff-border)' }}
                              >
                                <td
                                  className="py-2 font-medium"
                                  style={{ color: 'var(--staff-text)' }}
                                >
                                  {r.district}
                                </td>
                                <td
                                  className="py-2 text-center"
                                  style={{ color: 'var(--staff-muted)' }}
                                >
                                  ≤ {Number(r.weightUpTo)} kg
                                </td>
                                <td
                                  className="py-2 text-right font-semibold"
                                  style={{ color: 'var(--staff-text)' }}
                                >
                                  {tk(Number(r.deliveryFee))}
                                </td>
                                <td
                                  className="py-2 text-right"
                                  style={{ color: 'var(--staff-muted)' }}
                                >
                                  {tk(Number(r.extraPerKg))}
                                </td>
                                <td
                                  className="py-2 text-right"
                                  style={{ color: 'var(--staff-muted)' }}
                                >
                                  {tk(Number(r.codFee))}
                                </td>
                                <td
                                  className="py-2 text-right"
                                  style={{ color: 'var(--staff-muted)' }}
                                >
                                  {tk(Number(r.returnFee))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}