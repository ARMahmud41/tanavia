'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Courier {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  active: boolean;
  isDefault: boolean;
  codFeePercent: string | number;
}

interface OrderLike {
  id: string;
  orderNumber: string;
  status: string;
  courier?: string | null;
  courierId?: string | null;
  courierRef?: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  } | null;
  consignmentId?: string | null;
  courierStatus?: string | null;
  trackingUrl?: string | null;
  codAmount?: string | number | null;
  paymentMethod: string;
  total: string | number;
  district?: string | null;
}

interface Props {
  order: OrderLike;
  onRefresh: () => void;
  onPrintLabel: () => void;
}

// ============================================
// Component
// ============================================
export function CourierBookingCard({ order, onRefresh, onPrintLabel }: Props) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [weightKg, setWeightKg] = useState('0.5');
  const [booking, setBooking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isBooked = Boolean(order.courierId || order.consignmentId);
  const canBook = ['PACKED', 'CONFIRMED', 'PLACED'].includes(order.status);

  useEffect(() => {
    if (isBooked) return;
    async function loadCouriers() {
      try {
        const token = getToken() || undefined;
        const res = await api.get<Courier[]>(
          '/api/courier?active=true',
          { token }
        );
        setCouriers(res.data || []);
        const def = (res.data || []).find((c) => c.isDefault);
        if (def) setSelectedCourierId(def.id);
        else if ((res.data || []).length === 1)
          setSelectedCourierId(res.data[0].id);
      } catch {
        // silent
      }
    }
    loadCouriers();
  }, [isBooked]);

  async function handleBook() {
    if (!selectedCourierId) {
      setError('Please select a courier');
      return;
    }
    setBooking(true);
    setError('');
    setSuccess('');
    try {
      const token = getToken() || undefined;
      const res = await api.post<any>(
        '/api/courier-booking/book',
        {
          orderId: order.id,
          courierId: selectedCourierId,
          weightKg: Number(weightKg) || 0.5,
        },
        { token }
      );
      const data = res.data || {};
      setSuccess(
        `✅ Booked! Consignment: ${data.consignmentId || 'N/A'}`
      );
      onRefresh();
      // Auto-open shipping label after short delay
      setTimeout(() => {
        onPrintLabel();
      }, 800);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Booking failed';
      setError(msg);
    } finally {
      setBooking(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    try {
      const token = getToken() || undefined;
      await api.post(`/api/courier-booking/sync/${order.id}`, {}, { token });
      setSuccess('✅ Status synced');
      onRefresh();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Sync failed';
      setError(msg);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
      <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4 flex items-center gap-2">
        🚚 Courier
        {isBooked && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold uppercase">
            Booked
          </span>
        )}
      </h2>

      {/* Error / Success */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      {isBooked ? (
        /* ============================================
         * Booked UI
         * ============================================ */
        <div className="space-y-3 text-sm">
          {/* Courier info */}
          <div className="flex items-center gap-3 pb-3 border-b border-[#E8EBF0]">
            <div className="w-10 h-10 rounded-lg bg-[#F1F3F6] border border-[#E8EBF0] flex items-center justify-center overflow-hidden flex-shrink-0">
              {order.courierRef?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.courierRef.logo}
                  alt={order.courierRef.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="text-[#0F2A5C] font-bold">
                  {(order.courierRef?.name || order.courier || 'C').charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div className="font-semibold text-[#0F2A5C]">
                {order.courierRef?.name || order.courier}
              </div>
              <div className="text-xs text-[#8A8F98]">
                {order.district} · {order.paymentMethod}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex justify-between">
            <span className="text-[#8A8F98]">Consignment</span>
            <span className="font-mono text-xs text-[#0F2A5C] font-semibold">
              {order.consignmentId}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8A8F98]">Status</span>
            <span className="font-medium text-[#0F2A5C]">
              {order.courierStatus || 'BOOKED'}
            </span>
          </div>
          {order.codAmount && Number(order.codAmount) > 0 && (
            <div className="flex justify-between">
              <span className="text-[#8A8F98]">COD Amount</span>
              <span className="font-semibold text-[#0F2A5C]">
                {tk(order.codAmount)}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#E8EBF0] text-[#0F2A5C] hover:bg-[#F1F3F6] disabled:opacity-50 transition"
            >
              {syncing ? '⏳ Syncing...' : '🔄 Sync Status'}
            </button>
            <button
              onClick={onPrintLabel}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#0F2A5C] text-white hover:bg-[#0A1F45] transition"
            >
              🖨️ Print Label
            </button>
          </div>

          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-[#0F2A5C] underline pt-1"
            >
              🔗 Open tracking page
            </a>
          )}
        </div>
      ) : (
        /* ============================================
         * Booking UI
         * ============================================ */
        <div className="space-y-3">
          {!canBook ? (
            <div className="text-xs text-[#8A8F98] bg-[#F1F4F9] rounded-lg p-3">
              ℹ️ Order must be PACKED or CONFIRMED to book a courier. Current:{' '}
              <strong>{order.status}</strong>
            </div>
          ) : (
            <>
              {/* Courier picker */}
              <div>
                <label className="block text-xs font-medium text-[#0F2A5C] mb-1">
                  Select Courier
                </label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm border border-[#E8EBF0] focus:outline-none focus:border-[#0F2A5C]"
                >
                  <option value="">— Choose —</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-medium text-[#0F2A5C] mb-1">
                  Parcel Weight
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 pr-10 text-sm border border-[#E8EBF0] focus:outline-none focus:border-[#0F2A5C]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8F98]">
                    kg
                  </span>
                </div>
              </div>

              {/* COD info */}
              {order.paymentMethod === 'COD' && (
                <div className="text-xs bg-[#F1F4F9] rounded-lg px-3 py-2 text-[#0F2A5C]">
                  💰 Collect <strong>{tk(order.total)}</strong> from customer
                </div>
              )}

              {/* Book button */}
              <button
                onClick={handleBook}
                disabled={booking || !selectedCourierId}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#0F2A5C] text-white hover:bg-[#0A1F45] disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {booking ? '📦 Booking...' : '📦 Book Courier'}
              </button>

              <p className="text-[10px] text-[#8A8F98] text-center">
                Order will move to SHIPPED and label will open for printing
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}