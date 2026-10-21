'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import { BD_DISTRICTS, getUpazilas } from '@/lib/bd-locations';
import { SearchableSelect } from '@/components/SearchableSelect';

interface Product {
  id: string;
  name: string;
  price: number | string;
  discount: number;
  variants: Array<{ id: string; size: string; color: string; qty: number; reserved: number }>;
}

interface LineItem {
  productId: string;
  size: string;
  color: string;
  qty: number;
  name: string;
  price: number;
}

const SOURCES = [
  { value: 'FACEBOOK', label: '📘 Facebook' },
  { value: 'WHATSAPP', label: '💬 WhatsApp' },
  { value: 'INSTAGRAM', label: '📸 Instagram' },
  { value: 'PHONE', label: '📞 Phone Call' },
  { value: 'OTHER', label: '🌐 Other' },
];

export default function ManualOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    district: '',
    upazila: '',
    note: '',
    source: 'FACEBOOK',
    paymentMethod: 'COD',
    paymentTxId: '',
    deliveryFee: 80,
  });

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    async function loadProducts() {
      try {
        const token = getToken() || undefined;
        const res = await api.get<any>('/api/products?limit=100&active=true', { token });
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setProducts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Auto-set delivery fee based on district
  useEffect(() => {
    if (form.district) {
      const isCTG = form.district.toLowerCase().includes('chattogram');
      setForm((f) => ({ ...f, deliveryFee: isCTG ? 80 : 130 }));
    }
  }, [form.district]);

  const currentProduct = products.find((p) => p.id === selectedProduct);
  const availableVariants = currentProduct?.variants.filter((v) => v.qty - v.reserved > 0) || [];
  const availableSizes = [...new Set(availableVariants.map((v) => v.size))];
  const availableColors = availableVariants.filter((v) => v.size === selectedSize).map((v) => v.color);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addItem() {
    if (!currentProduct || !selectedSize || !selectedColor) {
      setError('Please select product, size, and color');
      return;
    }
    const variant = availableVariants.find((v) => v.size === selectedSize && v.color === selectedColor);
    if (!variant) return;
    const available = variant.qty - variant.reserved;
    if (qty > available) {
      setError(`Only ${available} available`);
      return;
    }
    const finalPrice = Math.round(Number(currentProduct.price) * (1 - (currentProduct.discount || 0) / 100));
    setItems([...items, { productId: currentProduct.id, size: selectedSize, color: selectedColor, qty, name: currentProduct.name, price: finalPrice }]);
    setSelectedProduct('');
    setSelectedSize('');
    setSelectedColor('');
    setQty(1);
    setError('');
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const total = subtotal + Number(form.deliveryFee || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return setError('Add at least one item');
    if (!form.customerName || !form.customerPhone || !form.address || !form.district) {
      return setError('Please fill all required fields');
    }
    if (!/^01[3-9]\d{8}$/.test(form.customerPhone)) return setError('Invalid phone number');

    setSubmitting(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.post<any>('/api/orders/manual', {
        ...form,
        items: items.map((it) => ({ productId: it.productId, size: it.size, color: it.color, qty: it.qty })),
      }, { token });
      if (res.data?.id) router.push(`/admin/orders/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]';

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-[#0F2A5C]">← Back to Orders</Link>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mt-1">Create Manual Order</h1>
          <p className="text-sm text-gray-500 mt-1">For Facebook, WhatsApp, Instagram or phone orders</p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <h2 className="font-semibold text-[#0F2A5C] mb-3">Order Source</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {SOURCES.map((s) => (
                <button key={s.value} type="button" onClick={() => update('source', s.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition ${form.source === s.value ? 'border-[#0F2A5C] bg-[#0F2A5C]/5 text-[#0F2A5C]' : 'border-[#E8EBF0] text-gray-600 hover:border-[#0F2A5C]/40'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <h2 className="font-semibold text-[#0F2A5C] mb-3">Customer</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label><input type="text" required value={form.customerName} onChange={(e) => update('customerName', e.target.value)} className={inputClass} placeholder="Customer name" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label><input type="text" required value={form.customerPhone} onChange={(e) => update('customerPhone', e.target.value)} className={inputClass} placeholder="01712345678" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-semibold text-gray-600 mb-1">Email (optional)</label><input type="email" value={form.customerEmail} onChange={(e) => update('customerEmail', e.target.value)} className={inputClass} placeholder="customer@email.com" /></div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <h2 className="font-semibold text-[#0F2A5C] mb-3">Delivery Address</h2>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label><textarea required rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass + ' resize-none'} placeholder="House, Road, Area" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">District *</label>
                  <SearchableSelect value={form.district} onChange={(v) => { update('district', v); update('upazila', ''); }} options={BD_DISTRICTS.map((d) => d.name)} placeholder="Select district" emptyMessage="No district" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Upazila</label>
                  {form.district ? (
                    <SearchableSelect value={form.upazila} onChange={(v) => update('upazila', v)} options={getUpazilas(form.district)} placeholder="Select upazila" emptyMessage="No upazila" />
                  ) : (
                    <input disabled className={inputClass + ' opacity-50'} placeholder="Select district first" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Delivery Fee (৳) {form.district && (
                    <span className="text-[10px] font-normal text-gray-400 ml-1">
                      {form.district.toLowerCase().includes('chattogram') ? '(Inside Chattogram)' : '(Outside Chattogram)'}
                    </span>
                  )}
                </label>
                <input type="number" value={form.deliveryFee} onChange={(e) => update('deliveryFee', Number(e.target.value))} className={inputClass} />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <h2 className="font-semibold text-[#0F2A5C] mb-3">Products</h2>
            <div className="bg-[#F7F8FA] rounded-lg p-4 mb-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Product</label>
                  <select value={selectedProduct} onChange={(e) => { setSelectedProduct(e.target.value); setSelectedSize(''); setSelectedColor(''); }} className={inputClass}>
                    <option value="">-- Select Product --</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {tk(Number(p.price))}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Size</label>
                  <select value={selectedSize} onChange={(e) => { setSelectedSize(e.target.value); setSelectedColor(''); }} className={inputClass} disabled={!selectedProduct}>
                    <option value="">-- Size --</option>
                    {availableSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Color</label>
                  <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className={inputClass} disabled={!selectedSize}>
                    <option value="">-- Color --</option>
                    {availableColors.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                  <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <button type="button" onClick={addItem} className="w-full bg-[#0F2A5C] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45]">+ Add to Order</button>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F7F8FA] rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-[#0F2A5C]">{it.name}</div>
                      <div className="text-xs text-gray-500">{it.size} / {it.color} × {it.qty}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#0F2A5C]">{tk(it.price * it.qty)}</span>
                      <button type="button" onClick={() => removeItem(i)} className="text-red-500 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <h2 className="font-semibold text-[#0F2A5C] mb-3">Payment</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Method</label>
                <select value={form.paymentMethod} onChange={(e) => update('paymentMethod', e.target.value)} className={inputClass}>
                  <option value="COD">Cash on Delivery</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              {form.paymentMethod !== 'COD' && (
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Transaction ID</label><input type="text" value={form.paymentTxId} onChange={(e) => update('paymentTxId', e.target.value)} className={inputClass} placeholder="e.g. 8H4K9L2M" /></div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <h2 className="font-semibold text-[#0F2A5C] mb-3">Notes</h2>
            <textarea rows={2} value={form.note} onChange={(e) => update('note', e.target.value)} className={inputClass + ' resize-none'} placeholder="Any special instructions..." />
          </section>

          <div className="bg-white rounded-xl border border-[#E8EBF0] p-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-semibold">{tk(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Delivery</span><span className="font-semibold">{tk(Number(form.deliveryFee))}</span></div>
              <div className="flex justify-between text-lg pt-2 border-t border-gray-200"><span className="font-bold text-[#0F2A5C]">Total</span><span className="font-bold text-[#0F2A5C]">{tk(total)}</span></div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Link href="/admin/orders" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-white border border-gray-300 text-gray-600">Cancel</Link>
            <button type="submit" disabled={submitting || items.length === 0} className="px-8 py-2.5 rounded-lg text-sm font-semibold bg-[#0F2A5C] text-white hover:bg-[#0A1F45] disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}