'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCart, clearCart, type CartItem } from '@/lib/cart';
import { api } from '@/lib/api';
import { tk } from '@/lib/format';

const DISTRICTS = [
  'Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal',
  'Rangpur', 'Mymensingh', 'Cumilla', 'Narayanganj', 'Gazipur',
  'Bogura', 'Jashore', 'CoxsBazar', 'Dinajpur', 'Pabna', 'Noakhali',
  'Feni', 'Brahmanbaria', 'Tangail', 'Kushtia', 'Faridpur',
];

const PAYMENT_METHODS = [
  { value: 'COD', label: 'Cash on Delivery', desc: 'Pay when you receive the order' },
  { value: 'BKASH', label: 'bKash', desc: 'Send money and enter Transaction ID' },
  { value: 'NAGAD', label: 'Nagad', desc: 'Send money and enter Transaction ID' },
  { value: 'ROCKET', label: 'Rocket', desc: 'Send money and enter Transaction ID' },
  { value: 'CARD', label: 'Card (Visa / Mastercard)', desc: 'Secure payment via SSLCommerz' },
];

interface FormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  district: string;
  note: string;
  paymentMethod: string;
  paymentTxId: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    district: 'Dhaka',
    note: '',
    paymentMethod: 'COD',
    paymentTxId: '',
  });

  useEffect(() => {
    setMounted(true);
    const cart = getCart();
    if (cart.length === 0) {
      router.push('/cart');
      return;
    }
    setItems(cart);
  }, [router]);

  if (!mounted) {
    return (
      <div className="container-wrap py-16 text-center text-muted">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const subtotal = items.reduce((sum, item) => {
    const finalPrice = Math.round(item.price * (1 - item.discount / 100));
    return sum + finalPrice * item.qty;
  }, 0);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.customerName.trim().length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(form.customerPhone)) {
      setError('Enter a valid 11-digit mobile number (e.g. 01712345678)');
      return;
    }
    if (form.address.trim().length < 10) {
      setError('Address must be at least 10 characters');
      return;
    }
    const needsTxId = ['BKASH', 'NAGAD', 'ROCKET'].includes(form.paymentMethod);
    if (needsTxId && form.paymentTxId.trim().length < 4) {
      setError('Please enter the Transaction ID (at least 4 characters)');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        address: form.address.trim(),
        district: form.district,
        note: form.note.trim() || undefined,
        paymentMethod: form.paymentMethod,
        paymentTxId: needsTxId ? form.paymentTxId.trim() : undefined,
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          qty: item.qty,
        })),
      };

      const res = await api.post<{ id: string; orderNumber: string }>(
        '/api/orders',
        payload
      );

      if (!res.data) {
        throw new Error('Order placement failed');
      }

      clearCart();

      if (form.paymentMethod === 'CARD') {
        router.push(`/pay/${res.data.orderNumber}`);
      } else {
        router.push(`/order-success/${res.data.orderNumber}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setSubmitting(false);
    }
  }

  const needsTxId = ['BKASH', 'NAGAD', 'ROCKET'].includes(form.paymentMethod);

  return (
    <div className="container-wrap py-10">
      <h1 className="font-serif text-4xl font-semibold text-ink mb-2">
        Checkout
      </h1>
      <p className="text-muted text-sm mb-8">
        Fill in your delivery details to place the order
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer info */}
            <section className="bg-white border border-line rounded p-6">
              <h2 className="font-serif text-xl font-semibold mb-4">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    placeholder="Your full name"
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customerPhone}
                    onChange={(e) => update('customerPhone', e.target.value)}
                    placeholder="01712345678"
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => update('customerEmail', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine"
                  />
                </div>
              </div>
            </section>

            {/* Delivery */}
            <section className="bg-white border border-line rounded p-6">
              <h2 className="font-serif text-xl font-semibold mb-4">
                Delivery Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Full Address *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="House, Road, Area, Thana"
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    District *
                  </label>
                  <select
                    value={form.district}
                    onChange={(e) => update('district', e.target.value)}
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine bg-white"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Note (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={(e) => update('note', e.target.value)}
                    placeholder="Special instructions for delivery"
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine"
                  />
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white border border-line rounded p-6">
              <h2 className="font-serif text-xl font-semibold mb-4">
                Payment Method
              </h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.value}
                    className={`block border rounded p-4 cursor-pointer transition ${
                      form.paymentMethod === pm.value
                        ? 'border-wine bg-wine/5'
                        : 'border-line hover:border-wine'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.value}
                        checked={form.paymentMethod === pm.value}
                        onChange={(e) =>
                          update('paymentMethod', e.target.value)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{pm.label}</div>
                        <div className="text-sm text-muted">{pm.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {needsTxId && (
                <div className="mt-4 bg-sand border border-line rounded p-4">
                  <label className="text-sm font-medium mb-1 block">
                    Transaction ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.paymentTxId}
                    onChange={(e) => update('paymentTxId', e.target.value)}
                    placeholder="e.g. 8H4K9L2M"
                    className="w-full border border-line rounded px-3 py-2 focus:outline-none focus:border-wine"
                  />
                  <p className="text-xs text-muted mt-2">
                    Send the money first, then enter the Transaction ID here.
                    Our team will verify it.
                  </p>
                </div>
              )}

              {form.paymentMethod === 'CARD' && (
                <div className="mt-4 bg-leaf/5 border border-leaf/20 rounded p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-leaf text-lg">🔒</span>
                    <div className="text-sm">
                      <div className="font-medium text-leaf mb-1">
                        Secure Card Payment
                      </div>
                      <div className="text-muted text-xs">
                        After placing the order, you will be redirected to
                        SSLCommerz&apos;s secure payment page. Visa,
                        Mastercard, and American Express are accepted.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right — order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-line rounded p-6 sticky top-24">
              <h2 className="font-serif text-xl font-semibold mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {items.map((item) => {
                  const finalPrice = Math.round(
                    item.price * (1 - item.discount / 100)
                  );
                  return (
                    <div
                      key={item.variantId}
                      className="flex gap-3 text-sm"
                    >
                      <div className="w-12 h-16 bg-sand rounded overflow-hidden flex-shrink-0">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <div className="line-clamp-1">{item.name}</div>
                        <div className="text-xs text-muted">
                          {item.color} • {item.size} • × {item.qty}
                        </div>
                        <div className="text-wine font-medium">
                          {tk(finalPrice * item.qty)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-line pt-4">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-muted text-sm">Subtotal</span>
                  <span>{tk(subtotal)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="text-wine font-semibold text-2xl">
                    {tk(subtotal)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mt-4 text-sm text-wine bg-wine/10 border border-wine/20 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn w-full justify-center mt-6 disabled:opacity-50"
              >
                {submitting
                  ? 'Placing order...'
                  : form.paymentMethod === 'CARD'
                  ? 'Place Order & Pay →'
                  : 'Place Order'}
              </button>

              <Link
                href="/cart"
                className="block text-center text-sm text-muted hover:text-wine mt-3"
              >
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}