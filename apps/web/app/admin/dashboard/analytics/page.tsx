'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Link from 'next/link';
import { tk } from '@/lib/format';

interface DailyData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

interface AnalyticsData {
  range: { from: string; to: string };
  totals: {
    revenue: number;
    profit: number;
    orders: number;
    items: number;
    avgOrderValue: number;
  };
  dailyTrend: DailyData[];
  paymentBreakdown: Record<string, number>;
  channelBreakdown: Record<string, number>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState<'1d' | '7d' | '30d' | 'custom'>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken() || undefined;
      let url = '/api/admin/dashboard/analytics';

      if (period === 'custom' && customFrom && customTo) {
        url += `?from=${customFrom}&to=${customTo}`;
      } else if (period !== 'custom') {
        url += `?period=${period}`;
      }

      const res = await api.get<AnalyticsData>(url, { token });
      setData(res.data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePrint() {
    window.print();
  }

  const maxRevenue = Math.max(
    ...(data?.dailyTrend.map((d) => Math.max(d.revenue, d.profit)) || [1]),
    1
  );

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen print:bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3 print:hidden">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-sm text-gray-500 hover:text-[#0F2A5C] mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C]">
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sales, profit, and order insights
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-[#0F2A5C] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition"
        >
          🖨️ Print Report
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E8EBF0] p-4 mb-5 flex flex-wrap gap-3 items-end print:hidden">
        <div className="flex gap-2">
          {(['1d', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                period === p
                  ? 'bg-[#0F2A5C] text-white'
                  : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
              }`}
            >
              {p === '1d' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              period === 'custom'
                ? 'bg-[#0F2A5C] text-white'
                : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
            }`}
          >
            Custom
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={load}
              className="bg-[#0F2A5C] text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">
          Loading analytics...
        </div>
      ) : data ? (
        <>
          {/* Print Header */}
          <div className="hidden print:block mb-6 text-center">
            <h1 className="text-2xl font-bold">TANAVIA — Analytics Report</h1>
            <p className="text-sm text-gray-600">
              {new Date(data.range.from).toLocaleDateString('en-GB')} —{' '}
              {new Date(data.range.to).toLocaleDateString('en-GB')}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Revenue"
              value={tk(data.totals.revenue)}
              color="emerald"
            />
            <StatCard
              label="Profit"
              value={tk(data.totals.profit)}
              color="blue"
            />
            <StatCard
              label="Orders"
              value={String(data.totals.orders)}
              color="purple"
            />
            <StatCard
              label="Items Sold"
              value={String(data.totals.items)}
              color="orange"
            />
            <StatCard
              label="Avg Order"
              value={tk(data.totals.avgOrderValue)}
              color="pink"
            />
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E8EBF0] p-6 mb-6">
            <h2 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-6">
              Sales Trend
            </h2>

            {data.dailyTrend.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No data for this period
              </div>
            ) : (
              <div className="space-y-3">
                {data.dailyTrend.map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-xs text-gray-600 font-mono">
                      {new Date(day.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 h-8 bg-gray-100 rounded relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-[#0F2A5C] rounded"
                          style={{
                            width: `${(day.revenue / maxRevenue) * 100}%`,
                          }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white mix-blend-difference">
                          {tk(day.revenue)}
                        </span>
                      </div>
                      <div className="flex-1 h-8 bg-gray-100 rounded relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-500 rounded"
                          style={{
                            width: `${(day.profit / maxRevenue) * 100}%`,
                          }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white mix-blend-difference">
                          {tk(day.profit)}
                        </span>
                      </div>
                    </div>
                    <div className="w-16 text-right text-xs text-gray-500">
                      {day.orders} order{day.orders !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#0F2A5C] rounded" />
                    <span className="text-gray-600">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 rounded" />
                    <span className="text-gray-600">Profit</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Payment Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E8EBF0] p-6">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Payment Methods
              </h2>
              <div className="space-y-3">
                {Object.entries(data.paymentBreakdown).map(
                  ([method, amount]) => (
                    <div key={method} className="flex justify-between text-sm">
                      <span className="text-gray-600">{method}</span>
                      <span className="font-semibold text-[#0F2A5C]">
                        {tk(amount)}
                      </span>
                    </div>
                  )
                )}
                {Object.keys(data.paymentBreakdown).length === 0 && (
                  <p className="text-gray-500 text-sm">
                    No payments in this period
                  </p>
                )}
              </div>
            </div>

            {/* Channel Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E8EBF0] p-6">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Sales Channels
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">🌐 Online</span>
                  <span className="font-semibold text-[#0F2A5C]">
                    {tk(data.channelBreakdown.ONLINE || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">🏪 Offline (POS)</span>
                  <span className="font-semibold text-[#0F2A5C]">
                    {tk(data.channelBreakdown.OFFLINE || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block mt-12 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
            Generated on {new Date().toLocaleString('en-GB')} by TANAVIA Admin
          </div>
        </>
      ) : null}

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
  };

  return (
    <div className={`rounded-xl border-2 ${colors[color]} p-4`}>
      <div className="text-xs font-medium opacity-80 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}