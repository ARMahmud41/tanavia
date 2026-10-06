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
export default function AdminPaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channel, setChannel] = useState<Channel>('ALL');
  const [method, setMethod] = useState<Method>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [acting, setActing] = useState<string | null>(null);

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

  async function handleVerify(id: string) {
    setActing(id);
    try {
      const token = getToken() || undefined;
      await api.patch(`/api/payments/${id}/verify`, {}, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to verify');
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Reason for rejection:');
    if (!reason?.trim()) return;
    setActing(id);
    try {
      const token = getToken() || undefined;
      await api.patch(`/api/payments/${id}/reject`, { reason }, { token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject');
    } finally {
      setActing(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  // -------- Status helpers --------
  function statusBadge(p: Payment) {
    if (p.paymentStatus === 'PAID') {
      return {
        label: '✅ Verified',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (p.paymentStatus === 'PENDING') {
      return {
        label: '⏳ Waiting review',
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

  const needsVerify = (p: Payment) =>
    p.paymentStatus === 'PENDING' || p.paymentStatus === 'REVIEW';

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* ============================================ */}
      {/* Header */}
      {/* ============================================ */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
          <span className="text-white font-bold text-lg sm:text-xl">🧾</span>
        </div>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
            Payments
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            Online + POS · bKash, Nagad, Cash, COD
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* Stats cards */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-5">
        <StatCard
          label="Waiting for review"
          value={String(stats?.waiting ?? 0)}
          hint="bKash/Nagad orders"
          color="amber"
          warn={Boolean(stats?.waiting)}
        />
        <StatCard
          label="Verified (24h)"
          value={tk(stats?.verified24h ?? 0)}
          hint="Paid in last 24h"
          color="emerald"
        />
        <StatCard
          label="Problems"
          value={String(stats?.problems ?? 0)}
          hint="Failed, rejected"
          color="red"
          warn={Boolean(stats?.problems)}
        />
        <StatCard
          label="In review"
          value={String(stats?.review ?? 0)}
          hint="Awaiting decision"
          color="navy"
        />
      </div>

      {/* ============================================ */}
      {/* Info banner */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] px-4 sm:px-5 py-3 mb-4 flex items-start gap-2">
        <span className="text-[#8A8F98]">ⓘ</span>
        <p className="text-xs text-[#8A8F98]">
          Cash sales at the counter are confirmed instantly.
          bKash/Nagad sales by staff wait for your verification.
          Open your bKash/Nagad app, check the Transaction ID and amount, then verify.
        </p>
      </div>

      {/* ============================================ */}
      {/* Filters */}
      {/* ============================================ */}
      <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-3 sm:p-4 mb-5 flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order no, TID, phone, customer..."
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

        <div className="flex gap-4 flex-wrap">
          {/* Channel filter */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-semibold mb-1">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    channel === c
                      ? 'bg-[#0F2A5C] text-white'
                      : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E8EBF0]'
                  }`}
                >
                  {c === 'ALL' ? 'All' : c === 'ONLINE' ? '🌐 Online' : '🏪 POS'}
                </button>
              ))}
            </div>
          </div>

          {/* Method filter */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-semibold mb-1">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    method === m
                      ? 'bg-[#0F2A5C] text-white'
                      : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E8EBF0]'
                  }`}
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

      {/* ============================================ */}
      {/* Payments list */}
      {/* ============================================ */}
      {loading ? (
        <div className="p-16 text-center text-sm text-[#8A8F98] rounded-lg bg-white shadow-sm border border-[#E8EBF0]">
          Loading payments...
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center rounded-lg bg-white shadow-sm border border-[#E8EBF0]">
          <div className="text-3xl mb-2">💳</div>
          <p className="text-sm text-[#0F2A5C] font-medium">No payments</p>
          <p className="text-xs text-[#8A8F98] mt-1">
            Try a different filter or search
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => {
            const sb = statusBadge(p);
            const isPos = p.channel === 'OFFLINE';
            const canAct = needsVerify(p);
            return (
              <div
                key={p.id}
                className={`rounded-lg bg-white shadow-sm border p-4 ${
                  canAct ? 'border-amber-200' : 'border-[#E8EBF0]'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-[#0F2A5C]">
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
                    <div className="text-xs font-mono text-[#0F2A5C] font-semibold">
                      {p.orderNumber}
                    </div>
                    <div className="text-[10px] text-[#8A8F98]">
                      {formatDateTime(p.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div className="mb-3">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sb.cls}`}
                  >
                    {sb.label}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pb-3 border-b border-[#F1F3F6]">
                  <div>
                    <div className="text-[10px] uppercase text-[#8A8F98] font-semibold">
                      Customer
                    </div>
                    <div className="text-[#0F2A5C] font-medium truncate">
                      {p.customerName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#8A8F98] font-semibold">
                      Phone
                    </div>
                    <div className="text-[#0F2A5C] font-mono text-[11px]">
                      {p.senderPhone || p.customerPhone || '—'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase text-[#8A8F98] font-semibold">
                      Transaction ID
                    </div>
                    <div className="text-[#0F2A5C] font-mono text-[11px] truncate">
                      {p.paymentTxId || '—'}
                    </div>
                  </div>
                </div>

                {/* Admin note (if rejected) */}
                {p.adminNote && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-800">
                    <strong>Note:</strong> {p.adminNote}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {canAct && (
                    <>
                      <button
                        onClick={() => handleVerify(p.id)}
                        disabled={acting === p.id}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 min-h-[36px]"
                      >
                        {acting === p.id ? '…' : '✅ Verify'}
                      </button>
                      <button
                        onClick={() => handleReject(p.id)}
                        disabled={acting === p.id}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 min-h-[36px]"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {p.customerPhone && (
                    <a
                      href={`https://wa.me/88${p.customerPhone.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E8EBF0] text-[#0F2A5C] hover:bg-[#F1F3F6] min-h-[36px] flex items-center gap-1"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                  {!canAct && p.paymentStatus === 'PAID' && (
                    <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      ✅ Confirmed
                      {p.verifiedAt && (
                        <span className="text-[#8A8F98] font-normal">
                          · {formatDateTime(p.verifiedAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================ */}
      {/* Pagination */}
      {/* ============================================ */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-xs text-[#8A8F98]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] disabled:opacity-50 min-h-[40px]"
            >
              ← Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] disabled:opacity-50 min-h-[40px]"
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
  hint,
  color,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
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
    <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0] relative">
      {warn && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      )}
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={`w-1 h-10 sm:h-12 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium truncate">
            {label}
          </div>
          <div className="text-base sm:text-xl font-bold text-[#0F2A5C] leading-tight truncate">
            {value}
          </div>
          {hint && (
            <div className="text-[9px] sm:text-[10px] text-[#8A8F98] mt-0.5 truncate">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}