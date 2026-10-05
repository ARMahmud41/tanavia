'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk, formatDateTime } from '@/lib/format';
import { ShippingLabel } from '@/components/ShippingLabel';

// ============================================
// Types
// ============================================
interface OrderItem {
  id: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: string | number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  channel: string;
  customerName: string;
  customerPhone: string;
  address?: string | null;
  district?: string | null;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  note?: string | null;
  createdAt: string;
  items: OrderItem[];
}

// ============================================
// Constants
// ============================================
const STATUS_TABS = [
  { value: 'PACKED', label: 'Ready to ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'ALL', label: 'All pending' },
];

// ============================================
// Page
// ============================================
export default function StaffShippingLabelsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('PACKED');

  // Print modal
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getToken() || undefined;

        const qs = new URLSearchParams();
        qs.set('limit', '50');
        qs.set('channel', 'ONLINE');
        if (statusTab !== 'ALL') qs.set('status', statusTab);
        if (search.trim()) qs.set('q', search.trim());

        const res = await api.get<Order[]>(`/api/orders?${qs.toString()}`, {
          token,
        });

        let items = res.data || [];

        // In ALL mode: filter out DELIVERED/CANCELLED
        if (statusTab === 'ALL') {
          items = items.filter((o) =>
            ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED'].includes(o.status)
          );
        }

        setOrders(items);
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
    load();
  }, [statusTab, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      className="p-6 md:p-8 min-h-screen print:p-0 print:bg-white"
      style={{ background: 'var(--staff-bg)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--staff-primary)' }}
          >
            <span className="text-white font-bold text-xl">📦</span>
          </div>
          <div>
            <h1
              className="font-serif text-2xl md:text-3xl font-semibold mb-0.5"
              style={{ color: 'var(--staff-text)' }}
            >
              Shipping Labels
            </h1>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              Print delivery labels for online orders
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="rounded-lg p-2 mb-5 inline-flex gap-1 print:hidden"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusTab(t.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              statusTab === t.value ? 'text-white' : ''
            }`}
            style={
              statusTab === t.value
                ? { background: 'var(--staff-primary)' }
                : { color: 'var(--staff-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        className="rounded-lg p-4 mb-5 print:hidden"
        style={{
          background: 'var(--staff-card)',
          boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number, customer name or phone..."
              className="w-full rounded-lg px-3.5 py-2 pl-10 text-sm border focus:outline-none"
              style={{
                background: 'var(--staff-tile-bg, #F1F3F6)',
                color: 'var(--staff-text)',
                borderColor: 'transparent',
              }}
            />
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--staff-muted)' }}
            >
              🔍
            </span>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
            style={{ background: 'var(--staff-primary)' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 print:hidden">
          {error}
        </div>
      )}

      {/* Order List */}
      <div className="space-y-3 print:hidden">
        {loading ? (
          <div
            className="p-16 text-center text-sm rounded-lg"
            style={{
              background: 'var(--staff-card)',
              color: 'var(--staff-muted)',
            }}
          >
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div
            className="p-16 text-center rounded-lg"
            style={{ background: 'var(--staff-card)' }}
          >
            <div className="text-4xl mb-3">📦</div>
            <p className="mb-2" style={{ color: 'var(--staff-text)' }}>
              No orders to ship
            </p>
            <p className="text-sm" style={{ color: 'var(--staff-muted)' }}>
              {statusTab === 'PACKED'
                ? 'Orders marked PACKED will appear here'
                : 'Try changing the tab'}
            </p>
          </div>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              className="rounded-lg p-4 flex items-start gap-4"
              style={{
                background: 'var(--staff-card)',
                boxShadow: '0 2px 10px rgba(15,42,92,0.06)',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="font-mono font-semibold text-sm"
                    style={{ color: 'var(--staff-primary)' }}
                  >
                    {o.orderNumber}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      o.status === 'PACKED'
                        ? 'bg-purple-100 text-purple-700'
                        : o.status === 'SHIPPED'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <div
                  className="font-medium"
                  style={{ color: 'var(--staff-text)' }}
                >
                  {o.customerName}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  {o.customerPhone} · {o.district || '—'}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: 'var(--staff-muted)' }}
                >
                  {o.items.length} item{o.items.length !== 1 ? 's' : ''} ·{' '}
                  {tk(o.total)} ·{' '}
                  <span
                    style={{
                      color:
                        o.paymentMethod === 'COD'
                          ? 'var(--staff-warning)'
                          : 'var(--staff-success)',
                    }}
                  >
                    {o.paymentMethod}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelected(o)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition whitespace-nowrap"
                style={{ background: 'var(--staff-primary)' }}
              >
                🖨️ Print Label
              </button>
            </div>
          ))
        )}
      </div>

      {/* Print Preview Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto print:static print:p-0 print:bg-white print:block"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="w-full max-w-3xl rounded-lg print:max-w-none print:rounded-none"
            style={{ background: 'white' }}
          >
            {/* Modal header */}
            <div
              className="p-4 border-b flex items-center justify-between print:hidden sticky top-0 z-10"
              style={{ background: 'white', borderColor: '#E5E7EB' }}
            >
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">
                  Shipping Label Preview
                </h2>
                <p className="text-xs text-[#8A8F98]">
                  Order {selected.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg text-[#8A8F98] hover:bg-[#F1F3F6]"
              >
                ✕
              </button>
            </div>

            {/* Print area */}
            <div
              id="shipping-print-area"
              className="p-6 flex justify-center bg-gray-50"
            >
              <div className="bg-white shadow-sm">
                <ShippingLabel
                  orderNumber={selected.orderNumber}
                  customerName={selected.customerName}
                  customerPhone={selected.customerPhone}
                  address={selected.address || ''}
                  district={selected.district || ''}
                  total={selected.total}
                  paymentMethod={selected.paymentMethod}
                  items={selected.items}
                  note={selected.note}
                />
              </div>
            </div>

            {/* Actions */}
            <div
              className="p-4 border-t flex justify-end gap-2 print:hidden"
              style={{ borderColor: '#E5E7EB' }}
            >
              <button
                onClick={() => setSelected(null)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] hover:bg-[#F1F3F6] transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition flex items-center gap-2"
              >
                🖨️ Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #shipping-print-area,
          #shipping-print-area * {
            visibility: visible;
          }
          #shipping-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            background: white;
          }
          @page {
            size: A5;
            margin: 5mm;
          }
        }
      `}</style>
    </div>
  );
}