'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { tk } from '@/lib/format';

interface PaymentInitResponse {
  orderId: string;
  orderNumber: string;
  amount: number;
  provider: string;
  sandbox: boolean;
  sessionToken: string;
  paymentUrl: string;
}

interface Order {
  id: string;
  orderNumber: string;
  total: string | number;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  paymentStatus: string;
}

export default function PayPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentInitResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const orderRes = await api.get<Order>(
          `/api/orders/track/${orderNumber}`
        );
        if (!orderRes.data) {
          setError('Order not found');
          setLoading(false);
          return;
        }
        setOrder(orderRes.data);

        if (orderRes.data.paymentStatus === 'PAID') {
          setError('This order is already paid');
          setLoading(false);
          return;
        }

        if (orderRes.data.paymentMethod !== 'CARD') {
          setError('This order is not a card payment order');
          setLoading(false);
          return;
        }

        const payRes = await api.post<PaymentInitResponse>(
          `/api/payments/init/${orderRes.data.id}`,
          {}
        );
        if (payRes.data) {
          setPayment(payRes.data);
        } else {
          setError('Could not initiate payment');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="container-wrap py-16 text-center">
        <div className="text-muted">Preparing payment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-wrap py-16">
        <div className="max-w-md mx-auto bg-white border border-line rounded p-8 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h1 className="font-serif text-2xl font-semibold mb-2">
            Payment Error
          </h1>
          <p className="text-muted mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/products" className="btn">
              Back to Shop
            </Link>
            <Link
              href={`/order-success/${orderNumber}`}
              className="btn btn-ghost"
            >
              Order Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order || !payment) return null;

  return (
    <div className="container-wrap py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-line rounded overflow-hidden shadow-card">
          {/* Header */}
          <div className="bg-gradient-to-br from-wine to-wine-dark text-white p-6 text-center">
            <div className="text-4xl mb-2">💳</div>
            <h1 className="font-serif text-2xl font-semibold mb-1">
              Secure Card Payment
            </h1>
            <p className="text-sm text-white/80">
              Powered by {payment.provider}
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="bg-sand rounded p-4 mb-6">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-muted">Order</span>
                <span className="font-mono font-medium">
                  {order.orderNumber}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mb-3">
                <span className="text-muted">Customer</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="border-t border-line pt-3 mt-3 flex justify-between items-baseline">
                <span className="text-sm font-medium">Amount to Pay</span>
                <span className="font-serif text-2xl font-semibold text-wine">
                  {tk(order.total)}
                </span>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-6">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-wine text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  1
                </div>
                <div className="text-sm">
                  <div className="font-medium">Click the button below</div>
                  <div className="text-muted text-xs">
                    You&apos;ll be taken to SSLCommerz secure payment page
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-wine text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  2
                </div>
                <div className="text-sm">
                  <div className="font-medium">Enter your card details</div>
                  <div className="text-muted text-xs">
                    Visa, Mastercard, and Amex are accepted
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-wine text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  3
                </div>
                <div className="text-sm">
                  <div className="font-medium">Confirm payment</div>
                  <div className="text-muted text-xs">
                    Your order will be confirmed automatically
                  </div>
                </div>
              </div>
            </div>

            {payment.sandbox && (
              <div className="bg-gold/10 border border-gold/30 text-gold text-xs rounded p-3 mb-4 text-center">
                🧪 Sandbox Mode — No real payment will be processed
              </div>
            )}

            <a
              href={payment.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn w-full justify-center mb-3 text-base py-3"
            >
              🔒 Proceed to Secure Payment →
            </a>

            <div className="flex items-center justify-center gap-2 text-xs text-muted">
              <span>🔒</span>
              <span>256-bit SSL encrypted</span>
              <span>•</span>
              <span>PCI DSS compliant</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            href={`/order-success/${order.orderNumber}`}
            className="text-sm text-muted hover:text-wine"
          >
            ← Back to order details
          </Link>
        </div>
      </div>
    </div>
  );
}