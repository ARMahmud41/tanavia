'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reply?: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string; images: string[] };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  averageRating: string;
}

export default function StaffReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (status !== 'all') qs.set('status', status);

      const [listRes, statsRes] = await Promise.all([
        api.get<Review[]>(`/api/reviews?${qs.toString()}`, { token }),
        api.get<Stats>('/api/reviews/stats', { token }),
      ]);
      setReviews(listRes.data || []);
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

  async function submitReply(id: string) {
    if (!replyText.trim()) return;
    try {
      const token = getToken() || undefined;
      await api.post(`/api/reviews/${id}/reply`, { reply: replyText }, { token });
      setReplyOpen(null);
      setReplyText('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reply');
    }
  }

  function statusColor(s: string) {
    if (s === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-lg sm:text-xl">⭐</span>
        </div>
        <div>
          <h1
            className="font-serif text-xl sm:text-2xl font-semibold"
            style={{ color: 'var(--staff-text)' }}
          >
            Reviews
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>
            Respond to customer reviews
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
        <span>You can reply to reviews. Only an admin can approve or delete.</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <Stat label="Total" value={stats?.total ?? 0} color="blue" />
        <Stat label="Pending" value={stats?.pending ?? 0} color="amber" />
        <Stat label="Approved" value={stats?.approved ?? 0} color="green" />
        <Stat label="Avg Rating" value={stats?.averageRating ?? '0.0'} color="purple" />
      </div>

      <div
        className="rounded-lg p-3 sm:p-4 mb-4"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                status === s ? 'text-white shadow' : ''
              }`}
              style={
                status === s
                  ? { background: 'var(--staff-primary)' }
                  : {
                      background: 'var(--staff-tile-bg, #F1F3F6)',
                      color: 'var(--staff-muted)',
                    }
              }
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
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
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div
          className="p-12 sm:p-16 text-center rounded-lg"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">⭐</div>
          <p style={{ color: 'var(--staff-text)' }}>No reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-lg p-4"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                {r.product.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.product.images[0]}
                    alt={r.product.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: 'var(--staff-text)' }}>
                    {r.product.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-amber-500 text-sm">
                      {'★'.repeat(r.rating)}
                      <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                    <span className="text-xs" style={{ color: 'var(--staff-muted)' }}>
                      {r.name}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
                <div className="text-[10px]" style={{ color: 'var(--staff-muted)' }}>
                  {formatDateTime(r.createdAt).split(',')[0]}
                </div>
              </div>

              {r.comment && (
                <div
                  className="text-sm rounded-lg p-3 mb-3"
                  style={{ background: 'var(--staff-bg)', color: 'var(--staff-text)' }}
                >
                  {r.comment}
                </div>
              )}

              {r.reply ? (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="font-semibold mb-1">Your reply:</div>
                  {r.reply}
                </div>
              ) : replyOpen === r.id ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none resize-none"
                    style={{
                      borderColor: 'var(--staff-border)',
                      background: 'var(--staff-card)',
                      color: 'var(--staff-text)',
                    }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setReplyOpen(null)}
                      className="px-4 py-2 rounded-lg text-xs font-medium border min-h-[40px]"
                      style={{
                        borderColor: 'var(--staff-border)',
                        color: 'var(--staff-text)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => submitReply(r.id)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white min-h-[40px]"
                      style={{ background: 'var(--staff-primary)' }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReplyOpen(r.id);
                    setReplyText('');
                  }}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-white min-h-[40px]"
                  style={{ background: 'var(--staff-primary)' }}
                >
                  💬 Reply
                </button>
              )}
            </div>
          ))}
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
  value: number | string;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colors = {
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    green: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-700',
  };
  return (
    <div
      className="rounded-lg p-3 sm:p-4 border"
      style={{
        background: 'var(--staff-card)',
        borderColor: 'var(--staff-border)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`w-1 h-8 sm:h-10 rounded-full bg-gradient-to-b ${colors[color]}`} />
        <div className="min-w-0">
          <div
            className="text-[9px] sm:text-[10px] uppercase tracking-wide font-medium truncate"
            style={{ color: 'var(--staff-muted)' }}
          >
            {label}
          </div>
          <div
            className="text-lg sm:text-2xl font-bold leading-tight"
            style={{ color: 'var(--staff-text)' }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}