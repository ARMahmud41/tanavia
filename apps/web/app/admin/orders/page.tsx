'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  district: string;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  channel: string;
  createdAt: string;
  _count?: { items: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUSES = [
  { value: 'ALL', label: 'All' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
  PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
  SHIPPED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  RETURNED: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '20');
      qs.set('page', String(page));
      if (status !== 'ALL') qs.set('status', status);
      if (search.trim()) qs.set('q', search.trim());

      const token = getToken() || undefined;
      const res = await api.get<Order[]>(
        `/api/orders?${qs.toString()}`,
        { token }
      );
      setOrders(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load orders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Orders
          </h1>
          <p className="text-[#8A8F98] text-sm">
            {pagination?.total ?? 0} orders total
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col md:flex-row md:items-center gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-2 flex-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatus(s.value);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                status === s.value
                  ? 'bg-[#0F2A5C] text-white shadow-[0_2px_6px_rgba(15,42,92,0.2)]'
                  : 'bg-[#F1F3F6] text-[#5A6270] hover:bg-[#E3E6EB]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order # or phone..."
            className="bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 text-sm w-full md:w-64 focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
          />
          <button
            type="submit"
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3.5 py-2 rounded-lg text-sm font-medium transition"
          >
            🔍
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#8A8F98] text-sm">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-[#5A6270] mb-2">No orders found</p>
            <p className="text-sm text-[#8A8F98]">
              Customer order place করলে এখানে দেখাবে
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">District</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-left px-4 py-3 font-medium">Payment</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const statusColor =
                    STATUS_COLORS[o.status.toUpperCase()] ||
                    'bg-gray-100 text-gray-700 border-gray-300';
                  return (
                    <tr
                      key={o.id}
                      className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-[#0F2A5C] font-semibold">
                          {o.orderNumber}
                        </div>
                        <div className="text-xs text-[#8A8F98] mt-0.5">
                          {formatDateTime(o.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">
                          {o.customerName}
                        </div>
                        <div className="text-xs text-[#8A8F98] mt-0.5">
                          {o.customerPhone}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#5A6270]">
                        {o.district}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                        {tk(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-[#5A6270]">
                          {o.paymentMethod}
                        </div>
                        <div className="text-xs mt-0.5">
                          <span
                            className={
                              o.paymentStatus === 'PAID'
                                ? 'text-[#0B7A47]'
                                : 'text-amber-600'
                            }
                          >
                            {o.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColor}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="text-[#0F2A5C] hover:underline text-xs font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <div className="text-sm text-[#8A8F98]">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-white border border-[#E8EBF0] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F4F9] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-[#E8EBF0] rounded-lg text-sm text-[#0F2A5C] hover:bg-[#F1F4F9] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}