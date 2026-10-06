'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment?: string | null;
  images: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string; images: string[] };
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageRating: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [rating, setRating] = useState<number | 'all'>('all');
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (status !== 'all') qs.set('status', status);
      if (rating !== 'all') qs.set('rating', String(rating));

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
  }, [status, rating]);

  async function moderate(id: string, newStatus: 'APPROVED' | 'REJECTED') {
    try {
      const token = getToken() || undefined;
      await api.patch(`/api/reviews/${id}/status`, { status: newStatus }, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update');
    }
  }

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

  async function deleteReview(id: string) {
    if (!confirm('Delete this review permanently?')) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/reviews/${id}`, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  function statusColor(s: string) {
    if (s === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-red-50 text-red-700 border-red-200';
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
          <span className="text-white font-bold text-lg sm:text-xl">⭐</span>
        </div>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
            Reviews
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            Moderate and respond to customer reviews
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-5">
        <Stat label="Total" value={stats?.total ?? 0} color="blue" />
        <Stat label="Pending" value={stats?.pending ?? 0} color="amber" />
        <Stat label="Approved" value={stats?.approved ?? 0} color="green" />
        <Stat label="Rejected" value={stats?.rejected ?? 0} color="red" />
        <Stat label="Avg Rating" value={stats?.averageRating ?? '0.0'} color="purple" className="col-span-2 sm:col-span-1" />
      </div>

      <div className="rounded-lg p-3 sm:p-4 mb-4 bg-white shadow-sm flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                status === s ? 'text-white bg-[#0F2A5C] shadow' : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <div className="w-px bg-[#E8EBF0] mx-1 flex-shrink-0" />
          {(['all', 5, 4, 3, 2, 1] as const).map((r) => (
            <button
              key={String(r)}
              onClick={() => setRating(r as any)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                rating === r ? 'text-white bg-[#0F2A5C] shadow' : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {r === 'all' ? 'All ★' : `${r}★`}
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
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 sm:p-16 text-center bg-white rounded-lg">
          <div className="text-4xl mb-3">⭐</div>
          <p className="text-[#0F2A5C] font-medium">No reviews yet</p>
          <p className="text-sm text-[#8A8F98]">Customer reviews will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-[#E8EBF0]"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {r.product.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.product.images[0]}
                      alt={r.product.name}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0F2A5C] text-sm sm:text-base truncate">
                      {r.product.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-amber-500 text-sm">
                        {'★'.repeat(r.rating)}
                        <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-xs text-[#8A8F98]">by {r.name}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#8A8F98] whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                </div>
              </div>

              {r.comment && (
                <div className="text-sm text-[#0F2A5C] bg-[#F7F8FA] rounded-lg p-3 mb-3">
                  {r.comment}
                </div>
              )}

              {r.images.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {r.images.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={img}
                      alt=""
                      className="w-16 h-16 rounded object-cover border border-[#E8EBF0]"
                    />
                  ))}
                </div>
              )}

              {r.reply && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                  <div className="font-semibold mb-1">Your reply:</div>
                  {r.reply}
                </div>
              )}

              {replyOpen === r.id ? (
                <div className="space-y-2 mb-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] focus:outline-none focus:border-[#0F2A5C] resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setReplyOpen(null)}
                      className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E8EBF0] text-[#0F2A5C]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => submitReply(r.id)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0F2A5C]"
                    >
                      Send Reply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-[#E8EBF0]">
                  {r.status !== 'APPROVED' && (
                    <button
                      onClick={() => moderate(r.id, 'APPROVED')}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      ✓ Approve
                    </button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <button
                      onClick={() => moderate(r.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    >
                      ✕ Reject
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReplyOpen(r.id);
                      setReplyText(r.reply || '');
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#0F2A5C] border border-[#E8EBF0] hover:bg-[#F7F8FA]"
                  >
                    💬 Reply
                  </button>
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="ml-auto px-3 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
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
  className = '',
}: {
  label: string;
  value: number | string;
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