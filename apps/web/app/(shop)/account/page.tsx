'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

interface Customer {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items?: Array<{ id: string; name: string; qty: number }>;
}

export default function AccountPage() {
  const [user, setUser] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem('tanavia_customer_user');
        const token = localStorage.getItem('tanavia_customer_token');

        if (!raw || !token) {
          setNotLoggedIn(true);
          setLoading(false);
          return;
        }
        const u = JSON.parse(raw) as Customer;
        setUser(u);

        // Fetch orders
        try {
          const res = await api.get<Order[]>('/api/orders/my', { token });
          setOrders(res.data || []);
        } catch {
          setOrders([]);
        }
      } catch {
        setNotLoggedIn(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleLogout() {
    localStorage.removeItem('tanavia_customer_token');
    localStorage.removeItem('tanavia_customer_user');
    window.location.href = '/';
  }

  if (loading) {
    return (
      <div className="container-wrap px-4 sm:px-6 py-20 text-center">
        <div className="text-sm text-muted">Loading...</div>
      </div>
    );
  }

  if (notLoggedIn) {
    return (
      <div className="container-wrap px-4 sm:px-6 py-12 sm:py-20 max-w-md mx-auto text-center">
        <div className="text-5xl mb-4">👤</div>
        <h1 className="font-serif text-3xl font-semibold text-ink mb-2">
          You&apos;re not signed in
        </h1>
        <p className="text-sm text-muted mb-6">
          Sign in to view your account, orders, and preferences.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className="btn text-sm">
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center border border-wine text-wine px-6 py-3 rounded text-sm font-semibold hover:bg-wine hover:text-white transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  const displayOrders = orders.slice(0, 5);

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <p className="text-wine text-xs tracking-[0.3em] uppercase mb-1 font-semibold">
            My Account
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink">
            Hello, {user?.name?.split(' ')[0] || 'Friend'}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-red-600 hover:underline font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <StatCard
          label="Total Orders"
          value={String(orders.length)}
          href="/orders"
        />
        <StatCard label="Wishlist" value="View" href="/wishlist" />
        <StatCard label="Support" value="Contact" href="/contact" />
      </div>

      {/* Profile info */}
      <div className="bg-white border border-line rounded-lg p-5 mb-8">
        <h2 className="font-serif text-lg font-semibold text-ink mb-4">
          Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-1">
              Name
            </div>
            <div className="text-ink font-medium">{user?.name}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted mb-1">
              Email
            </div>
            <div className="text-ink font-medium">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="font-serif text-lg font-semibold text-ink">
            Recent Orders
          </h2>
          {orders.length > 0 && (
            <Link
              href="/orders"
              className="text-xs text-wine font-semibold hover:underline"
            >
              View all →
            </Link>
          )}
        </div>

        {displayOrders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm text-ink font-medium mb-1">
              No orders yet
            </p>
            <p className="text-xs text-muted mb-5">
              Start shopping to see your orders here.
            </p>
            <Link href="/products" className="btn text-sm">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {displayOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/track/${order.orderNumber}`}
                    className="font-mono text-sm font-semibold text-wine hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <div className="text-xs text-muted mt-0.5">
                    {formatDateTime(order.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <StatusBadge status={order.status} />
                  <span className="font-semibold text-ink">
                    ৳{Number(order.total).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <p className="text-center text-xs text-muted mt-8">
        Need help?{' '}
        <Link href="/contact" className="text-wine hover:underline">
          Contact support
        </Link>{' '}
        ·{' '}
        <Link href="/faqs" className="text-wine hover:underline">
          FAQs
        </Link>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-line rounded-lg p-4 hover:border-wine transition"
    >
      <div className="text-[10px] uppercase tracking-wide text-muted font-semibold mb-1">
        {label}
      </div>
      <div className="text-lg font-bold text-ink">{value}</div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    PACKED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SHIPPED: 'bg-purple-50 text-purple-700 border-purple-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  };
  const cls = styles[s] || 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}
    >
      {s}
    </span>
  );
}