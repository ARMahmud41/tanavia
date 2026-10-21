'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCart,
  clearCart,
  clearCartBackup,
  restoreCartFromBackup,
  hasBuyNowSession,
  updateQty,
  removeFromCart,
  type CartItem,
} from '@/lib/cart';
import { api } from '@/lib/api';
import { tk } from '@/lib/format';
import { BD_DISTRICTS, getUpazilas } from '@/lib/bd-locations';
import { SearchableSelect } from '@/components/SearchableSelect';

// ============================================
// Delivery constants
// ============================================
const DELIVERY_INSIDE_CTG = 80;
const DELIVERY_OUTSIDE_CTG = 130;
const FREE_DELIVERY_THRESHOLD = 5000;

interface PaymentOption {
  value: string;
  label: string;
  logo: string;
}

const PAYMENT_METHODS: PaymentOption[] = [
  { value: 'COD', label: 'Cash On Delivery', logo: '/logos/cod.png' },
  { value: 'BKASH', label: 'bKash', logo: '/logos/bkash.png' },
  { value: 'NAGAD', label: 'Nagad', logo: '/logos/nagad.png' },
  { value: 'ROCKET', label: 'Rocket', logo: '/logos/rocket.png' },
  { value: 'CARD', label: 'Card', logo: '/logos/card.png' },
];

type Area = 'inside-chattogram' | 'outside-chattogram';

interface FormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  area: Area;
  district: string;
  upazila: string;
  note: string;
  paymentMethod: string;
  paymentTxId: string;
}

function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="bg-[#0F2A5C] text-white px-4 py-2.5 rounded-t-lg flex items-center gap-2.5 -mx-5 -mt-5 mb-5">
      <div className="w-5 h-5 rounded-full bg-white text-[#0F2A5C] flex items-center justify-center text-[11px] font-bold">
        {step}
      </div>
      <span className="text-sm font-semibold tracking-wide">{title}</span>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  // Stock validation state
  const [stockIssues, setStockIssues] = useState<string[]>([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockChecked, setStockChecked] = useState(false);

  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    area: 'inside-chattogram',
    district: 'Chattogram',
    upazila: '',
    note: '',
    paymentMethod: 'COD',
    paymentTxId: '',
  });

  const txIdRef = useRef<HTMLInputElement>(null);
  const needsTxId = ['BKASH', 'NAGAD', 'ROCKET'].includes(form.paymentMethod);

  useEffect(() => {
    if (needsTxId && txIdRef.current) {
      const timer = setTimeout(() => {
        txIdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        txIdRef.current?.focus({ preventScroll: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [form.paymentMethod, needsTxId]);

  useEffect(() => {
    setMounted(true);
    const cart = getCart();
    if (cart.length === 0) {
      router.push('/cart');
      return;
    }
    setItems(cart);
  }, [router]);

  // Check stock when items loaded
  useEffect(() => {
    if (mounted && items.length > 0 && !stockChecked) {
      validateStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, items.length]);

  // Load related products & payment settings
  useEffect(() => {
    async function loadData() {
      try {
        const [relatedRes, paymentRes] = await Promise.all([
          api.get<any[]>('/api/products?limit=4').catch(() => ({ data: [] })),
          // 🎯 পাবলিক methods এন্ডপয়েন্ট ব্যবহার করা হলো
          api.get<any>('/api/payments/methods').catch(() => ({ data: null })),
        ]);
        
        setRelatedProducts(relatedRes.data || []);
        
        // 🎯 methods রেসপন্স থেকে ডাটা ম্যাপ করা হলো
        const methodsData = paymentRes?.data;
        if (methodsData) {
          setPaymentSettings({
            bkash: { 
              number: methodsData.numbers?.BKASH, 
              type: methodsData.types?.BKASH || 'Personal',
              enabled: methodsData.enabled?.BKASH 
            },
            nagad: { 
              number: methodsData.numbers?.NAGAD, 
              type: methodsData.types?.NAGAD || 'Personal',
              enabled: methodsData.enabled?.NAGAD 
            },
            rocket: { 
              number: methodsData.numbers?.ROCKET, 
              type: methodsData.types?.ROCKET || 'Personal',
              enabled: methodsData.enabled?.ROCKET 
            },
          });
        }
      } catch (err) {
        console.error('Failed to load checkout data', err);
      }
    }
    loadData();
  }, []);

  if (!mounted) {
    return (
      <div className="container-wrap py-16 text-center text-muted">
        Loading...
      </div>
    );
  }

  if (items.length === 0) return null;

  // ============================================
  // Derived: upazilas based on area + district
  // ============================================
  const availableUpazilas =
    form.area === 'inside-chattogram'
      ? getUpazilas('Chattogram')
      : form.district
      ? getUpazilas(form.district)
      : [];

  const allDistricts = BD_DISTRICTS.map((d) => d.name).sort();

  // ============================================
  // Totals
  // ============================================
  const subtotal = items.reduce((sum, item) => {
    const finalPrice = Math.round(item.price * (1 - item.discount / 100));
    return sum + finalPrice * item.qty;
  }, 0);

  // Delivery charge
  let deliveryCharge = 0;
  if (subtotal < FREE_DELIVERY_THRESHOLD) {
    deliveryCharge =
      form.area === 'inside-chattogram'
        ? DELIVERY_INSIDE_CTG
        : DELIVERY_OUTSIDE_CTG;
  }

  const grandTotal = subtotal + deliveryCharge;
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;

  // ============================================
  // Validate stock
  // ============================================
  async function validateStock() {
    if (items.length === 0) return;

    setCheckingStock(true);
    setStockIssues([]);

    try {
      const issues: string[] = [];

      for (const item of items) {
        const productSlug = item.slug;
        const res = await api.get<{
          variants: Array<{
            id: string;
            size: string;
            color: string;
            qty: number;
            reserved: number;
          }>;
        }>(`/api/products/slug/${productSlug}`);

        if (!res.data) continue;

        const variant = res.data.variants.find(
          (v) => v.size === item.size && v.color === item.color
        );

        if (!variant) {
          issues.push(
            `${item.name} (${item.size}/${item.color}) — not available`
          );
          continue;
        }

        const available = variant.qty - variant.reserved;
        if (available < item.qty) {
          issues.push(
            `${item.name} (${item.size}/${item.color}) — only ${available} left in stock`
          );
        }
      }

      setStockIssues(issues);
    } catch (err) {
      console.error('Stock check failed:', err);
    } finally {
      setCheckingStock(false);
      setStockChecked(true);
    }
  }

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleQtyChange(variantId: string, newQty: number) {
    const updated = updateQty(variantId, newQty);
    setItems([...updated]);
  }

  function handleRemove(variantId: string) {
    const updated = removeFromCart(variantId);
    if (updated.length === 0) {
      router.push('/cart');
      return;
    }
    setItems([...updated]);
  }

  function handleCancel() {
    if (hasBuyNowSession()) {
      restoreCartFromBackup();
    }
    router.push('/cart');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Re-validate stock right before submitting
    await validateStock();

    if (stockIssues.length > 0) {
      setError('Some items are out of stock. Please review the errors above.');
      return;
    }

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
    if (form.area === 'outside-chattogram' && !form.district) {
      setError('Please select a district');
      return;
    }
    if (!form.upazila.trim()) {
      setError('Please select / enter your upazila / thana');
      return;
    }
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
        area: form.area,
        district: form.district,
        upazila: form.upazila.trim(),
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
      if (!res.data) throw new Error('Order placement failed');

      clearCart();
      clearCartBackup();

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

  const inputClass =
    'w-full bg-[#F1F3F6] border border-transparent rounded-lg px-4 py-3 text-ink text-sm placeholder:text-[#8A8F98] focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition';

  return (
    <div className="bg-[#F5F6F8] min-h-screen">
      <div className="container-wrap py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#0F2A5C]">
            Checkout
          </h1>
          {hasBuyNowSession() && (
            <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
              ⚡ Quick checkout
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Step 1 — Contact */}
              <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
                <SectionHeader step={1} title="Contact" />

                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8F98] text-base">
                      👤
                    </span>
                    <input
                      type="text"
                      required
                      value={form.customerName}
                      onChange={(e) => update('customerName', e.target.value)}
                      placeholder="Name"
                      className={inputClass + ' pl-11'}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8F98] text-base">
                      📞
                    </span>
                    <input
                      type="text"
                      required
                      value={form.customerPhone}
                      onChange={(e) => update('customerPhone', e.target.value)}
                      placeholder="Mobile number"
                      className={inputClass + ' pl-11'}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8F98] text-base">
                      ✉️
                    </span>
                    <input
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => update('customerEmail', e.target.value)}
                      placeholder="Email address"
                      className={inputClass + ' pl-11'}
                    />
                  </div>
                </div>
              </section>

              {/* Step 2 — Delivery */}
              <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5 pt-5">
                <SectionHeader step={2} title="Delivery" />
                <div className="space-y-3">
                  <textarea
                    required
                    rows={2}
                    value={form.address}
                    onChange={(e) => update('address', e.target.value)}
                    placeholder="Your Address (House / Road / Village)"
                    className={inputClass + ' resize-none'}
                  />

                  {/* Area */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                      Select Area <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.area}
                      onChange={(e) => {
                        const newArea = e.target.value as Area;
                        update('area', newArea);
                        if (newArea === 'inside-chattogram') {
                          update('district', 'Chattogram');
                          update('upazila', '');
                        } else {
                          update('district', '');
                          update('upazila', '');
                        }
                      }}
                      className={inputClass + ' cursor-pointer appearance-none'}
                    >
                      <option value="inside-chattogram">
                        Inside Chattogram — ৳{DELIVERY_INSIDE_CTG}
                      </option>
                      <option value="outside-chattogram">
                        Outside Chattogram — ৳{DELIVERY_OUTSIDE_CTG}
                      </option>
                    </select>
                  </div>

                  {/* District — only for outside Chattogram */}
                  {form.area === 'outside-chattogram' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                        Select District <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        value={form.district}
                        onChange={(v) => {
                          update('district', v);
                          update('upazila', '');
                        }}
                        options={allDistricts}
                        placeholder="Search district..."
                        emptyMessage="No district found"
                      />
                    </div>
                  )}

                  {/* Upazila — inside Chattogram */}
                  {form.area === 'inside-chattogram' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                        Select Upazila / Thana{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        value={form.upazila}
                        onChange={(v) => update('upazila', v)}
                        options={availableUpazilas}
                        placeholder="Search upazila / thana..."
                        emptyMessage="No upazila found"
                      />
                    </div>
                  )}

                  {/* Upazila — outside Chattogram (select or free-text) */}
                  {form.area === 'outside-chattogram' && form.district && (
                    <div>
                      <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                        Select Upazila / Thana{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      {availableUpazilas.length > 0 ? (
                        <SearchableSelect
                          value={form.upazila}
                          onChange={(v) => update('upazila', v)}
                          options={availableUpazilas}
                          placeholder="Search upazila / thana..."
                          emptyMessage="No upazila found"
                        />
                      ) : (
                        <input
                          type="text"
                          value={form.upazila}
                          onChange={(e) => update('upazila', e.target.value)}
                          placeholder="Enter your upazila / thana"
                          className={inputClass}
                        />
                      )}
                    </div>
                  )}

                  {/* Note */}
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => update('note', e.target.value)}
                    placeholder="Note (optional)"
                    className={inputClass}
                  />
                </div>
              </section>

              {/* Step 3 — Payment */}
              <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
                <SectionHeader step={3} title="Payment" />

                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((pm) => {
                    const selected = form.paymentMethod === pm.value;
                    return (
                      <label
                        key={pm.value}
                        className={`cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                          selected
                            ? 'border-[#0F2A5C] bg-[#0F2A5C]/[0.04]'
                            : 'border-[#E3E6EB] bg-white hover:border-[#0F2A5C]/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={pm.value}
                          checked={selected}
                          onChange={(e) =>
                            update('paymentMethod', e.target.value)
                          }
                          className="sr-only"
                        />
                        <div className="w-14 h-14 rounded-md bg-white border border-[#E3E6EB] flex items-center justify-center overflow-hidden p-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pm.logo}
                            alt={pm.label}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            selected ? 'text-[#0F2A5C]' : 'text-[#5A6270]'
                          }`}
                        >
                          {pm.label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Dynamic Payment Instructions */}
                {form.paymentMethod === 'BKASH' && paymentSettings?.bkash?.enabled && (
                  <div className="mt-4 p-4 bg-pink-50 border border-pink-200 rounded-lg space-y-2">
                    <h3 className="text-sm font-bold text-pink-900 border-b border-pink-200 pb-2 mb-2">
                      bKash Payment Instructions
                    </h3>
                    <p className="text-sm text-pink-900 flex items-center gap-2">
                      <span className="font-semibold">Number:</span> 
                      <span className="text-base font-bold select-all">{paymentSettings.bkash.number}</span>
                    </p>
                    <p className="text-sm text-pink-900">
                      <span className="font-semibold">Type:</span> {paymentSettings.bkash.type}
                    </p>
                    <p className="text-sm text-pink-900">
                      <span className="font-semibold">Action:</span> Please send money using <strong>{paymentSettings.bkash.type === 'Personal' ? 'Send Money' : 'Payment'}</strong> option.
                    </p>
                    <div className="bg-white/50 p-2 rounded text-xs text-pink-700 mt-2">
                      <strong>Note:</strong> If you use "Send Money" to a Personal number, an extra cash-out charge (approx 1.85%) may be deducted by bKash. To avoid this, use a Merchant number if available, or send the exact amount.
                    </div>
                  </div>
                )}

                {form.paymentMethod === 'NAGAD' && paymentSettings?.nagad?.enabled && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                    <h3 className="text-sm font-bold text-orange-900 border-b border-orange-200 pb-2 mb-2">
                      Nagad Payment Instructions
                    </h3>
                    <p className="text-sm text-orange-900 flex items-center gap-2">
                      <span className="font-semibold">Number:</span> 
                      <span className="text-base font-bold select-all">{paymentSettings.nagad.number}</span>
                    </p>
                    <p className="text-sm text-orange-900">
                      <span className="font-semibold">Type:</span> {paymentSettings.nagad.type}
                    </p>
                    <p className="text-sm text-orange-900">
                      <span className="font-semibold">Action:</span> Please send money using <strong>{paymentSettings.nagad.type === 'Personal' ? 'Send Money' : 'Payment'}</strong> option.
                    </p>
                    <div className="bg-white/50 p-2 rounded text-xs text-orange-700 mt-2">
                      <strong>Note:</strong> If you use "Send Money" to a Personal number, an extra cash-out charge may be deducted by Nagad. Please send the exact amount.
                    </div>
                  </div>
                )}

                {form.paymentMethod === 'ROCKET' && paymentSettings?.rocket?.enabled && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                    <h3 className="text-sm font-bold text-purple-900 border-b border-purple-200 pb-2 mb-2">
                      Rocket Payment Instructions
                    </h3>
                    <p className="text-sm text-purple-900 flex items-center gap-2">
                      <span className="font-semibold">Number:</span> 
                      <span className="text-base font-bold select-all">{paymentSettings.rocket.number}</span>
                    </p>
                    <p className="text-sm text-purple-900">
                      <span className="font-semibold">Type:</span> {paymentSettings.rocket.type}
                    </p>
                    <p className="text-sm text-purple-900">
                      <span className="font-semibold">Action:</span> Please send money using <strong>{paymentSettings.rocket.type === 'Personal' ? 'Send Money' : 'Payment'}</strong> option.
                    </p>
                  </div>
                )}

                {needsTxId && (
                  <div className="mt-4 bg-[#F1F3F6] rounded-lg p-4">
                    <label className="text-sm font-medium mb-2 block text-[#0F2A5C]">
                      Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={txIdRef}
                      type="text"
                      required
                      value={form.paymentTxId}
                      onChange={(e) => update('paymentTxId', e.target.value)}
                      placeholder="e.g. 8H4K9L2M"
                      className="w-full bg-white border border-[#E3E6EB] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F2A5C] transition"
                    />
                    <p className="text-xs text-[#8A8F98] mt-2">
                      Send the money first, then enter the Transaction ID here.
                    </p>
                  </div>
                )}

                {form.paymentMethod === 'CARD' && (
                  <div className="mt-4 bg-[#F1F3F6] rounded-lg p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0F2A5C]/10 flex items-center justify-center flex-shrink-0 text-[#0F2A5C] text-sm">
                      🔒
                    </div>
                    <div className="text-xs text-[#5A6270] leading-relaxed">
                      <div className="font-semibold text-[#0F2A5C] mb-1 text-sm">
                        Secure Card Payment
                      </div>
                      After placing the order, you will be redirected to
                      SSLCommerz&apos;s secure payment page. Visa, Mastercard,
                      and American Express are accepted.
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right — Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden lg:sticky lg:top-24">
                <div className="bg-[#0F2A5C] text-white px-4 py-2.5">
                  <span className="text-sm font-semibold tracking-wide">
                    Order Summary
                  </span>
                </div>

                <div className="p-5">
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
                    {items.map((item) => {
                      const finalPrice = Math.round(
                        item.price * (1 - item.discount / 100)
                      );
                      return (
                        <div
                          key={item.variantId}
                          className="flex gap-3 text-sm pb-3 border-b border-[#F1F3F6] last:border-b-0 last:pb-0"
                        >
                          <div className="w-14 h-20 bg-[#F1F3F6] rounded-md overflow-hidden flex-shrink-0">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-[10px]">
                                No img
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-ink text-sm line-clamp-1">
                                  {item.name}
                                </div>
                                <div className="text-xs text-[#8A8F98] mt-0.5">
                                  {item.color} • {item.size}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemove(item.variantId)}
                                className="text-[#8A8F98] hover:text-red-600 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition"
                                aria-label="Remove item"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-2 gap-2">
                              <div className="flex items-center border border-[#E3E6EB] rounded-lg overflow-hidden bg-white">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQtyChange(item.variantId, item.qty - 1)
                                  }
                                  disabled={item.qty <= 1}
                                  className="w-7 h-7 flex items-center justify-center text-[#0F2A5C] hover:bg-[#F1F3F6] disabled:opacity-30 disabled:cursor-not-allowed transition text-base font-medium"
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-[#0F2A5C]">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQtyChange(item.variantId, item.qty + 1)
                                  }
                                  disabled={item.qty >= item.maxQty}
                                  className="w-7 h-7 flex items-center justify-center text-[#0F2A5C] hover:bg-[#F1F3F6] disabled:opacity-30 disabled:cursor-not-allowed transition text-base font-medium"
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right">
                                <div className="text-[#0F2A5C] font-semibold text-sm">
                                  {tk(finalPrice * item.qty)}
                                </div>
                                {item.qty > 1 && (
                                  <div className="text-[10px] text-[#8A8F98] leading-tight">
                                    {tk(finalPrice)} each
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 border-t border-[#E3E6EB] pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#5A6270]">Subtotal</span>
                      <span className="text-[#0F2A5C] font-medium">
                        {tk(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5A6270]">Delivery</span>
                      <span
                        className={
                          isFreeDelivery
                            ? 'text-emerald-700 font-medium'
                            : 'text-[#0F2A5C] font-medium'
                        }
                      >
                        {isFreeDelivery ? 'FREE' : tk(deliveryCharge)}
                      </span>
                    </div>
                    <div className="border-t border-[#E3E6EB] pt-2 flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-[#0F2A5C]">
                        Total
                      </span>
                      <span className="font-semibold text-lg text-[#0F2A5C]">
                        {tk(grandTotal)}
                      </span>
                    </div>
                    {!isFreeDelivery && subtotal > 0 && (
                      <div className="text-[10px] text-[#8A8F98] text-right">
                        Free delivery over {tk(FREE_DELIVERY_THRESHOLD)}
                      </div>
                    )}
                  </div>

                  {/* Stock Issues */}
                  {checkingStock && (
                    <div className="mt-4 text-xs text-[#8A8F98] bg-[#F1F3F6] rounded-lg px-3 py-2 text-center">
                      Checking stock...
                    </div>
                  )}

                  {stockIssues.length > 0 && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                      <div className="text-xs font-semibold text-red-700 mb-1">
                        ⚠ Stock Issues
                      </div>
                      {stockIssues.map((issue, i) => (
                        <div key={i} className="text-xs text-red-700">
                          • {issue}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={validateStock}
                        className="text-xs text-red-700 underline mt-2 hover:no-underline"
                      >
                        Re-check stock
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting || checkingStock || stockIssues.length > 0
                    }
                    className="mt-5 w-full bg-[#0F2A5C] hover:bg-[#0A1F45] text-white rounded-lg py-3 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? 'Placing order...'
                      : checkingStock
                      ? 'Checking stock...'
                      : stockIssues.length > 0
                      ? '⚠ Out of Stock'
                      : `Place Order · ${tk(grandTotal)}`}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="block w-full text-center text-xs text-[#8A8F98] hover:text-[#0F2A5C] mt-3"
                  >
                    ← Cancel &amp; Back to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#E8EBF0]">
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-6 text-center">
              You might also like
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p: any) => (
                <div key={p.id} className="cursor-pointer group" onClick={() => window.location.href = `/product/${p.slug}`}>
                  <div className="aspect-[3/4] bg-[#F1F3F6] rounded-lg overflow-hidden mb-2">
                    {p.productImages?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.productImages[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="text-sm font-medium text-[#0F2A5C] truncate">{p.name}</div>
                  <div className="text-sm font-bold text-wine mt-1">৳{Number(p.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}