'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

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
  impressions: number;
  clicks: number;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
}

const POSITIONS = [
  { value: 'HOME_HERO', label: 'Home Hero' },
  { value: 'HOME_STRIP', label: 'Home Strip' },
  { value: 'CATEGORY_TOP', label: 'Category Top' },
  { value: 'PRODUCT_SIDEBAR', label: 'Product Sidebar' },
  { value: 'POPUP', label: 'Popup' },
  { value: 'CHECKOUT', label: 'Checkout' },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
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

      const [listRes, statsRes] = await Promise.all([
        api.get<Banner[]>(`/api/banners?${qs.toString()}`, { token }),
        api.get<Stats>('/api/banners/stats', { token }),
      ]);
      setBanners(listRes.data || []);
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
  }, [position]);

  async function deleteBanner(id: string) {
    if (!confirm('Delete this banner?')) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/banners/${id}`, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  function statusLabel(b: Banner): { label: string; cls: string } {
    if (!b.active) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-600 border-gray-300' };
    if (b.startsAt && new Date(b.startsAt) > new Date())
      return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (b.endsAt && new Date(b.endsAt) < new Date())
      return { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200' };
    return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
            <span className="text-white font-bold text-lg sm:text-xl">🖼️</span>
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
              Banners
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8F98]">
              Homepage and category banners
            </p>
          </div>
        </div>
        <Link
          href="/admin/banners/new"
          className="w-full sm:w-auto text-center px-4 py-3 sm:py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition min-h-[44px] flex items-center justify-center"
        >
          + New Banner
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <Stat label="Total" value={stats?.total ?? 0} color="blue" />
        <Stat label="Active" value={stats?.active ?? 0} color="green" />
        <Stat label="Scheduled" value={stats?.scheduled ?? 0} color="amber" />
        <Stat label="Expired" value={stats?.expired ?? 0} color="red" />
      </div>

      <div className="rounded-lg p-3 sm:p-4 mb-4 bg-white shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          <button
            onClick={() => setPosition('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
              position === 'all' ? 'text-white bg-[#0F2A5C] shadow' : 'text-[#8A8F98] bg-[#F1F3F6]'
            }`}
          >
            All
          </button>
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPosition(p.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                position === p.value
                  ? 'text-white bg-[#0F2A5C] shadow'
                  : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {p.label}
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
        <div className="p-16 text-center text-sm text-[#8A8F98] bg-white rounded-lg">
          Loading banners...
        </div>
      ) : banners.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-white rounded-lg">
          <div className="text-4xl mb-3">🖼️</div>
          <p className="text-[#0F2A5C] font-medium mb-2">No banners yet</p>
          <p className="text-sm text-[#8A8F98] mb-5">Add your first banner</p>
          <Link
            href="/admin/banners/new"
            className="inline-block px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] min-h-[44px]"
          >
            + New Banner
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {banners.map((b) => {
            const st = statusLabel(b);
            return (
              <div
                key={b.id}
                className="bg-white rounded-lg shadow-sm border border-[#E8EBF0] overflow-hidden"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] bg-[#F1F3F6]">
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
                  )}
                  <span
                    className={`absolute top-2 right-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.cls}`}
                  >
                    {st.label}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="font-semibold text-[#0F2A5C] truncate">{b.title}</div>
                  {b.subtitle && (
                    <div className="text-xs text-[#8A8F98] truncate mt-0.5">{b.subtitle}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#F1F4F9] text-[#8A8F98] font-medium">
                      {POSITIONS.find((p) => p.value === b.position)?.label || b.position}
                    </span>
                    <span className="text-[10px] text-[#8A8F98]">
                      👁️ {b.impressions} · 🖱️ {b.clicks}
                    </span>
                  </div>

                  {(b.startsAt || b.endsAt) && (
                    <div className="text-[10px] text-[#8A8F98] mt-2">
                      {b.startsAt && <>From {formatDateTime(b.startsAt).split(',')[0]}</>}
                      {b.endsAt && <> to {formatDateTime(b.endsAt).split(',')[0]}</>}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#E8EBF0]">
                    <Link
                      href={`/admin/banners/${b.id}`}
                      className="flex-1 text-center px-3 py-2 rounded-md text-xs font-semibold bg-[#0F2A5C] text-white hover:bg-[#0A1F45]"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteBanner(b.id)}
                      className="px-3 py-2 rounded-md text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'amber';
}) {
  const colors = {
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    green: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
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