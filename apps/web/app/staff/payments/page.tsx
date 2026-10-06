'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Payment {
  id: string;
  orderNumber: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  customerName: string;
  customerPhone: string;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  paymentTxId: string | null;
  senderPhone: string | null;
  verifiedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  userId: string | null;
}

interface Stats {
  waiting: number;
  review: number;
  problems: number;
  verified24h: number;
}

type Channel = 'ALL' | 'ONLINE' | 'OFFLINE';
type Method = 'ALL' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD' | 'CASH' | 'COD';

// ============================================
// Page
// ============================================
export default function StaffPaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState<Channel>('ALL');
  const [method, setMethod] = useState<Method>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', '20');
      if (channel !== 'ALL') qs.set('channel', channel);
      if (method !== 'ALL') qs.set('method', method);
      if (search.trim()) qs.set('search', search.trim());

      const [listRes, statsRes] = await Promise.all([
        api.get<Payment[]>(`/api/payments?${qs.toString()}`, { token }),
        api.get<Stats>('/api/payments/stats', { token }),
      ]);

      setItems(listRes.data || []);
      setPagination(listRes.pagination || null);
      setStats(statsRes.data || null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load'
      );
    } finally {
      setLoading(false);
    }
  }, [page, channel, method, search]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function statusBadge(p: Payment) {
    if (p.paymentStatus === 'PAID') {
      return {
        label: '✅ Confirmed',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (p.paymentStatus === 'PENDING') {
      return {
        label: '⏳ Waiting admin',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    }
    if (p.paymentStatus === 'REVIEW') {
      return {
        label: '⚠️ In review',
        cls: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }
    if (p.paymentStatus === 'FAILED') {
      return {
        label: '❌ Failed',
        cls: 'bg-red-50 text-red-700 border-red-200',
      };
    }
    return {
      label: p.paymentStatus,
      cls: 'bg-gray-50 text-gray-700 border-gray-200',
    };
  }

  function methodBadge(m: string) {
    const map: Record<string, { bg: string; text: string }> = {
      BKASH: { bg: 'bg-pink-100', text: 'text-pink-800' },
      NAGAD: { bg: 'bg-orange-100', text: 'text-orange-800' },
      ROCKET: { bg: 'bg-purple-100', text: 'text-purple-800' },
      CARD: { bg: 'bg-blue-100', text: 'text-blue-800' },
      CASH: { bg: 'bg-green-100', text: 'text-green-800' },
      COD: { bg: 'bg-slate-100', text: 'text-slate-800' },
    };
    const s = map[m] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${s.bg} ${s.text}`}>
        {m.toLowerCase()}
      </span>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--staff-primary)' }}
        >
          <span className="text-white font-bold text-lg sm:text-xl">💳</span>
        </div>
        <div>
          <h1
            className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold"
            style={{ color: 'var(--staff-text)' }}
          >
            Payments
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--staff-muted)' }}>
            Look up a payment and answer customers
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-lg p-3 mb-4 flex items-start gap-2 text-xs border"
        style={{
          background: 'rgba(15, 42, 92, 0.04)',
          borderColor: 'var(--staff-border)',
          color: 'var(--staff-muted)',
        }}
      >
        <span>ℹ️</span>
        <span>
          You can see the status to answer customers.
          Only an admin can verify or change a payment.
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          label="Waiting for admin"
          value={String(stats?.waiting ?? 0)}
          color="amber"
          warn={Boolean(stats?.waiting)}
        />
        <StatCard
          label="Confirmed (24h)"
          value={tk(stats?.verified24h ?? 0)}
          color="emerald"
        />
        <StatCard
          label="Problems"
          value={String(stats?.problems ?? 0)}
          color="red"
          warn={Boolean(stats?.problems)}
        />
        <StatCard
          label="In review"
          value={String(stats?.review ?? 0)}
          color="navy"
        />
      </div>

      {/* Filters */}
      <div
        className="rounded-lg p-3 sm:p-4 mb-5 flex flex-col gap-3 border"
        style={{
          background: 'var(--staff-card)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order no, phone, transaction ID..."
              className="w-full rounded-lg px-3.5 py-2.5 pl-10 text-sm border border-transparent focus:outline-none min-h-[44px]"
              style={{
                background: 'var(--staff-bg)',
                color: 'var(--staff-text)',
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

        <div className="flex gap-4 flex-wrap">
          <div>
            <div
              className="text-[10px] uppercase tracking-wide font-semibold mb-1"
              style={{ color: 'var(--staff-muted)' }}
            >
              Channel
            </div>
            <div className="flex gap-1">
              {(['ALL', 'ONLINE', 'OFFLINE'] as Channel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setChannel(c);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition`}
                  style={
                    channel === c
                      ? { background: 'var(--staff-primary)', color: 'white' }
                      : {
                          background: 'var(--staff-bg)',
                          color: 'var(--staff-muted)',
                        }
                  }
                >
                  {c === 'ALL' ? 'All' : c === 'ONLINE' ? '🌐 Online' : '🏪 POS'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div
              className="text-[10px] uppercase tracking-wide font-semibold mb-1"
              style={{ color: 'var(--staff-muted)' }}
            >
              Method
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['ALL', 'BKASH', 'NAGAD', 'CASH', 'COD'] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition`}
                  style={
                    method === m
                      ? { background: 'var(--staff-primary)', color: 'white' }
                      : {
                          background: 'var(--staff-bg)',
                          color: 'var(--staff-muted)',
                        }
                  }
                >
                  {m === 'ALL' ? 'All' : m.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div
          className="p-16 text-center text-sm rounded-lg border"
          style={{
            background: 'var(--staff-card)',
            borderColor: 'var(--staff-border)',
            color: 'var(--staff-muted)',
          }}
        >
          Loading payments...
        </div>
      ) : items.length === 0 ? (
        <div
          className="p-16 text-center rounded-lg border"
          style={{
            background: 'var(--staff-card)',
            borderColor: 'var(--staff-border)',
          }}
        >
          <div className="text-3xl mb-2">💳</div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--staff-text)' }}
          >
            No payments
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--staff-muted)' }}>
            Try a different filter
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const sb = statusBadge(p);
            const isPos = p.channel === 'OFFLINE';
            return (
              <div
                key={p.id}
                className="rounded-lg border p-4"
                style={{
                  background: 'var(--staff-card)',
                  borderColor: 'var(--staff-border)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-lg font-bold"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {tk(p.total)}
                    </span>
                    {methodBadge(p.paymentMethod)}
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isPos
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isPos ? '🏪 POS' : '🌐 Online'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xs font-mono font-semibold"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {p.orderNumber}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sb.cls}`}
                  >
                    {sb.label}
                  </span>
                </div>

                <div
                  className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pb-3 border-b"
                  style={{ borderColor: 'var(--staff-border)' }}
                >
                  <div>
                    <div
                      className="text-[10px] uppercase font-semibold"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      Customer
                    </div>
                    <div
                      className="font-medium truncate"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {p.customerName}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[10px] uppercase font-semibold"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      Phone
                    </div>
                    <div
                      className="font-mono text-[11px]"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {p.senderPhone || p.customerPhone || '—'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div
                      className="text-[10px] uppercase font-semibold"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      Transaction ID
                    </div>
                    <div
                      className="font-mono text-[11px] truncate"
                      style={{ color: 'var(--staff-text)' }}
                    >
                      {p.paymentTxId || '—'}
                    </div>
                  </div>
                </div>

                {p.adminNote && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-800">
                    <strong>Note from admin:</strong> {p.adminNote}
                  </div>
                )}

                {/* Actions — staff only sees WhatsApp */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {p.customerPhone && (
                    <a
                      href={`https://wa.me/88${p.customerPhone.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg text-xs font-semibold border min-h-[36px] flex items-center gap-1"
                      style={{
                        borderColor: 'var(--staff-border)',
                        color: 'var(--staff-primary)',
                      }}
                    >
                      💬 WhatsApp customer
                    </a>
                  )}
                  {p.paymentStatus === 'PENDING' && (
                    <div
                      className="text-xs flex items-center gap-1 px-2"
                      style={{ color: 'var(--staff-muted)' }}
                    >
                      ⏳ Admin will verify
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-xs" style={{ color: 'var(--staff-muted)' }}>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg text-xs font-medium border disabled:opacity-50 min-h-[40px]"
              style={{
                borderColor: 'var(--staff-border)',
                color: 'var(--staff-primary)',
              }}
            >
              ← Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-xs font-medium border disabled:opacity-50 min-h-[40px]"
              style={{
                borderColor: 'var(--staff-border)',
                color: 'var(--staff-primary)',
              }}
            >
              Next →
            </button>
          </div>
        </div>
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
  warn,
}: {
  label: string;
  value: string;
  color: 'navy' | 'emerald' | 'red' | 'amber';
  warn?: boolean;
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    emerald: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div
      className="rounded-lg p-3 sm:p-4 border relative"
      style={{
        background: 'var(--staff-card)',
        borderColor: 'var(--staff-border)',
      }}
    >
      {warn && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div className="min-w-0 flex-1">
          <div
            className="text-[9px] sm:text-[10px] uppercase tracking-wide font-medium truncate"
            style={{ color: 'var(--staff-muted)' }}
          >
            {label}
          </div>
          <div
            className="text-base sm:text-xl font-bold leading-tight truncate"
            style={{ color: 'var(--staff-text)' }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}