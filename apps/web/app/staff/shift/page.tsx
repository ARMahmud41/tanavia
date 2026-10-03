'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk } from '@/lib/format';

interface Shift {
  id: string;
  userId: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: string;
  closingCash: string | null;
  openedAt: string;
  closedAt: string | null;
  note: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ShiftOrder {
  id: string;
  orderNumber: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

export default function StaffShiftPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [orders, setOrders] = useState<ShiftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  // Open shift form
  const [openingCash, setOpeningCash] = useState('5000');
  const [openNote, setOpenNote] = useState('');

  // Close shift form
  const [closingCash, setClosingCash] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);

  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const user = getCurrentUser();
      if (user) setUserName(user.name);

      const res = await api.get<Shift>('/api/staff/shift/current', { token });
      setShift(res.data || null);

      // Load orders if shift active
      if (res.data?.id) {
        try {
          const ordersRes = await api.get<ShiftOrder[]>(
            `/api/orders?channel=OFFLINE&limit=50`,
            { token }
          );
          setOrders(ordersRes.data || []);
        } catch {
          setOrders([]);
        }
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cash = Number(openingCash);
    if (isNaN(cash) || cash < 0) {
      setError('Opening cash must be a non-negative number');
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken() || undefined;
      const res = await api.post<Shift>(
        '/api/staff/shift/open',
        {
          openingCash: cash,
          note: openNote.trim() || undefined,
        },
        { token }
      );
      setShift(res.data || null);
      setOpeningCash('5000');
      setOpenNote('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to open shift');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cash = Number(closingCash);
    if (isNaN(cash) || cash < 0) {
      setError('Closing cash must be a non-negative number');
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken() || undefined;
      const res = await api.post<Shift>(
        '/api/staff/shift/close',
        {
          closingCash: cash,
          note: closeNote.trim() || undefined,
        },
        { token }
      );
      setShift(res.data || null);
      setClosingCash('');
      setCloseNote('');
      setShowCloseForm(false);
      setOrders([]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to close shift');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================
  // Derived stats
  // ============================================
  const shiftOpen = shift && shift.status === 'OPEN';
  const openedAt = shift ? new Date(shift.openedAt) : null;
  const duration = openedAt
    ? Math.floor((now.getTime() - openedAt.getTime()) / 60000)
    : 0;
  const durationHours = Math.floor(duration / 60);
  const durationMins = duration % 60;

  const shiftOrders = orders.filter((o) => {
    if (!openedAt) return false;
    return new Date(o.createdAt) >= openedAt;
  });

  const salesCount = shiftOrders.length;
  const totalRevenue = shiftOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );
  const cashSales = shiftOrders
    .filter((o) => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + Number(o.total), 0);

  const expectedCash = shift
    ? Number(shift.openingCash) + cashSales
    : 0;

  const difference = Number(closingCash || 0) - expectedCash;

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="text-[var(--staff-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="staff-card border-b border-l-0 border-r-0 border-t-0 rounded-none px-5 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-lg font-bold text-[var(--staff-text)]">
              Shift Management
            </h1>
            <p className="text-[11px] text-[var(--staff-muted)]">
              {userName ? `${userName} · ` : ''}
              {now.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            {shiftOpen ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--staff-success)]/10 text-[var(--staff-success)] text-xs font-semibold border border-[var(--staff-success)]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--staff-success)] animate-pulse" />
                Shift open
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--staff-warning)]/10 text-[var(--staff-warning)] text-xs font-semibold border border-[var(--staff-warning)]/20">
                No active shift
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 staff-card p-3 bg-[var(--staff-danger)]/10 border border-[var(--staff-danger)]/20 text-[var(--staff-danger)] text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* ============================================ */}
        {/* No shift — Open form                        */}
        {/* ============================================ */}
        {!shiftOpen && (
          <div className="staff-card p-6 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-[var(--staff-warning)]/10 text-[var(--staff-warning)] flex items-center justify-center mx-auto mb-3">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h2 className="font-serif text-xl font-bold text-[var(--staff-text)] mb-1">
                Open New Shift
              </h2>
              <p className="text-xs text-[var(--staff-muted)]">
                You need to open a shift before making sales.
              </p>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--staff-muted)] uppercase tracking-wider mb-1.5">
                  Opening cash (৳) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  autoFocus
                  className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-4 py-3 text-lg font-bold text-[var(--staff-text)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
                />
                <div className="text-[10px] text-[var(--staff-muted)] mt-1.5">
                  Cash amount in drawer at shift start
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--staff-muted)] uppercase tracking-wider mb-1.5">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={openNote}
                  onChange={(e) => setOpenNote(e.target.value)}
                  placeholder="Any note about this shift"
                  className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-4 py-2.5 text-sm text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-lg bg-[var(--staff-accent)] hover:opacity-95 text-white font-semibold text-sm transition disabled:opacity-50"
              >
                {submitting ? 'Opening...' : 'Open Shift'}
              </button>
            </form>
          </div>
        )}

        {/* ============================================ */}
        {/* Active shift — Stats + Close form            */}
        {/* ============================================ */}
        {shiftOpen && shift && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Opening Cash"
                value={tk(shift.openingCash)}
              />
              <StatCard
                label="Sales Count"
                value={String(salesCount)}
                sub="orders today"
              />
              <StatCard
                label="Total Revenue"
                value={tk(totalRevenue)}
                sub={`${tk(cashSales)} cash`}
                tone="success"
              />
              <StatCard
                label="Expected Cash"
                value={tk(expectedCash)}
                sub="in drawer"
                tone="accent"
              />
            </div>

            {/* Shift details */}
            <div className="staff-card p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
                    Active Shift
                  </h2>
                  <p className="text-xs text-[var(--staff-muted)] mt-0.5">
                    Opened {durationHours}h {durationMins}m ago
                  </p>
                </div>
                {!showCloseForm && (
                  <button
                    onClick={() => {
                      setShowCloseForm(true);
                      setClosingCash(String(expectedCash));
                    }}
                    className="bg-[var(--staff-danger)] hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    Close Shift
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <DetailRow label="Staff" value={userName || '—'} />
                  <DetailRow
                    label="Opening"
                    value={tk(shift.openingCash)}
                  />
                  <DetailRow label="Cash Sales" value={tk(cashSales)} />
                  <DetailRow
                    label="Total Sales"
                    value={tk(totalRevenue)}
                    bold
                  />
                </div>
                <div className="space-y-2">
                  <DetailRow
                    label="Opened"
                    value={new Date(shift.openedAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  />
                  <DetailRow label="Total Orders" value={String(salesCount)} />
                  <DetailRow
                    label="Expected Cash"
                    value={tk(expectedCash)}
                    bold
                  />
                </div>
              </div>
            </div>

            {/* Recent sales */}
            {shiftOrders.length > 0 && (
              <div className="staff-card p-5">
                <h3 className="font-serif text-base font-semibold text-[var(--staff-text)] mb-3">
                  Recent Sales ({shiftOrders.length})
                </h3>
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-[var(--staff-muted)] font-semibold pb-2 border-b border-[var(--staff-border)]">
                    <div className="col-span-3">Time</div>
                    <div className="col-span-4">Order</div>
                    <div className="col-span-3">Method</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {shiftOrders.slice(0, 10).map((o) => (
                    <div
                      key={o.id}
                      className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-[var(--staff-border)] last:border-b-0"
                    >
                      <div className="col-span-3 text-[var(--staff-muted)]">
                        {new Date(o.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="col-span-4 font-mono text-[var(--staff-text)]">
                        {o.orderNumber}
                      </div>
                      <div className="col-span-3 text-[var(--staff-muted)]">
                        {o.paymentMethod}
                      </div>
                      <div className="col-span-2 text-right font-semibold text-[var(--staff-text)]">
                        {tk(o.total)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close shift form */}
            {showCloseForm && (
              <div className="staff-card p-5 border-l-4 border-l-[var(--staff-danger)]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[var(--staff-danger)]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
                    Close Shift
                  </h2>
                </div>

                <form onSubmit={handleCloseShift} className="space-y-4">
                  <div className="bg-[var(--staff-tile-bg)] rounded-lg p-3 mb-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[var(--staff-muted)]">
                        Opening cash
                      </span>
                      <span className="text-[var(--staff-text)] font-medium">
                        {tk(shift.openingCash)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--staff-muted)]">
                        Cash sales
                      </span>
                      <span className="text-[var(--staff-text)] font-medium">
                        + {tk(cashSales)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--staff-border)] pt-1.5 mt-1.5">
                      <span className="text-[var(--staff-muted)]">
                        Expected in drawer
                      </span>
                      <span className="text-[var(--staff-text)] font-bold">
                        {tk(expectedCash)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--staff-muted)] uppercase tracking-wider mb-1.5">
                      Actual cash counted (৳) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      autoFocus
                      className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-4 py-3 text-lg font-bold text-[var(--staff-text)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
                    />
                  </div>

                  {/* Difference display */}
                  {closingCash && (
                    <div
                      className={`rounded-lg p-3 text-sm ${
                        Math.abs(difference) < 1
                          ? 'bg-[var(--staff-success)]/10 text-[var(--staff-success)]'
                          : difference > 0
                          ? 'bg-[var(--staff-warning)]/10 text-[var(--staff-warning)]'
                          : 'bg-[var(--staff-danger)]/10 text-[var(--staff-danger)]'
                      }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-medium">
                          {Math.abs(difference) < 1
                            ? '✓ Cash matches'
                            : difference > 0
                            ? '⚠ Extra cash'
                            : '⚠ Cash short'}
                        </span>
                        <span className="font-bold text-lg">
                          {difference > 0 ? '+' : ''}
                          {tk(difference)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--staff-muted)] uppercase tracking-wider mb-1.5">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      placeholder="Any note about closing"
                      className="w-full bg-[var(--staff-tile-bg)] border border-transparent rounded-lg px-4 py-2.5 text-sm text-[var(--staff-text)] placeholder:text-[var(--staff-muted)] focus:outline-none focus:bg-[var(--staff-card)] focus:border-[var(--staff-accent)] transition"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCloseForm(false)}
                      className="flex-1 py-3 rounded-lg border border-[var(--staff-border)] text-[var(--staff-text)] text-sm font-medium hover:bg-[var(--staff-tile-bg)] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 rounded-lg bg-[var(--staff-danger)] hover:opacity-90 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      {submitting ? 'Closing...' : 'Close Shift'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'success' | 'accent';
}) {
  const color =
    tone === 'success'
      ? 'text-[var(--staff-success)]'
      : tone === 'accent'
      ? 'text-[var(--staff-accent)]'
      : 'text-[var(--staff-text)]';

  return (
    <div className="staff-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--staff-muted)] font-semibold mb-1">
        {label}
      </div>
      <div className={`font-serif text-xl font-bold ${color}`}>{value}</div>
      {sub && (
        <div className="text-[10px] text-[var(--staff-muted)] mt-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--staff-muted)]">{label}</span>
      <span
        className={`text-[var(--staff-text)] ${
          bold ? 'font-bold' : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}