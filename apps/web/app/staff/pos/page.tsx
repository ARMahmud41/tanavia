'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken, getCurrentUser } from '@/lib/auth';
import {
  getPosCart,
  setPosCart,
  clearPosCart,
  addToPosCart,
  type CartItem,
} from '@/lib/staff-pos';
import { BarcodeInput } from './components/BarcodeInput';
import {
  ProductGrid,
  type ProductForPOS,
  type ProductVariant,
} from './components/ProductGrid';
import { CartPanel } from './components/CartPanel';
import {
  PaymentPanel,
  type PaymentMethod,
} from './components/PaymentPanel';
import {
  ReceiptModal,
  type ReceiptData,
} from './components/ReceiptModal';

// ============================================
// Server response types
// ============================================
interface ShiftInfo {
  id: string;
  status: 'OPEN' | 'CLOSED';
}

interface LowStockWarning {
  productName: string;
  variantInfo: string;
  available: number;
  reserved: number;
}

export default function StaffPOSPage() {
  const [products, setProducts] = useState<ProductForPOS[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [txId, setTxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');

  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [userName, setUserName] = useState('');

  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [warning, setWarning] = useState<LowStockWarning | null>(null);
  const [smsDetected, setSmsDetected] = useState<{
    id: string;
    provider: string;
    senderNumber: string;
    txId: string;
    amount: number;
  } | null>(null);

  // ============================================
  // Init — load products, shift, cart
  // ============================================
  useEffect(() => {
    const user = getCurrentUser();
    if (user) setUserName(user.name);

    setCart(getPosCart());

    async function load() {
      const token = getToken() || undefined;
      try {
        // Load products (critical)
        const prodRes = await api
          .get<ProductForPOS[]>('/api/products?limit=100', { token })
          .catch((err) => {
            console.error('[POS] Products load failed:', err);
            return { data: [] } as any;
          });
        setProducts(prodRes.data || []);

        // Load shift (non-critical — 401 won't break)
        const shiftRes = await api
          .get<ShiftInfo>('/api/staff/shift/current', { token })
          .catch(() => ({ data: null } as any));
        setShift(shiftRes.data || null);
      } finally {
        setProductsLoading(false);
      }
    }
    load();
  }, []);

  // Sync cart → localStorage
  useEffect(() => {
    setPosCart(cart);
  }, [cart]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ============================================
  // SMS auto-detect polling (every 5 sec)
  // ============================================
  useEffect(() => {
    let cancelled = false;

    async function pollSms() {
      if (cancelled) return;
      if (!needsSender) return; // only when bKash/Nagad/Rocket selected
      if (smsDetected) return; // already detected

      try {
        const res = await api.get<Array<{
          id: string;
          provider: string;
          senderNumber: string;
          txId: string;
          amount: number;
          consumed: boolean;
        }>>('/api/webhooks/sms/recent');

        const sms = (res.data || []).find(
          (s) => !s.consumed && s.txId && s.senderNumber
        );

        if (sms && !cancelled) {
          // Auto-fill
          setSenderNumber(sms.senderNumber);
          setTxId(sms.txId);
          setSmsDetected({
            id: sms.id,
            provider: sms.provider,
            senderNumber: sms.senderNumber,
            txId: sms.txId,
            amount: sms.amount,
          });
          setToast({
            type: 'success',
            msg: `SMS detected — ${sms.provider} ${sms.txId}`,
          });
        }
      } catch {
        // silent
      }
    }

    const interval = setInterval(pollSms, 5000);
    pollSms(); // initial call

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  const needsSender =
    paymentMethod === 'BKASH' ||
    paymentMethod === 'NAGAD' ||
    paymentMethod === 'ROCKET';

  // ============================================
  // Scan barcode → find variant
  // ============================================
  async function handleScan(code: string) {
    setScanning(true);
    try {
      // Client-side lookup first
      const normalized = code.trim();
      let found: {
        product: ProductForPOS;
        variant: ProductVariant;
      } | null = null;

      for (const p of products) {
        for (const v of p.variants) {
          if (
            v.barcode === normalized ||
            v.sku === normalized ||
            v.barcode?.toLowerCase() === normalized.toLowerCase() ||
            v.sku?.toLowerCase() === normalized.toLowerCase()
          ) {
            found = { product: p, variant: v };
            break;
          }
        }
        if (found) break;
      }

      if (!found) {
        setToast({ type: 'error', msg: `Not found: ${normalized}` });
        window.dispatchEvent(
          new CustomEvent('pos-scan-error', {
            detail: { error: `No product for ${normalized}` },
          })
        );
        return;
      }

      addVariantToCart(found.product, found.variant);
      setLastScanned(normalized);
    } finally {
      setScanning(false);
    }
  }

  // ============================================
  // Add variant to cart (with stock check)
  // ============================================
  function addVariantToCart(
    product: ProductForPOS,
    variant: ProductVariant
  ) {
    const available = variant.qty - variant.reserved;

    if (available <= 0) {
      setWarning({
        productName: product.name,
        variantInfo: `${variant.size}/${variant.color}`,
        available,
        reserved: variant.reserved,
      });
      return;
    }

    const newCart = addToPosCart({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0] || null,
      price: Number(product.price),
      discount: product.discount || 0,
      size: variant.size,
      color: variant.color,
      maxQty: available,
    });

    setCart([...newCart]);
    setToast({
      type: 'success',
      msg: `Added ${product.name} (${variant.size}/${variant.color})`,
    });
  }

  // ============================================
  // Apply coupon (client-side validate)
  // ============================================
  async function handleApplyCoupon() {
    const token = getToken() || undefined;
    try {
      const subtotal = cart.reduce((sum, item) => {
        const finalPrice = Math.round(
          item.price * (1 - item.discount / 100)
        );
        return sum + finalPrice * item.qty;
      }, 0);

      const res = await api.post<{
        code: string;
        discount: number;
        valid: boolean;
        message?: string;
      }>(
        '/api/coupons/validate',
        { code: couponCode, subtotal },
        { token }
      );

      if (res.data && res.data.valid) {
        setAppliedCoupon({
          code: res.data.code,
          discount: res.data.discount,
        });
        setToast({
          type: 'success',
          msg: `Coupon applied: ৳${res.data.discount}`,
        });
      } else {
        setToast({
          type: 'error',
          msg: res.data?.message || 'Invalid coupon',
        });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Coupon validation failed';
      setToast({ type: 'error', msg });
    }
  }

  // ============================================
  // Complete sale — POST offline order
  // ============================================
  async function handleCompleteSale() {
    if (cart.length === 0) {
      setToast({ type: 'error', msg: 'Cart is empty' });
      return;
    }

    if (!shift || shift.status !== 'OPEN') {
      setToast({
        type: 'error',
        msg: 'Please open a shift before selling',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken() || undefined;

      const items = cart.map((item) => ({
        productId: item.productId,
        size: item.size,
        color: item.color,
        qty: item.qty,
      }));

      const payload: any = {
        paymentMethod,
        items,
        shiftId: shift.id,
      };

      if (customerPhone.trim()) {
        payload.customerPhone = customerPhone.trim();
      }

      if (note.trim()) {
        payload.note = note.trim();
      }

      // Include sender number + txId for mobile wallet payments
      if (senderNumber.trim()) {
        payload.senderNumber = senderNumber.trim();
      }
      if (txId.trim()) {
        payload.paymentTxId = txId.trim();
      }

      // Apply discounts
      const subtotal = cart.reduce((sum, item) => {
        const finalPrice = Math.round(
          item.price * (1 - item.discount / 100)
        );
        return sum + finalPrice * item.qty;
      }, 0);

      const manualDiscount = Math.round((subtotal * discountPct) / 100);
      const totalDiscount = manualDiscount + (appliedCoupon?.discount || 0);

      if (totalDiscount > 0) {
        payload.discountAmount = totalDiscount;
      }

      const res = await api.post<{
        id: string;
        orderNumber: string;
        total: string;
        createdAt?: string;
        customerName?: string;
        customerPhone?: string;
      }>('/api/orders/offline', payload, { token });

      if (res.data) {
        setToast({
          type: 'success',
          msg: `Sale completed: ${res.data.orderNumber}`,
        });

        // Build receipt data BEFORE clearing cart
        const received = parseFloat(amountReceived) || 0;
        const receiptTotal = res.data.total
          ? Number(res.data.total)
          : subtotal - totalDiscount;

        setReceipt({
          orderNumber: res.data.orderNumber,
          createdAt: res.data.createdAt || new Date().toISOString(),
          customerName: res.data.customerName || 'Walk-in Customer',
          customerPhone: res.data.customerPhone || customerPhone || '',
          items: cart.map((it) => ({
            name: it.name,
            size: it.size,
            color: it.color,
            qty: it.qty,
            price: Math.round(it.price * (1 - it.discount / 100)),
          })),
          subtotal,
          discount: totalDiscount,
          deliveryFee: 0,
          total: receiptTotal,
          paymentMethod,
          amountReceived: received,
          change: received > 0 ? Math.max(0, received - receiptTotal) : 0,
          staffName: userName,
          note: note.trim() || undefined,
          senderNumber: senderNumber.trim() || undefined,
          paymentTxId: txId.trim() || undefined,
        });

        // Clear cart
        setCart([]);
        clearPosCart();
        setDiscountPct(0);
        setCouponCode('');
        setAppliedCoupon(null);
        setCustomerPhone('');
        setNote('');
        setAmountReceived('');
        setTxId('');
        setSenderNumber('');
        setSmsDetected(null);

        // Mark SMS as consumed
        if (smsDetected?.id) {
          api
            .post(`/api/webhooks/sms/${smsDetected.id}/consume`, {})
            .catch(() => {});
        }
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Sale failed';
      setToast({ type: 'error', msg });
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================
  // Clear cart
  // ============================================
  function handleClearCart() {
    if (cart.length === 0) return;
    if (!confirm('Clear the cart?')) return;
    setCart([]);
    clearPosCart();
    setDiscountPct(0);
    setCouponCode('');
    setAppliedCoupon(null);
    setCustomerPhone('');
    setNote('');
    setAmountReceived('');
    setTxId('');
    setSenderNumber('');
  }

  // ============================================
  // Computed totals
  // ============================================
  const subtotal = cart.reduce((sum, item) => {
    const finalPrice = Math.round(
      item.price * (1 - item.discount / 100)
    );
    return sum + finalPrice * item.qty;
  }, 0);

  const manualDiscount = Math.round((subtotal * discountPct) / 100);
  const couponDiscount = appliedCoupon?.discount || 0;
  const totalDiscount = manualDiscount + couponDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  // ============================================
  // Render
  // ============================================
  return (
    <div className="min-h-screen">
      {/* ============================================ */}
      {/* Top bar                                        */}
      {/* ============================================ */}
      <div className="staff-card border-b border-l-0 border-r-0 border-t-0 rounded-none px-5 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left */}
          <div>
            <h1 className="font-serif text-lg font-bold text-[var(--staff-text)]">
              Point of Sale
            </h1>
            <p className="text-[11px] text-[var(--staff-muted)]">
              {userName ? `${userName} · ` : ''}
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Center — today stats */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div>
              <div className="text-[var(--staff-muted)]">Sales today</div>
              <div className="font-bold text-[var(--staff-text)]">0</div>
            </div>
            <div>
              <div className="text-[var(--staff-muted)]">Revenue</div>
              <div className="font-bold text-[var(--staff-text)]">৳0</div>
            </div>
            <div>
              <div className="text-[var(--staff-muted)]">Cash in drawer</div>
              <div className="font-bold text-[var(--staff-text)]">
                {shift ? '৳0' : '—'}
              </div>
            </div>
          </div>

          {/* Right — shift status */}
          <div className="flex items-center gap-2">
            {shift && shift.status === 'OPEN' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--staff-success)]/10 text-[var(--staff-success)] text-xs font-semibold border border-[var(--staff-success)]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--staff-success)] animate-pulse" />
                Shift open
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--staff-warning)]/10 text-[var(--staff-warning)] text-xs font-semibold border border-[var(--staff-warning)]/20">
                Shift closed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Main grid — Left (search + grid) / Right (cart + payment) */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4">
        {/* LEFT */}
        <div className="space-y-4 min-w-0">
          <BarcodeInput
            onScan={handleScan}
            loading={scanning}
            lastScanned={lastScanned}
          />

          <ProductGrid
            products={products}
            onSelectVariant={addVariantToCart}
            loading={productsLoading}
          />
        </div>

        {/* RIGHT */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <CartPanel
            items={cart}
            onChange={(items) => setCart([...items])}
            discountPct={discountPct}
            onDiscountChange={setDiscountPct}
            couponCode={couponCode}
            onCouponCodeChange={setCouponCode}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={() => {
              setAppliedCoupon(null);
              setCouponCode('');
            }}
            customerPhone={customerPhone}
            onCustomerPhoneChange={setCustomerPhone}
            note={note}
            onNoteChange={setNote}
          />

          <PaymentPanel
            total={total}
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            amountReceived={amountReceived}
            onAmountReceivedChange={setAmountReceived}
            txId={txId}
            onTxIdChange={setTxId}
            senderNumber={senderNumber}
            onSenderNumberChange={setSenderNumber}
            smsDetected={smsDetected}
            onDismissSms={() => setSmsDetected(null)}
            disabled={cart.length === 0}
            onComplete={handleCompleteSale}
            onClear={handleClearCart}
            submitting={submitting}
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* Receipt Modal — after successful sale        */}
      {/* ============================================ */}
      {receipt && (
        <ReceiptModal
          data={receipt}
          onClose={() => {
            setReceipt(null);
            setCustomerPhone('');
            setNote('');
            setAmountReceived('');
            setTxId('');
            setSenderNumber('');
            setAppliedCoupon(null);
            setCouponCode('');
          }}
        />
      )}

      {/* ============================================ */}
      {/* Toast                                          */}
      {/* ============================================ */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-[var(--staff-success)] text-white'
              : 'bg-[var(--staff-danger)] text-white'
          }`}
        >
          {toast.type === 'success' ? '✓' : '⚠'}
          {toast.msg}
        </div>
      )}

      {/* ============================================ */}
      {/* Stock warning modal                            */}
      {/* ============================================ */}
      {warning && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setWarning(null)}
        >
          <div
            className="staff-card p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--staff-warning)]/10 text-[var(--staff-warning)] flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.3 3.9l-8 13.9c-.7 1.3.2 3 1.7 3h16c1.5 0 2.4-1.7 1.7-3l-8-13.9c-.7-1.3-2.7-1.3-3.4 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-semibold text-[var(--staff-text)] mb-1">
                  Stock unavailable
                </h3>
                <p className="text-sm text-[var(--staff-muted)] mb-3">
                  This variant is out of stock.
                </p>
              </div>
            </div>

            <div className="bg-[var(--staff-tile-bg)] rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--staff-muted)]">Product</span>
                <span className="text-[var(--staff-text)] font-medium">
                  {warning.productName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--staff-muted)]">Variant</span>
                <span className="text-[var(--staff-text)] font-medium">
                  {warning.variantInfo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--staff-muted)]">Reserved</span>
                <span className="text-[var(--staff-warning)] font-medium">
                  {warning.reserved}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setWarning(null)}
                className="px-4 py-2 rounded-lg bg-[var(--staff-primary)] text-white text-sm font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* Print-specific CSS — 80mm thermal receipt    */}
      {/* ============================================ */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}