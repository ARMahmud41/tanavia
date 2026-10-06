'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  mobileImage?: string | null;
  link?: string | null;
  ctaText?: string | null;
  position: string;
  sortOrder: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

const POSITION_LABELS: Record<string, string> = {
  HOME_HERO: 'Home Hero',
  HOME_STRIP: 'Home Strip',
  CATEGORY_TOP: 'Category Top',
  PRODUCT_SIDEBAR: 'Product Sidebar',
  POPUP: 'Popup',
  CHECKOUT: 'Checkout',
};

export default function StaffBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<string>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (position !== 'all') qs.set('position', position);

      const res = await api.get<Banner[]>(`/api/banners?${qs.toString()}`, {
        token,
      });
      setBanners(res.data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-lg sm:text-xl">🖼️</span>
        </div>
        <div>
          <h1
            className="font-serif text-xl sm:text-2xl font-semibold"
            style={{ color: 'var(--staff-text)' }}
          >
            Banners
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>
            Active promotional banners (read-only)
          </p>
        </div>
      </div>

      <div
        className="rounded-lg p-3 mb-4 flex items-start gap-2 text-sm border"
        style={{
          background: 'rgba(31, 78, 121, 0.06)',
          color: 'var(--staff-primary)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <span>ℹ️</span>
        <span>View active banners. Contact admin to make changes.</span>
      </div>

      <div
        className="rounded-lg p-3 sm:p-4 mb-4"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          <button
            onClick={() => setPosition('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              position === 'all' ? 'text-white shadow' : ''
            }`}
            style={
              position === 'all'
                ? { background: 'var(--staff-primary)' }
                : {
                    background: 'var(--staff-tile-bg, #F1F3F6)',
                    color: 'var(--staff-muted)',
                  }
            }
          >
            All
          </button>
          {Object.entries(POSITION_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPosition(value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                position === value ? 'text-white shadow' : ''
              }`}
              style={
                position === value
                  ? { background: 'var(--staff-primary)' }
                  : {
                      background: 'var(--staff-tile-bg, #F1F3F6)',
                      color: 'var(--staff-muted)',
                    }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="p-16 text-center text-sm rounded-lg"
          style={{
            background: 'var(--staff-card)',
            color: 'var(--staff-muted)',
          }}
        >
          Loading banners...
        </div>
      ) : banners.length === 0 ? (
        <div
          className="p-12 sm:p-16 text-center rounded-lg"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">🖼️</div>
          <p style={{ color: 'var(--staff-text)' }}>No banners</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {banners.map((b) => (
            <div
              key={b.id}
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <div className="aspect-[16/9] bg-[#F1F3F6] relative">
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
                )}
                <span className="absolute top-2 right-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ● Active
                </span>
              </div>
              <div className="p-4">
                <div className="font-semibold truncate" style={{ color: 'var(--staff-text)' }}>
                  {b.title}
                </div>
                {b.subtitle && (
                  <div className="text-xs truncate mt-0.5" style={{ color: 'var(--staff-muted)' }}>
                    {b.subtitle}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-medium"
                    style={{
                      background: 'var(--staff-bg)',
                      color: 'var(--staff-muted)',
                    }}
                  >
                    {POSITION_LABELS[b.position] || b.position}
                  </span>
                  {b.ctaText && (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--staff-primary)' }}>
                      CTA: {b.ctaText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}