'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============================================
// Types
// ============================================
interface Kpis {
  salesToday: number;
  salesYesterday: number;
  salesChange: number;
  profitToday: number;
  profitYesterday: number;
  profitChange: number;
  ordersToday: number;
  ordersYesterday: number;
  ordersChange: number;
  totalOrders: number;
  waitingConfirmation: number;
  customersTotal: number;
  customersToday: number;
  lowStockCount: number;
}

interface DayData {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: string | number;
  status: string;
  paymentStatus: string;
  channel: string;
  createdAt: string;
}

interface TopProduct {
  id: string;
  name: string;
  slug: string;
  soldCount: number;
  price: number;
  image: string | null;
}

interface LowStockItem {
  id: string;
  size: string;
  color: string;
  qty: number;
  reorderLevel: number;
  product: { id: string; name: string; slug: string };
}

interface PaymentBreakdown {
  method: string;
  count: number;
  amount: number;
}

interface CategoryPerf {
  slug: string;
  name: string;
  revenue: number;
  profit: number;
  qty: number;
}

interface ProductPerf {
  id: string;
  name: string;
  slug: string;
  revenue: number;
  profit: number;
  qty: number;
}

interface HourData {
  hour: number;
  label: string;
  revenue: number;
  orders: number;
}

interface Analytics {
  weekGrowth: number;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  categoryPerformance: CategoryPerf[];
  bestProduct: ProductPerf | null;
  worstProduct: ProductPerf | null;
  topProducts: ProductPerf[];
  hourlyData: HourData[];
  peakHour: { hour: number; label: string; revenue: number; orders: number };
  forecastMonthly: number;
  avgDailyRevenue: number;
  returnRate: number;
  returnCount: number;
}

interface DashboardData {
  kpis: Kpis;
  revenue7d: DayData[];
  recentOrders: Order[];
  topProducts: TopProduct[];
  lowStockItems: LowStockItem[];
  statusBreakdown: Record<string, number>;
  paymentBreakdown: PaymentBreakdown[];
  analytics: Analytics;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CONFIRMED: '#2563EB',
  PACKED: '#7C3AED',
  SHIPPED: '#0891B2',
  DELIVERED: '#059669',
  CANCELLED: '#DC2626',
  REFUNDED: '#6B7280',
};

const PIE_COLORS = ['#0F2A5C', '#2F7D7A', '#D97706', '#7C3AED', '#DC2626', '#059669'];

// ============================================
// Page
// ============================================
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const token = getToken() || undefined;
      const res = await api.get<DashboardData>('/api/admin/dashboard/stats', {
        token,
      });
      setData(res.data || null);
      setError('');
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
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  const k = data?.kpis;

  const statusPie = data?.statusBreakdown
    ? Object.entries(data.statusBreakdown)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({
          name,
          value,
          color: STATUS_COLORS[name] || '#6B7280',
        }))
    : [];

  if (loading) {
    return (
      <div className="p-6 sm:p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center py-20 text-[#8A8F98]">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0F2A5C]">
            Dashboard
          </h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">
            Overview of today&apos;s performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E8EBF0] text-[#0F2A5C] hover:bg-[#F1F3F6] transition min-h-[40px]"
          >
            ↻ Refresh
          </button>
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F2A5C] text-white hover:bg-[#0A1F45] transition min-h-[40px] flex items-center"
          >
            🛍 View Shop
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard
          label="Sales Today"
          value={tk(k?.salesToday ?? 0)}
          change={k?.salesChange ?? 0}
          hint={`Yesterday: ${tk(k?.salesYesterday ?? 0)}`}
          icon="💰"
          color="navy"
        />
        <KpiCard
          label="Profit Today"
          value={tk(k?.profitToday ?? 0)}
          change={k?.profitChange ?? 0}
          hint={`Yesterday: ${tk(k?.profitYesterday ?? 0)}`}
          icon="📈"
          color="emerald"
        />
        <KpiCard
          label="Orders Today"
          value={String(k?.ordersToday ?? 0)}
          change={k?.ordersChange ?? 0}
          hint={`All-time: ${k?.totalOrders ?? 0}`}
          icon="📦"
          color="purple"
        />
        <KpiCard
          label="Waiting Confirmation"
          value={String(k?.waitingConfirmation ?? 0)}
          hint={`Customers: ${k?.customersTotal ?? 0} (+${k?.customersToday ?? 0} today)`}
          icon="⏰"
          color="amber"
          warn={(k?.waitingConfirmation ?? 0) > 0}
        />
      </div>

      {/* Revenue + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
                Revenue, last 7 days
              </h2>
              <p className="text-xs text-[#8A8F98] mt-0.5">
                {tk(data?.revenue7d.reduce((s, d) => s + d.revenue, 0) || 0)}{' '}
                total revenue
              </p>
            </div>
          </div>

          {data?.revenue7d && data.revenue7d.some((d) => d.revenue > 0) ? (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={data.revenue7d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#8A8F98' }}
                    stroke="#E8EBF0"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#8A8F98' }}
                    stroke="#E8EBF0"
                    tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E8EBF0',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => `৳${Number(v).toLocaleString()}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#0F2A5C"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name="Profit"
                    fill="#2F7D7A"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">📊</div>
              <p>No orders in the last 7 days</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-5">
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C] mb-4">
            Order Status
          </h2>

          {statusPie.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-sm text-[#8A8F98]">
              <div className="text-3xl mb-2">📦</div>
              <p>No orders yet</p>
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                      paddingAngle={2}
                    >
                      {statusPie.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #E8EBF0',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 space-y-1.5">
                {statusPie.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="text-[#5A6270] font-medium capitalize">
                        {s.name.toLowerCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-[#0F2A5C]">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ANALYTICS INSIGHT CARDS */}
      {data?.analytics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <InsightCard
              icon="📈"
              label="Week-over-Week"
              value={`${data.analytics.weekGrowth > 0 ? '+' : ''}${data.analytics.weekGrowth}%`}
              hint={`${tk(data.analytics.thisWeekRevenue)} vs ${tk(data.analytics.lastWeekRevenue)}`}
              positive={data.analytics.weekGrowth >= 0}
            />
            <InsightCard
              icon="⏰"
              label="Peak Hour"
              value={data.analytics.peakHour.label}
              hint={`${data.analytics.peakHour.orders} orders · ${tk(data.analytics.peakHour.revenue)}`}
              positive={true}
            />
            <InsightCard
              icon="🔮"
              label="Monthly Forecast"
              value={tk(data.analytics.forecastMonthly)}
              hint={`Avg ${tk(data.analytics.avgDailyRevenue)}/day`}
              positive={true}
            />
            <InsightCard
              icon="↩️"
              label="Return Rate"
              value={`${data.analytics.returnRate}%`}
              hint={`${data.analytics.returnCount} returns this week`}
              positive={data.analytics.returnRate < 5}
            />
          </div>

          {/* Category + Hourly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
            <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
                  📂 Category Performance
                </h2>
                <span className="text-[10px] text-[#8A8F98] uppercase tracking-wide">
                  This week
                </span>
              </div>

              {data.analytics.categoryPerformance.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#8A8F98]">
                  No category sales this week
                </div>
              ) : (
                <div className="space-y-3">
                  {data.analytics.categoryPerformance
                    .slice(0, 5)
                    .map((cat, idx) => {
                      const maxRev =
                        data.analytics.categoryPerformance[0]?.revenue || 1;
                      const pct = (cat.revenue / maxRev) * 100;
                      return (
                        <div key={cat.slug}>
                          <div className="flex items-center justify-between mb-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-base">
                                {['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx] || '•'}
                              </span>
                              <span className="font-semibold text-[#0F2A5C] capitalize">
                                {cat.name}
                              </span>
                              <span className="text-[#8A8F98]">
                                · {cat.qty} sold
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-wine">
                                {tk(cat.revenue)}
                              </span>
                              <span className="text-[10px] text-emerald-600 ml-2">
                                +{tk(cat.profit)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-[#F1F3F6] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#0F2A5C] to-[#2F7D7A] transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
                  🕐 Best Selling Hours
                </h2>
                <span className="text-[10px] text-[#8A8F98] uppercase tracking-wide">
                  This week
                </span>
              </div>

              {data.analytics.hourlyData.every((h) => h.orders === 0) ? (
                <div className="text-center py-8 text-sm text-[#8A8F98]">
                  No sales data yet
                </div>
              ) : (
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.analytics.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8EBF0" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 10, fill: '#8A8F98' }}
                        stroke="#E8EBF0"
                        tickFormatter={(h) => `${h}h`}
                        interval={2}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#8A8F98' }}
                        stroke="#E8EBF0"
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #E8EBF0',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [`${v} orders`, 'Orders']}
                        labelFormatter={(h) => `${h}:00`}
                      />
                      <Bar
                        dataKey="orders"
                        fill="#0F2A5C"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-3 text-[10px] text-[#8A8F98] text-center">
                💡 Most sales at{' '}
                <strong className="text-[#0F2A5C]">
                  {data.analytics.peakHour.label}
                </strong>
              </div>
            </div>
          </div>

          {/* Best/Worst */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
            {data.analytics.bestProduct && (
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg border border-emerald-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🏆</span>
                  <h2 className="font-serif text-base font-semibold text-emerald-800">
                    Best Performer (by profit)
                  </h2>
                </div>
                <div className="text-lg font-bold text-ink mb-1">
                  {data.analytics.bestProduct.name}
                </div>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-emerald-700 font-semibold">
                    +{tk(data.analytics.bestProduct.profit)} profit
                  </span>
                  <span className="text-muted">
                    {data.analytics.bestProduct.qty} sold
                  </span>
                  <span className="text-muted">
                    {tk(data.analytics.bestProduct.revenue)} revenue
                  </span>
                </div>
              </div>
            )}

            {data.analytics.worstProduct &&
              data.analytics.bestProduct &&
              data.analytics.worstProduct.profit <
                data.analytics.bestProduct.profit / 2 && (
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-lg border border-amber-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⚠️</span>
                    <h2 className="font-serif text-base font-semibold text-amber-800">
                      Needs Attention
                    </h2>
                  </div>
                  <div className="text-lg font-bold text-ink mb-1">
                    {data.analytics.worstProduct.name}
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-amber-700 font-semibold">
                      {tk(data.analytics.worstProduct.profit)} profit
                    </span>
                    <span className="text-muted">
                      {data.analytics.worstProduct.qty} sold
                    </span>
                    <span className="text-muted">
                      {tk(data.analytics.worstProduct.revenue)} revenue
                    </span>
                  </div>
                </div>
              )}
          </div>
        </>
      )}

      {/* Recent orders + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E8EBF0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EBF0]">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs text-[#0F2A5C] font-semibold hover:underline"
            >
              View all →
            </Link>
          </div>

          {!data?.recentOrders?.length ? (
            <div className="p-10 text-center text-sm text-[#8A8F98]">
              No orders yet
            </div>
          ) : (
            <div className="divide-y divide-[#F1F3F6]">
              {data.recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#F7F8FA] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#0F2A5C]">
                        {o.orderNumber}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: `${STATUS_COLORS[o.status] || '#6B7280'}15`,
                          color: STATUS_COLORS[o.status] || '#6B7280',
                        }}
                      >
                        {o.status}
                      </span>
                      <span className="text-[10px] text-[#8A8F98]">
                        {o.channel === 'ONLINE' ? '🌐' : '🏪'}
                      </span>
                    </div>
                    <div className="text-xs text-[#5A6270] mt-0.5 truncate">
                      {o.customerName} · {formatDateTime(o.createdAt)}
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="font-bold text-[#0F2A5C] text-sm">
                      {tk(o.total)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8EBF0]">
            <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
              Top Selling
            </h2>
          </div>

          {!data?.topProducts?.length ? (
            <div className="p-10 text-center text-sm text-[#8A8F98]">
              No sales yet
            </div>
          ) : (
            <div className="divide-y divide-[#F1F3F6]">
              {data.topProducts.map((p, idx) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#F7F8FA] transition"
                >
                  <div className="w-8 h-8 rounded-full bg-[#F1F3F6] flex items-center justify-center text-xs font-bold text-[#0F2A5C] flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="w-10 h-10 rounded bg-[#F1F3F6] overflow-hidden flex-shrink-0">
                    {p.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        📷
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#0F2A5C] truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-[#8A8F98]">
                      {p.soldCount} sold
                    </div>
                  </div>
                  <div className="text-xs font-bold text-wine flex-shrink-0">
                    {tk(p.price)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock + Payments + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8EBF0]">
            <h2 className="font-serif text-base font-semibold text-amber-800 flex items-center gap-2">
              ⚠️ Low Stock
              {k?.lowStockCount ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  {k.lowStockCount}
                </span>
              ) : null}
            </h2>
            <Link
              href="/admin/inventory/low-stock"
              className="text-xs text-[#0F2A5C] font-semibold hover:underline"
            >
              View →
            </Link>
          </div>

          {!data?.lowStockItems?.length ? (
            <div className="p-8 text-center text-sm text-emerald-700">
              ✅ Everything is stocked
            </div>
          ) : (
            <div className="divide-y divide-[#F1F3F6]">
              {data.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#0F2A5C] truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-[#8A8F98]">
                      {item.size} / {item.color}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      item.qty === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.qty} left
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-5">
          <h2 className="font-serif text-base font-semibold text-[#0F2A5C] mb-4">
            Payments
          </h2>

          {!data?.paymentBreakdown?.length ? (
            <div className="text-center text-sm text-[#8A8F98] py-8">
              No payments yet
            </div>
          ) : (
            <div className="space-y-3">
              {data.paymentBreakdown.map((p, idx) => {
                const totalAmt = data.paymentBreakdown.reduce(
                  (s, x) => s + x.amount,
                  0
                );
                const pct = totalAmt > 0 ? (p.amount / totalAmt) * 100 : 0;
                return (
                  <div key={p.method}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#5A6270] font-medium">
                        {p.method}
                      </span>
                      <span className="font-semibold text-[#0F2A5C]">
                        {tk(p.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#F1F3F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: PIE_COLORS[idx % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-5">
          <h2 className="font-serif text-base font-semibold text-[#0F2A5C] mb-4">
            Quick Actions
          </h2>

          <div className="space-y-2">
            <QuickAction
              href="/admin/products/new"
              icon="➕"
              label="Add Product"
            />
            <QuickAction href="/admin/orders" icon="📦" label="View Orders" />
            <QuickAction href="/admin/finance" icon="💰" label="Finance" />
            <QuickAction href="/admin/courier" icon="🚚" label="Courier" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Components
// ============================================
function KpiCard({
  label,
  value,
  change,
  hint,
  icon,
  color,
  warn,
}: {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  icon: string;
  color: 'navy' | 'emerald' | 'purple' | 'amber';
  warn?: boolean;
}) {
  const colors = {
    navy: 'from-[#0F2A5C] to-[#1F4E79]',
    emerald: 'from-emerald-500 to-emerald-700',
    purple: 'from-purple-500 to-purple-700',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className="relative bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-4">
      {warn && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-semibold">
          {label}
        </div>
        <div className="text-lg">{icon}</div>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-[#0F2A5C] leading-tight">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {change !== undefined && change !== 0 && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              change > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
        {hint && (
          <span className="text-[10px] text-[#8A8F98] truncate">{hint}</span>
        )}
      </div>
      <div
        className={`absolute bottom-0 left-0 h-1 w-full rounded-b-lg bg-gradient-to-r ${colors[color]}`}
      />
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  hint,
  positive,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
  positive: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-[#E8EBF0] shadow-sm p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-semibold">
          {label}
        </span>
      </div>
      <div
        className={`text-xl sm:text-2xl font-bold leading-tight ${
          positive ? 'text-[#0F2A5C]' : 'text-amber-700'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-[#8A8F98] mt-1">{hint}</div>
      <div
        className={`absolute bottom-0 left-0 h-1 w-full ${
          positive
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
            : 'bg-gradient-to-r from-amber-400 to-amber-600'
        }`}
      />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E8EBF0] hover:border-wine hover:bg-[#F7F8FA] transition group"
    >
      <span className="text-base">{icon}</span>
      <span className="text-xs font-semibold text-[#0F2A5C] group-hover:text-wine">
        {label}
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto text-[#8A8F98] group-hover:text-wine"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}