'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { CustomerStatusBadge } from '@/components/customers/StatusBadge';
import { tk, formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Order {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  _count?: { items: number };
}

interface CustomerNote {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
  authorId: string;
}

interface CustomerTag {
  id: string;
  tag: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  userId?: string | null;
  blockedAt?: string | null;
  blockedReason?: string | null;
  createdAt: string;
  updatedAt: string;
  orders: Order[];
  notes: CustomerNote[];
  tags: CustomerTag[] | false;
  stats: {
    orders: number;
    totalSpent?: number;
    avgOrder?: number;
    returns: number;
    returnRate?: number;
    needsReview?: boolean;
    lastOrder?: string | null;
  };
}

// ============================================
// Status colors
// ============================================
const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
  PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-gray-100 text-gray-700 border-gray-300',
};

function timeAgo(date: string | null | undefined): string {
  if (!date) return 'Never';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================
// Page
// ============================================
export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'orders' | 'returns' | 'addresses' | 'notes'>('overview');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<Customer>(`/api/customers/${customerId}`, {
        token,
      });
      setCustomer(res.data || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load customer';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
        <div
          className="text-center py-16"
          style={{ color: 'var(--staff-muted)' }}
        >
          Loading customer...
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 min-h-screen" style={{ background: 'var(--staff-bg)' }}>
        <div
          className="max-w-md mx-auto rounded-lg p-8 text-center"
          style={{ background: 'var(--staff-card)' }}
        >
          <div className="text-4xl mb-3">⚠️</div>
          <h1
            className="font-serif text-xl font-semibold mb-2"
            style={{ color: 'var(--staff-text)' }}
          >
            Customer Not Found
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--staff-muted)' }}>
            {error || 'This customer does not exist.'}
          </p>
          <Link
            href="/staff/customers"
            className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--staff-primary)' }}
          >
            ← Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const recentOrders = customer.orders.slice(0, 3);
  const isBlocked = !!customer.blockedAt;

  return (
    <div
      className="p-6 md:p-8 min-h-screen"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Back */}
      <Link
        href="/staff/customers"
        className="inline-flex items-center gap-1 text-sm mb-5 hover:underline"
        style={{ color: 'var(--staff-muted)' }}
      >
        ← Back to customers
      </Link>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="mb-5 px-4 py-3 rounded-lg border bg-red-50 border-red-200 text-red-700 flex items-start gap-2">
          <span>⚠</span>
          <span className="text-sm">
            Blocked from website orders and COD. Ask an admin before selling on credit.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-4">
          <CustomerAvatar name={customer.name} size="lg" />
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1
                className="font-serif text-2xl md:text-3xl font-semibold"
                style={{ color: 'var(--staff-text)' }}
              >
                {customer.name}
              </h1>
              <CustomerStatusBadge
                status={isBlocked ? 'BLOCKED' : customer.stats.orders >= 5 ? 'VIP' : customer.stats.orders >= 2 ? 'REPEAT' : customer.stats.orders >= 1 ? 'ACTIVE' : 'NEW'}
                size="md"
              />
            </div>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              {customer.phone}
              {customer.email && ` · ${customer.email}`}
              {` · Customer since ${new Date(customer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <a
            href={`tel:+88${customer.phone}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-2"
            style={{
              background: 'var(--staff-card)',
              color: 'var(--staff-text)',
              borderColor: 'var(--staff-border)',
            }}
          >
            📞 Call
          </a>
          <a
            href={`https://wa.me/88${customer.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2"
            style={{ background: '#25D366' }}
          >
            💬 WhatsApp
          </a>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <StatCard
          label="Orders"
          value={String(customer.stats.orders)}
          tint="var(--staff-primary)"
        />
        <StatCard
          label="Last order"
          value={timeAgo(customer.stats.lastOrder)}
          tint="var(--staff-success)"
        />
        <StatCard
          label="Returns"
          value={String(customer.stats.returns)}
          tint="var(--staff-warning)"
        />
      </div>

      {/* Tabs */}
      <div
        className="rounded-lg border mb-5 overflow-x-auto"
        style={{
          background: 'var(--staff-card)',
          borderColor: 'var(--staff-border)',
        }}
      >
        <div className="flex min-w-max">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'orders', label: `Orders (${customer.orders.length})` },
            { key: 'returns', label: `Returns (${customer.stats.returns})` },
            { key: 'addresses', label: 'Addresses' },
            { key: 'notes', label: `Notes (${customer.notes.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className="px-4 py-3 text-sm font-medium transition border-b-2"
              style={{
                color:
                  tab === t.key
                    ? 'var(--staff-primary)'
                    : 'var(--staff-muted)',
                borderColor:
                  tab === t.key ? 'var(--staff-primary)' : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">
          {tab === 'overview' && (
            <>
              {/* Recent orders */}
              <section
                className="rounded-lg p-5"
                style={{
                  background: 'var(--staff-card)',
                  boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
                }}
              >
                <h2
                  className="font-serif text-lg font-semibold mb-4"
                  style={{ color: 'var(--staff-text)' }}
                >
                  Recent orders
                </h2>

                {recentOrders.length === 0 ? (
                  <p
                    className="text-sm text-center py-6"
                    style={{ color: 'var(--staff-muted)' }}
                  >
                    No orders yet.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-xs uppercase"
                        style={{
                          background: 'var(--staff-tile-bg, #F1F4F9)',
                          color: 'var(--staff-muted)',
                        }}
                      >
                        <th className="text-left px-3 py-2 font-medium">
                          Order
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          Date
                        </th>
                        <th className="text-center px-3 py-2 font-medium">
                          Items
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Total
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          Payment
                        </th>
                        <th className="text-center px-3 py-2 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => {
                        const statusColor =
                          STATUS_COLORS[o.status] ||
                          'bg-gray-100 text-gray-700 border-gray-300';
                        return (
                          <tr
                            key={o.id}
                            className="border-t"
                            style={{ borderColor: 'var(--staff-border)' }}
                          >
                            <td className="px-3 py-3">
                              <Link
                                href={`/staff/orders/${o.id}`}
                                className="font-mono text-xs font-semibold hover:underline"
                                style={{ color: 'var(--staff-primary)' }}
                              >
                                {o.orderNumber}
                              </Link>
                            </td>
                            <td
                              className="px-3 py-3 text-xs"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {new Date(o.createdAt).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </td>
                            <td
                              className="px-3 py-3 text-center"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {o._count?.items || 0}
                            </td>
                            <td
                              className="px-3 py-3 text-right font-semibold"
                              style={{ color: 'var(--staff-text)' }}
                            >
                              {tk(o.total)}
                            </td>
                            <td
                              className="px-3 py-3 text-xs"
                              style={{ color: 'var(--staff-muted)' }}
                            >
                              {o.paymentMethod}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              {/* Timeline */}
              <section
                className="rounded-lg p-5"
                style={{
                  background: 'var(--staff-card)',
                  boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
                }}
              >
                <h2
                  className="font-serif text-lg font-semibold mb-4"
                  style={{ color: 'var(--staff-text)' }}
                >
                  Timeline
                </h2>

                <div className="space-y-4">
                  <TimelineItem
                    label="Registered"
                    value={new Date(customer.createdAt).toLocaleDateString(
                      'en-GB',
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )}
                    active
                  />
                  {customer.stats.lastOrder && (
                    <TimelineItem
                      label="Last order"
                      value={new Date(
                        customer.stats.lastOrder
                      ).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    />
                  )}
                  <TimelineItem
                    label="Last login"
                    value="—"
                  />
                </div>
              </section>
            </>
          )}

          {tab === 'orders' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                All orders ({customer.orders.length})
              </h2>
              {customer.orders.length === 0 ? (
                <p
                  className="text-sm text-center py-6"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  No orders yet.
                </p>
              ) : (
                <p
                  className="text-sm"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  Full order history coming soon.
                </p>
              )}
            </section>
          )}

          {tab === 'returns' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                Returns ({customer.stats.returns})
              </h2>
              <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
                Returns history coming soon.
              </p>
            </section>
          )}

          {tab === 'addresses' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                Addresses
              </h2>
              <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
                No saved addresses.
              </p>
            </section>
          )}

          {tab === 'notes' && (
            <section
              className="rounded-lg p-5"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <h2
                className="font-serif text-lg font-semibold mb-4"
                style={{ color: 'var(--staff-text)' }}
              >
                Notes ({customer.notes.length})
              </h2>
              {customer.notes.length === 0 ? (
                <p
                  className="text-sm"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  No notes yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {customer.notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: 'var(--staff-border)' }}
                    >
                      <p
                        className="text-sm"
                        style={{ color: 'var(--staff-text)' }}
                      >
                        {n.text}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--staff-muted)' }}
                      >
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right — Contact */}
        <div className="lg:col-span-1 space-y-5">
          <section
            className="rounded-lg p-5"
            style={{
              background: 'var(--staff-card)',
              boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
            }}
          >
            <h2
              className="font-serif text-lg font-semibold mb-4"
              style={{ color: 'var(--staff-text)' }}
            >
              Contact
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Phone</span>
                <a
                  href={`tel:+88${customer.phone}`}
                  className="font-mono hover:underline"
                  style={{ color: 'var(--staff-text)' }}
                >
                  {customer.phone}
                </a>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>Email</span>
                <span style={{ color: 'var(--staff-text)' }}>
                  {customer.email || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--staff-muted)' }}>
                  Default address
                </span>
                <span style={{ color: 'var(--staff-text)' }}>None saved</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ============================================
// StatCard
// ============================================
function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        background: 'var(--staff-card)',
        borderColor: 'var(--staff-border)',
        boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
      }}
    >
      <div className="text-xs mb-1" style={{ color: 'var(--staff-muted)' }}>
        {label}
      </div>
      <div className="text-xl font-semibold" style={{ color: tint }}>
        {value}
      </div>
    </div>
  );
}

// ============================================
// TimelineItem
// ============================================
function TimelineItem({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: active ? 'var(--staff-primary)' : 'var(--staff-border)',
          }}
        />
      </div>
      <div className="flex-1 pb-2">
        <div
          className="text-sm font-medium"
          style={{ color: 'var(--staff-text)' }}
        >
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--staff-muted)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}