'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import { tk } from '@/lib/format';
import { ThemeToggle } from '@/components/staff/ThemeToggle';

interface Shift {
  id: string;
  openingCash: string;
  closingCash: string | null;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  variants: Array<{
    id: string;
    size: string;
    color: string;
    qty: number;
    reserved: number;
  }>;
}

// ============================================
// Icons — inline SVG, tabler-style
// ============================================
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const icons: Record<string, React.ReactNode> = {
    sales: (
      <svg {...props}>
        <rect x="3" y="12" width="4" height="9" />
        <rect x="10" y="7" width="4" height="14" />
        <rect x="17" y="3" width="4" height="18" />
      </svg>
    ),
    revenue: (
      <svg {...props}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9h5a2 2 0 1 0 0 4h-4a2 2 0 1 0 0 4h5" />
      </svg>
    ),
    cash: (
      <svg {...props}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    avg: (
      <svg {...props}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
    pos: (
      <svg {...props}>
        <path d="M3 3h2l2 12h11l2-8H6" />
        <circle cx="9" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
      </svg>
    ),
    shift: (
      <svg {...props}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    reports: (
      <svg {...props}>
        <path d="M4 4v16h16" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
    orders: (
      <svg {...props}>
        <path d="M5 7h14l-1 12H6L5 7z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    ),
    lookup: (
      <svg {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
    stock: (
      <svg {...props}>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3.3 8L12 13l8.7-5" />
      </svg>
    ),
  };

  return <>{icons[name] || icons.sales}</>;
}

export default function StaffDashboardPage() {
  const [shift, setShift] = useState<Shift | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUserName(user.name);

    async function load() {
      const token = getToken() || undefined;
      try {
        const [shiftRes, ordersRes, stockRes] = await Promise.all([
          api.get<Shift>('/api/staff/shift/current', { token }).catch(() => ({ data: null } as any)),
          api.get<RecentOrder[]>('/api/orders?channel=OFFLINE&limit=10', { token }).catch(() => ({ data: [] } as any)),
          api.get<LowStockItem[]>('/api/stock/low', { token }).catch(() => ({ data: [] } as any)),
        ]);
        setShift(shiftRes.data || null);
        setRecentOrders(ordersRes.data || []);
        setLowStock(stockRes.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();

    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const shiftOpen = shift && shift.status === 'OPEN';
  const shiftDuration = shift
    ? Math.floor((now.getTime() - new Date(shift.openedAt).getTime()) / 60000)
    : 0;
  const shiftHours = Math.floor(shiftDuration / 60);
  const shiftMins = shiftDuration % 60;

  return (
    <div className="min-h-screen">
      {/* ============================================ */}
      {/* TOP NAVBAR                                       */}
      {/* ============================================ */}
      <div className="staff-card border-b border-l-0 border-r-0 border-t-0 rounded-none px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left — Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[var(--staff-card)] flex items-center justify-center flex-shrink-0 border border-[var(--staff-border)]">
              <Image
                src="/logos/tanavia-logo.png"
                alt="TANAVIA"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-wider text-[var(--staff-text)]">
                TANAVIA
              </div>
              <div className="text-[10px] tracking-[0.15em] text-[var(--staff-muted)] uppercase">
                Staff Panel
              </div>
            </div>
          </div>

          {/* Center — Date */}
          <div className="hidden md:block text-sm text-[var(--staff-muted)]">
            {now.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-2">
            {/* Shift badge */}
            {shiftOpen ? (
              <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--staff-success)]/10 text-[var(--staff-success)] text-xs font-semibold border border-[var(--staff-success)]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--staff-success)] animate-pulse" />
                Shift open
              </span>
            ) : (
              <Link
                href="/staff/shift"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--staff-warning)]/10 text-[var(--staff-warning)] text-xs font-semibold border border-[var(--staff-warning)]/20"
              >
                Shift closed
              </Link>
            )}

            <ThemeToggle />

            {/* Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="w-9 h-9 rounded-lg border border-[var(--staff-border)] flex items-center justify-center text-[var(--staff-muted)] hover:text-[var(--staff-text)] hover:bg-[var(--staff-card-hover)] transition"
              title="Refresh"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>

            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-lg border border-[var(--staff-border)] flex items-center justify-center text-[var(--staff-muted)] hover:text-[var(--staff-text)] hover:bg-[var(--staff-card-hover)] transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 1 1 12 0v4l2 4H4l2-4V8z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-[var(--staff-danger)] text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                3
              </span>
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-[var(--staff-primary)] text-white flex items-center justify-center text-sm font-bold">
              {userName.charAt(0).toUpperCase() || 'K'}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* GREETING                                          */}
      {/* ============================================ */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="font-serif text-3xl font-bold text-[var(--staff-text)] mb-1">
          {greeting}, {userName || 'Staff'}
        </h1>
        <p className="text-sm text-[var(--staff-muted)]">
          Counter 1
          {shiftOpen && (
            <>
              {' '}· Shift open for {shiftHours}h {shiftMins}m
            </>
          )}
        </p>
      </div>

      {/* ============================================ */}
      {/* KPI CARDS                                        */}
      {/* ============================================ */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard
          icon="sales"
          label="Sales today"
          value="26"
          sub="orders ↑ 12% vs yesterday"
          trend="up"
        />
        <KpiCard
          icon="revenue"
          label="Revenue today"
          value={tk(41050)}
          sub="↑ 8% vs yesterday"
          trend="up"
        />
        <KpiCard
          icon="cash"
          label="Cash in drawer"
          value={tk(13200)}
          sub={shift ? `Opening ${tk(shift.openingCash)} + cash sales` : 'No active shift'}
        />
        <KpiCard
          icon="avg"
          label="Average order"
          value={tk(1579)}
          sub="per order ↓ 3% vs yesterday"
          trend="down"
        />
      </div>

      {/* ============================================ */}
      {/* SHIFT ACTIVE CARD                                */}
      {/* ============================================ */}
      {shiftOpen && shift && (
        <div className="px-6 mb-4">
          <div className="staff-card p-5 border-l-4 border-l-[var(--staff-accent)]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--staff-accent)] animate-pulse" />
                <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
                  Shift active
                </h2>
              </div>
              <Link
                href="/staff/shift"
                className="bg-[var(--staff-danger)] hover:opacity-90 text-white px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Close shift
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left — Shift details */}
              <div className="space-y-2 text-sm">
                <ShiftRow label="Opened" value={`${new Date(shift.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} (${shiftHours}h ${shiftMins}m ago)`} />
                <ShiftRow label="Staff" value={userName || 'Staff'} />
                <ShiftRow label="Opening" value={tk(shift.openingCash)} />
                <ShiftRow label="Cash sales" value={tk(8200)} />
                <ShiftRow label="Expected" value={tk(Number(shift.openingCash) + 8200)} bold />

                <div className="flex gap-2 pt-3">
                  <Link
                    href="/staff/reports"
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--staff-border)] text-[var(--staff-text)] hover:bg-[var(--staff-card-hover)] transition"
                  >
                    View full report
                  </Link>
                  <button className="text-xs px-3 py-1.5 rounded-lg border border-[var(--staff-border)] text-[var(--staff-text)] hover:bg-[var(--staff-card-hover)] transition">
                    X report
                  </button>
                </div>
              </div>

              {/* Right — Recent transactions */}
              <div>
                <div className="text-[10px] tracking-[0.15em] text-[var(--staff-muted)] uppercase mb-2 font-semibold">
                  Recent transactions
                </div>
                <div className="space-y-1.5">
                  {recentOrders.slice(0, 3).map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--staff-border)] last:border-b-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[var(--staff-muted)]">
                          {new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[var(--staff-muted)]">·</span>
                        <span className="text-[var(--staff-text)] font-medium">{o.paymentMethod}</span>
                        <span className="text-[var(--staff-muted)]">·</span>
                        <span className="text-[var(--staff-muted)] font-mono">{o.orderNumber}</span>
                      </div>
                      <span className="text-[var(--staff-text)] font-semibold">
                        {tk(o.total)}
                      </span>
                    </div>
                  ))}
                  {recentOrders.length === 0 && (
                    <div className="text-xs text-[var(--staff-muted)] text-center py-4">
                      No transactions yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* 3-COLUMN ROW: Target + Payment + Online         */}
      {/* ============================================ */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Daily target */}
        <div className="staff-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
              Daily target
            </h2>
            <span className="text-xs text-[var(--staff-muted)]">Goal {tk(60000)}</span>
          </div>
          <div className="flex items-center gap-5">
            <CircularProgress value={70} />
            <div>
              <div className="text-xs text-[var(--staff-muted)] mb-1">
                Still to go
              </div>
              <div className="font-serif text-2xl font-bold text-[var(--staff-text)] mb-1">
                {tk(18050)}
              </div>
              <div className="text-xs text-[var(--staff-muted)]">
                About 12 more orders at the current average.
              </div>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="staff-card p-5">
          <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)] mb-4">
            Payment methods
          </h2>
          <div className="space-y-3">
            <PaymentRow label="Cash" amount={19100} percent={46} color="#2F7D7A" />
            <PaymentRow label="bKash" amount={13600} percent={32} color="#1F4E79" />
            <PaymentRow label="Nagad" amount={7250} percent={17} color="#D97706" />
            <PaymentRow label="Card" amount={2000} percent={5} color="#7C3AED" />
          </div>
        </div>

        {/* Online orders */}
        <div className="staff-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
              Online orders
            </h2>
            <span className="text-xs text-[var(--staff-muted)]">need action</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <OrderTile value="4" label="Processing" />
            <OrderTile value="2" label="Ready" />
            <OrderTile value="3" label="Unpaid" tone="warning" />
            <OrderTile value="2" label="Returns" tone="danger" />
            <OrderTile value="1" label="Held bills" tone="warning" />
            <OrderTile value="6" label="Pickups today" />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* QUICK ACTIONS                                    */}
      {/* ============================================ */}
      <div className="px-6 mb-4">
        <div className="text-[10px] tracking-[0.15em] text-[var(--staff-muted)] uppercase mb-3 font-semibold">
          Quick actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction href="/staff/pos" icon="pos" label="POS" sub="Start sale" shortcut="F1" />
          <QuickAction href="/staff/shift" icon="shift" label="Shift" sub="Open or close" />
          <QuickAction href="/staff/reports" icon="reports" label="Reports" sub="View today" />
          <QuickAction href="/staff/orders" icon="orders" label="Orders" sub="View list" />
          <QuickAction href="/staff/pos" icon="lookup" label="Lookup" sub="Order or barcode" shortcut="F3" />
          <QuickAction href="/staff/inventory" icon="stock" label="Stock" sub="Check inventory" shortcut="F2" />
        </div>
      </div>

      {/* ============================================ */}
      {/* RECENT SALES + LOW STOCK                          */}
      {/* ============================================ */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Recent sales */}
        <div className="staff-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
              Recent sales
            </h2>
            <Link
              href="/staff/orders"
              className="text-xs text-[var(--staff-accent)] hover:underline font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-[10px] tracking-wider uppercase text-[var(--staff-muted)] font-semibold pb-2 border-b border-[var(--staff-border)]">
              <div className="col-span-2">Time</div>
              <div className="col-span-3">Order</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Method</div>
            </div>
            {recentOrders.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-[var(--staff-border)] last:border-b-0 hover:bg-[var(--staff-card-hover)] transition rounded"
              >
                <div className="col-span-2 text-[var(--staff-muted)]">
                  {new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="col-span-3 font-mono text-[var(--staff-text)]">
                  {o.orderNumber}
                </div>
                <div className="col-span-3 text-[var(--staff-text)] truncate">
                  {o.customerName || 'Walk-in'}
                </div>
                <div className="col-span-2 text-right font-semibold text-[var(--staff-text)]">
                  {tk(o.total)}
                </div>
                <div className="col-span-2 text-right text-[var(--staff-muted)] text-[10px]">
                  {o.paymentMethod}
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="text-xs text-[var(--staff-muted)] text-center py-6">
                No recent sales
              </div>
            )}
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="staff-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[var(--staff-warning)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.3 3.9l-8 13.9c-.7 1.3.2 3 1.7 3h16c1.5 0 2.4-1.7 1.7-3l-8-13.9c-.7-1.3-2.7-1.3-3.4 0z" />
                </svg>
              </span>
              <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
                Low stock alerts
              </h2>
            </div>
            <Link
              href="/staff/inventory"
              className="text-xs text-[var(--staff-accent)] hover:underline font-medium"
            >
              View stock
            </Link>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-[10px] tracking-wider uppercase text-[var(--staff-muted)] font-semibold pb-2 border-b border-[var(--staff-border)]">
              <div className="col-span-6">Product</div>
              <div className="col-span-2 text-center">Free</div>
              <div className="col-span-2 text-center">Held</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {lowStock.slice(0, 5).map((p) => {
              const v = p.variants?.[0];
              if (!v) return null;
              const free = v.qty - v.reserved;
              const status = free === 0 ? 'OUT' : 'LOW';
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-[var(--staff-border)] last:border-b-0"
                >
                  <div className="col-span-6 text-[var(--staff-text)] truncate">
                    {p.name} · {v.size}/{v.color}
                  </div>
                  <div className="col-span-2 text-center font-semibold text-[var(--staff-text)]">
                    {free}
                  </div>
                  <div className="col-span-2 text-center text-[var(--staff-muted)]">
                    {v.reserved}
                  </div>
                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        status === 'OUT'
                          ? 'bg-[var(--staff-danger)]/15 text-[var(--staff-danger)]'
                          : 'bg-[var(--staff-warning)]/15 text-[var(--staff-warning)]'
                      }`}
                    >
                      {status === 'OUT' ? 'Out' : 'Low'}
                    </span>
                  </div>
                </div>
              );
            })}
            {lowStock.length === 0 && (
              <div className="text-xs text-[var(--staff-muted)] text-center py-6">
                All items in stock ✓
              </div>
            )}
          </div>

          <div className="text-[10px] text-[var(--staff-muted)] mt-3 leading-relaxed">
            Held means reserved by online orders, so staff can see why an item isn&apos;t available.
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SALES BY HOUR + TOP SELLERS                       */}
      {/* ============================================ */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sales by hour */}
        <div className="staff-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
              Sales by hour
            </h2>
            <span className="text-xs text-[var(--staff-muted)]">9 AM to 9 PM</span>
          </div>
          <SalesByHourChart />
        </div>

        {/* Top sellers */}
        <div className="staff-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-[var(--staff-text)]">
              Top sellers
            </h2>
            <span className="text-xs text-[var(--staff-muted)]">today</span>
          </div>
          <div className="text-xs text-[var(--staff-muted)] text-center py-8">
            No sales yet
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 text-center text-[10px] text-[var(--staff-muted)]">
        Updated {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.
        Refreshes every 30 seconds.
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function KpiCard({
  icon,
  label,
  value,
  sub,
  trend,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="staff-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--staff-tile-bg)] text-[var(--staff-muted)] flex items-center justify-center">
          <Icon name={icon} size={14} />
        </div>
        <div className="text-xs text-[var(--staff-muted)] font-medium">
          {label}
        </div>
      </div>
      <div className="font-serif text-3xl font-bold text-[var(--staff-text)] mb-1">
        {value}
      </div>
      <div
        className={`text-xs ${
          trend === 'up'
            ? 'text-[var(--staff-success)]'
            : trend === 'down'
            ? 'text-[var(--staff-danger)]'
            : 'text-[var(--staff-muted)]'
        }`}
      >
        {sub}
      </div>
    </div>
  );
}

function ShiftRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[var(--staff-muted)]">{label}</span>
      <span
        className={`${
          bold ? 'font-bold text-[var(--staff-text)]' : 'font-medium text-[var(--staff-text)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--staff-border)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--staff-accent)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-serif text-2xl font-bold text-[var(--staff-text)]">
          {value}%
        </span>
      </div>
    </div>
  );
}

function PaymentRow({
  label,
  amount,
  percent,
  color,
}: {
  label: string;
  amount: number;
  percent: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[var(--staff-text)] font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--staff-text)] font-semibold">
            {tk(amount)}
          </span>
          <span className="text-[var(--staff-muted)]">· {percent}%</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-[var(--staff-border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

function OrderTile({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: 'warning' | 'danger';
}) {
  const valueColor =
    tone === 'warning'
      ? 'text-[var(--staff-warning)]'
      : tone === 'danger'
      ? 'text-[var(--staff-danger)]'
      : 'text-[var(--staff-text)]';

  return (
    <div className="bg-[var(--staff-tile-bg)] rounded-lg py-3 px-2 text-center">
      <div className={`font-serif text-xl font-bold ${valueColor}`}>
        {value}
      </div>
      <div className="text-[10px] text-[var(--staff-muted)] mt-0.5">
        {label}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  sub,
  shortcut,
}: {
  href: string;
  icon: string;
  label: string;
  sub: string;
  shortcut?: string;
}) {
  return (
    <Link
      href={href}
      className="staff-card p-4 flex flex-col items-center text-center hover:scale-[1.02] transition-transform"
    >
      <div className="w-12 h-12 rounded-xl bg-[var(--staff-tile-bg)] text-[var(--staff-accent)] flex items-center justify-center mb-3">
        <Icon name={icon} size={22} />
      </div>
      <div className="font-semibold text-[var(--staff-text)] text-sm mb-0.5">
        {label}
      </div>
      <div className="text-[10px] text-[var(--staff-muted)]">{sub}</div>
      {shortcut && (
        <div className="mt-2 px-1.5 py-0.5 rounded bg-[var(--staff-tile-bg)] text-[9px] font-mono text-[var(--staff-muted)] border border-[var(--staff-border)]">
          {shortcut}
        </div>
      )}
    </Link>
  );
}

function SalesByHourChart() {
  // Demo data — replaced later with real API
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const values = [20, 35, 55, 80, 30, 25, 60, 90, 120, 75, 45, 25];
  const max = Math.max(...values);
  const currentHour = new Date().getHours();

  return (
    <div className="flex items-end justify-between gap-1 h-40 pt-2">
      {hours.map((h, i) => {
        const heightPct = (values[i] / max) * 100;
        const isCurrent = h === currentHour;
        return (
          <div key={h} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${heightPct}%`,
                background: isCurrent
                  ? 'var(--staff-accent)'
                  : 'var(--staff-primary)',
                opacity: isCurrent ? 1 : 0.65,
                minHeight: '8px',
              }}
            />
            <div className="text-[10px] text-[var(--staff-muted)]">
              {h > 12 ? h - 12 : h}
            </div>
          </div>
        );
      })}
    </div>
  );
}