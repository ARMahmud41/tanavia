'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface ReturnRow {
  id: string;
  orderId: string;
  consignmentId?: string | null;
  reason: string;
  outboundFee: string | number;
  returnFee: string | number;
  totalLoss: string | number;
  receivedAt?: string | null;
  itemsRestocked: boolean;
  createdAt: string;
  order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    district: string;
    total: string | number;
  };
  courier: { id: string; name: string; logo?: string | null };
}

interface Stats {
  total: number;
  pending: number;
  received: number;
  totalLoss: number;
}

export default function CourierReturnsPage() {
  const [items, setItems] = useState<ReturnRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'received'>('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = filter !== 'all' ? `?status=${filter}` : '';
      const [listRes, statsRes] = await Promise.all([
        api.get<ReturnRow[]>(`/api/courier-returns${qs}`, { token }),
        api.get<Stats>('/api/courier-returns/stats', { token }),
      ]);
      setItems(listRes.data || []);
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
  }, [filter]);

  async function handleReceive(id: string, restock: boolean) {
    const note = prompt(
      restock ? 'Inspection note (items OK):' : 'Inspection note (damaged):'
    );
    if (note === null) return;
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/courier-returns/${id}/receive`,
        { inspectionNote: note, restock },
        { token }
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/courier"
          className="w-9 h-9 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6]"
        >
          ←
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0F2A5C]">
            Courier Returns
          </h1>
          <p className="text-sm text-[#8A8F98]">
            Parcels coming back from courier partners
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total Returns"
          value={String(stats?.total ?? 0)}
          color="blue"
        />
        <StatCard
          label="Waiting"
          value={String(stats?.pending ?? 0)}
          color="amber"
        />
        <StatCard
          label="Received"
          value={String(stats?.received ?? 0)}
          color="green"
        />
        <StatCard
          label="Total Loss"
          value={tk(stats?.totalLoss ?? 0)}
          color="red"
        />
      </div>

      <div className="rounded-lg p-4 mb-5 bg-white shadow-sm">
        <div className="flex gap-2">
          {(['all', 'pending', 'received'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f
                  ? 'text-white bg-[#0F2A5C] shadow'
                  : 'text-[#8A8F98] bg-[#F1F3F6]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Waiting' : 'Received'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="rounded-lg overflow-hidden bg-white shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-sm text-[#8A8F98]">
            Loading returns...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">↩️</div>
            <p className="text-[#0F2A5C] font-medium">No courier returns</p>
            <p className="text-sm text-[#8A8F98]">
              Parcels returned by couriers will appear here
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                <th className="text-left px-4 py-3 font-medium">Order</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Courier</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
                <th className="text-right px-4 py-3 font-medium">Loss</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-[#E8EBF0]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0F2A5C]">
                    {r.order.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-[#0F2A5C]">
                      {r.order.customerName}
                    </div>
                    <div className="text-[10px] text-[#8A8F98]">
                      {r.order.customerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.courier?.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">
                      {r.reason.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">
                    {tk(Number(r.totalLoss))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.receivedAt ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        ● {r.itemsRestocked ? 'Restocked' : 'Received'}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        ⏳ Waiting
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!r.receivedAt && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleReceive(r.id, true)}
                          className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white font-medium"
                        >
                          Restock
                        </button>
                        <button
                          onClick={() => handleReceive(r.id, false)}
                          className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-600 font-medium"
                        >
                          Damaged
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  color: 'blue' | 'amber' | 'green' | 'red';
}) {
  const colors = {
    blue: 'from-[#0F2A5C] to-[#1F4E79]',
    amber: 'from-amber-500 to-amber-600',
    green: 'from-emerald-500 to-emerald-700',
    red: 'from-red-500 to-red-700',
  };
  return (
    <div className="rounded-lg p-4 bg-white shadow-sm border border-[#E8EBF0]">
      <div className="flex items-center gap-3">
        <div
          className={`w-1 h-10 rounded-full bg-gradient-to-b ${colors[color]}`}
        />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            {label}
          </div>
          <div className="text-xl font-bold text-[#0F2A5C]">{value}</div>
        </div>
      </div>
    </div>
  );
}