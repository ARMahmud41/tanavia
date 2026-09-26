import Link from 'next/link';
import { api } from '@/lib/api';
import { tk, formatDateTime } from '@/lib/format';

interface OrderEvent {
  id: string;
  status: string;
  note?: string | null;
  actor: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  qty: number;
  price: string | number;
  size: string;
  color: string;
  product?: { name: string; slug: string };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  district: string;
  total: string | number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  courier?: string | null;
  consignmentId?: string | null;
  courierStatus?: string | null;
  createdAt: string;
  items?: OrderItem[];
  events?: OrderEvent[];
}

async function getOrder(orderNumber: string): Promise<Order | null> {
  try {
    const res = await api.get<Order>(`/api/orders/track/${orderNumber}`);
    return res.data || null;
  } catch {
    return null;
  }
}

const STATUS_STEPS = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
];

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);

  if (!order) {
    return (
      <div className="container-wrap py-16">
        <div className="max-w-md mx-auto bg-white border border-line rounded p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h1 className="font-serif text-2xl font-semibold mb-2">
            Order Not Found
          </h1>
          <p className="text-muted mb-6">
            We couldn&apos;t find an order with number{' '}
            <span className="font-mono">{orderNumber}</span>.
          </p>
          <Link href="/products" className="btn">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = order.status.toUpperCase();
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <div className="container-wrap py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold text-ink mb-1">
            Track Order
          </h1>
          <p className="text-muted text-sm">
            Order Number:{' '}
            <span className="font-mono font-medium">{order.orderNumber}</span>
          </p>
        </div>

        {/* Status tracker */}
        {!isCancelled && (
          <div className="bg-white border border-line rounded p-6 mb-6">
            <h2 className="font-serif text-lg font-semibold mb-6">
              Order Status
            </h2>
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <div
                    key={step}
                    className="flex-1 flex flex-col items-center relative"
                  >
                    {/* Line */}
                    {i > 0 && (
                      <div
                        className={`absolute top-4 -left-1/2 w-full h-0.5 ${
                          done ? 'bg-wine' : 'bg-line'
                        }`}
                      />
                    )}
                    {/* Circle */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        done
                          ? 'bg-wine text-white'
                          : 'bg-sand text-muted border border-line'
                      } ${active ? 'ring-4 ring-wine/20' : ''}`}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                    {/* Label */}
                    <div
                      className={`text-xs mt-2 text-center font-medium ${
                        done ? 'text-wine' : 'text-muted'
                      }`}
                    >
                      {step.charAt(0) + step.slice(1).toLowerCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-wine/10 border border-wine/20 text-wine rounded p-4 mb-6 text-center">
            ✗ This order has been cancelled
          </div>
        )}

        {/* Order Info */}
        <div className="bg-white border border-line rounded p-6 mb-6">
          <h2 className="font-serif text-lg font-semibold mb-4">
            Order Details
          </h2>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted">Placed on</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span>{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Phone</span>
              <span>{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Address</span>
              <span className="text-right max-w-xs">
                {order.address}, {order.district}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Payment</span>
              <span>
                {order.paymentMethod} ({order.paymentStatus})
              </span>
            </div>
            {order.courier && (
              <div className="flex justify-between">
                <span className="text-muted">Courier</span>
                <span>
                  {order.courier} — {order.consignmentId}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-line pt-2 mt-2">
              <span>Total</span>
              <span className="text-wine">{tk(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {order.events && order.events.length > 0 && (
          <div className="bg-white border border-line rounded p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">
              Activity
            </h2>
            <div className="space-y-4">
              {order.events.map((ev) => (
                <div key={ev.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-wine mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{ev.status}</div>
                    {ev.note && (
                      <div className="text-xs text-muted mt-0.5">
                        {ev.note}
                      </div>
                    )}
                    <div className="text-xs text-muted mt-0.5">
                      {formatDateTime(ev.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}