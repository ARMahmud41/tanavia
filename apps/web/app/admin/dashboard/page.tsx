'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

interface FinanceSummary {
  onlineRevenue: number;
  onlineProfit: number;
  onlineMargin: number;
  offlineRevenue?: number;
  offlineProfit?: number;
}

interface OrderListResponse {
  id: string;
  status: string;
}

export default function AdminDashboardPage() {
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [orderCounts, setOrderCounts] = useState({
    today: 0,
    waiting: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getToken() || undefined;

      try {
        const fin = await api.get<FinanceSummary>('/api/finance/summary', {
          token,
        });
        setFinance(fin.data || null);
      } catch {
        // ignore
      }

      try {
        const orders = await api.get<OrderListResponse[]>('/api/orders?limit=200', {
          token,
        });
        const list = orders.data || [];
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = list.filter((o) =>
          // simple heuristic — backend shouldn't return createdAt in this slim call; assume all are today if within list
          true
        ).length;
        const waiting = list.filter((o) => o.status === 'PLACED').length;
        setOrderCounts({
          today: todayCount,
          waiting,
          total: list.length,
        });
      } catch {
        // ignore
      }

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Dashboard
          </h1>
          <p className="text-[#8A8F98] text-sm">
            Overview of today&apos;s performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/orders?status=PLACED"
            className="px-4 py-2 bg-white border border-[#E3E6EB] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F3F6] transition"
          >
            Alerts{' '}
            {orderCounts.waiting > 0 && (
              <span className="inline-block ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                {orderCounts.waiting}
              </span>
            )}
          </Link>
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2 bg-[#0F2A5C] hover:bg-[#0A1F45] text-white rounded-lg text-sm font-medium transition"
          >
            View shop
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Sales today"
          value={tk(finance?.onlineRevenue || 0)}
          sub="online revenue"
          loading={loading}
        />
        <KpiCard
          label="Profit today"
          value={tk(finance?.onlineProfit || 0)}
          sub={`margin ${finance?.onlineMargin ?? 0}%`}
          loading={loading}
        />
        <KpiCard
          label="Waiting for confirmation"
          value={String(orderCounts.waiting)}
          sub="orders need a call"
          loading={loading}
          highlight={orderCounts.waiting > 0}
        />
        <KpiCard
          label="Total orders"
          value={String(orderCounts.total)}
          sub="all time"
          loading={loading}
        />
      </div>

      {/* Revenue chart placeholder */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-6 mb-6">
        <h2 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-4">
          Revenue, last 7 days
        </h2>
        <div className="h-40 flex items-end gap-3 border-b border-[#E3E6EB] pb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="flex-1 flex flex-col items-center">
              <div className="w-full h-1 bg-[#0F2A5C] rounded" />
              <span className="text-[10px] text-[#8A8F98] mt-2">{d}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#8A8F98] mt-3">
          Analytics integration coming soon.
        </p>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-6">
        <h2 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/admin/products/new" icon="+" label="Add Product" />
          <QuickAction href="/admin/orders" icon="📦" label="View Orders" />
          <QuickAction href="/admin/finance" icon="💰" label="Finance" />
          <QuickAction href="/admin/courier" icon="🚚" label="Courier" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  loading,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
      <div className="text-xs text-[#8A8F98] uppercase tracking-wide mb-2">
        {label}
      </div>
      <div
        className={`font-serif text-3xl font-semibold mb-1 ${
          highlight ? 'text-red-600' : 'text-[#0F2A5C]'
        }`}
      >
        {loading ? '—' : value}
      </div>
      <div className="text-xs text-[#8A8F98]">{sub}</div>
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
      className="border border-[#E3E6EB] rounded-lg p-4 hover:border-[#0F2A5C] hover:bg-[#F1F3F6] transition flex items-center gap-3"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-[#0F2A5C]">{label}</span>
    </Link>
  );
}