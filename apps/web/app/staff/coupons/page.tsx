'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string | number;
  minSpend: string | number;
  maxDiscount?: string | number | null;
  usageLimit?: number | null;
  usedCount: number;
  active: boolean;
  expiresAt?: string | null;
}

export default function StaffCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());

      const res = await api.get<Coupon[]>(`/api/coupons?${qs.toString()}`, {
        token,
      });
      setCoupons(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-lg sm:text-xl">🎟️</span>
        </div>
        <div>
          <h1
            className="font-serif text-xl sm:text-2xl font-semibold"
            style={{ color: 'var(--staff-text)' }}
          >
            Coupons
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>
            Active discount codes (read-only)
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg p-3 mb-4 flex items-start gap-2 text-sm border"
        style={{
          background: 'rgba(31, 78, 121, 0.06)',
          color: 'var(--staff-primary)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <span>ℹ️</span>
        <span>View active coupons. Contact admin to create new ones.</span>
      </div>

      {/* Search */}
      <div
        className="rounded-lg p-3 sm:p-4 mb-4 sm:mb-5"
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
              placeholder="Search code..."
              className="w-full rounded-lg px-3.5 py-2.5 pl-10 text-sm border focus:outline-none min-h-[44px]"
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
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white min-h-[44px]"
            style={{ background: 'var(--staff-primary)' }}
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div
          className="p-16 text-center text-sm rounded-lg"
          style={{
            background: 'var(--staff-card)',
            color: 'var(--staff-muted)',
          }}
        >
          Loading coupons...
        </div>
      ) : coupons.length === 0 ? (
        <div
          className="p-12 sm:p-16 text-center rounded-lg"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">🎟️</div>
          <p style={{ color: 'var(--staff-text)' }}>No active coupons</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="rounded-lg p-4"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div
                    className="font-mono text-base sm:text-lg font-bold truncate"
                    style={{ color: 'var(--staff-primary)' }}
                  >
                    {c.code}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    {c.type === 'PERCENT'
                      ? `${Number(c.value)}% off`
                      : `${tk(Number(c.value))} off`}
                  </div>
                </div>
                <span className="flex-shrink-0 inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t" style={{ borderColor: 'var(--staff-border)' }}>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wide"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    Min Spend
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {tk(Number(c.minSpend))}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[10px] uppercase tracking-wide"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    Used
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: 'var(--staff-text)' }}
                  >
                    {c.usedCount}
                    {c.usageLimit !== null ? ` / ${c.usageLimit}` : ''}
                  </div>
                </div>
              </div>

              {c.expiresAt && (
                <div
                  className="text-[11px] mt-2"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  Expires: {formatDateTime(c.expiresAt).split(',')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}