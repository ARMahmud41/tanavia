import Link from 'next/link';
import { api } from '@/lib/api';
import { tk } from '@/lib/format';

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
}

async function getOrder(orderNumber: string): Promise<Order | null> {
  try {
    const res = await api.get<Order>(`/api/orders/track/${orderNumber}`);
    return res.data || null;
  } catch {
    return null;
  }
}

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);

  const isCard = order?.paymentMethod === 'CARD';
  const isPaid = order?.paymentStatus === 'PAID';
  const needsCardPayment = isCard && !isPaid;

  return (
    <div className="container-wrap py-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-line rounded p-10 text-center mb-6">
          <div className="w-16 h-16 bg-leaf/10 text-leaf rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h1 className="font-serif text-3xl font-semibold text-ink mb-2">
            Order Placed!
          </h1>
          <p className="text-muted mb-6">
            Your order has been received successfully. We will contact you
            shortly to confirm the delivery.
          </p>

          <div className="bg-sand rounded p-4 inline-block mb-6">
            <div className="text-xs text-muted uppercase tracking-wide mb-1">
              Order Number
            </div>
            <div className="font-mono text-xl font-semibold text-wine">
              {orderNumber}
            </div>
          </div>

          {/* Card payment CTA */}
          {needsCardPayment && order && (
            <div className="bg-leaf/5 border border-leaf/20 rounded p-5 mb-6 text-left">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💳</span>
                <div className="flex-1">
                  <div className="font-semibold text-leaf mb-1">
                    Complete Card Payment
                  </div>
                  <p className="text-sm text-muted mb-4">
                    Your order is confirmed, but payment is still pending.
                    Click the button below to complete the payment on
                    SSLCommerz&apos;s secure page.
                  </p>
                  <Link
                    href={`/pay/${orderNumber}`}
                    className="btn inline-flex"
                  >
                    Pay {tk(order.total)} Now →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="bg-leaf/10 text-leaf rounded p-3 mb-6 text-sm font-medium">
              ✓ Payment Complete
            </div>
          )}

          {order && (
            <div className="text-left text-sm space-y-1 border-t border-line pt-6">
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
              <div className="flex justify-between font-semibold border-t border-line pt-2 mt-2">
                <span>Total</span>
                <span className="text-wine">{tk(order.total)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/products" className="btn">
            Continue Shopping
          </Link>
          <Link
            href={`/track/${orderNumber}`}
            className="btn btn-ghost"
          >
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}