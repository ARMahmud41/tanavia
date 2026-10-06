'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string | number;
  minSpend: string | number;
  maxDiscount?: string | number | null;
  usageLimit?: number | null;
  usedCount: number;
  perUser: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditCouponPage() {
  const params = useParams();
  const router = useRouter();
  const couponId = params?.id as string;

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const [form, setForm] = useState({
    code: '',
    type: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: '',
    minSpend: '0',
    maxDiscount: '',
    usageLimit: '',
    perUser: '1',
    expiresAt: '',
    active: true,
  });

  async function load() {
    if (!couponId) return;
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<Coupon>(`/api/coupons/${couponId}`, { token });
      const c = res.data;
      setCoupon(c);
      setForm({
        code: c.code,
        type: c.type,
        value: String(c.value),
        minSpend: String(c.minSpend),
        maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
        usageLimit: c.usageLimit ? String(c.usageLimit) : '',
        perUser: String(c.perUser),
        expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
        active: c.active,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponId]);

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = getToken() || undefined;
      const body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minSpend: Number(form.minSpend) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUser: Number(form.perUser) || 1,
        active: form.active,
        expiresAt: form.expiresAt || null,
      };
      await api.patch(`/api/coupons/${couponId}`, body, { token });
      setSuccess('✅ Changes saved');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/coupons/${couponId}`, { token });
      router.push('/admin/coupons');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-[#8A8F98]">
        Loading coupon...
      </div>
    );
  }

  if (error && !coupon) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
        <Link
          href="/admin/coupons"
          className="inline-block text-sm text-[#0F2A5C] underline"
        >
          ← Back to coupons
        </Link>
      </div>
    );
  }

  if (!coupon) return null;

  const usagePct =
    coupon.usageLimit && coupon.usageLimit > 0
      ? Math.min(100, (coupon.usedCount / coupon.usageLimit) * 100)
      : 0;

  return (
    <div
      className="p-4 sm:p-6 md:p-8 min-h-screen"
      style={{ background: '#F7F8FA' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/admin/coupons"
          className="w-10 h-10 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6] min-h-[44px] min-w-[44px] flex-shrink-0"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F2A5C] truncate">
            {coupon.code}
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            {coupon.type === 'PERCENT'
              ? `${Number(coupon.value)}% off`
              : `৳${Number(coupon.value)} off`}
            {coupon.active ? ' · Active' : ' · Inactive'}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5">
        <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            Used
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#0F2A5C]">
            {coupon.usedCount}
            {coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : ''}
          </div>
          {coupon.usageLimit !== null && (
            <div className="mt-2 h-1.5 rounded-full bg-[#F1F3F6] overflow-hidden">
              <div
                className="h-full bg-[#0F2A5C] rounded-full transition"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </div>
        <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            Expires
          </div>
          <div className="text-sm sm:text-base font-semibold text-[#0F2A5C]">
            {coupon.expiresAt
              ? formatDateTime(coupon.expiresAt).split(',')[0]
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="max-w-2xl space-y-4 sm:space-y-5">
        <Card title="Coupon Code">
          <div className="space-y-4">
            <Field
              label="Code *"
              value={form.code}
              onChange={(v) => update('code', v.toUpperCase())}
              placeholder="WELCOME10"
              hint="Uppercase letters & numbers only"
            />
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-2">
                Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['PERCENT', 'FIXED'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('type', t)}
                    className={`py-3 rounded-lg text-sm font-semibold border-2 transition min-h-[44px] ${
                      form.type === t
                        ? 'border-[#0F2A5C] bg-[#0F2A5C]/5 text-[#0F2A5C]'
                        : 'border-[#E8EBF0] text-[#8A8F98] hover:border-[#0F2A5C]/40'
                    }`}
                  >
                    {t === 'PERCENT' ? '% Percent' : '৳ Fixed Amount'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Discount">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={form.type === 'PERCENT' ? 'Discount %' : 'Discount Amount'}
              type="number"
              value={form.value}
              onChange={(v) => update('value', v)}
              suffix={form.type === 'PERCENT' ? '%' : '৳'}
              required
            />
            <Field
              label="Max Discount"
              type="number"
              value={form.maxDiscount}
              onChange={(v) => update('maxDiscount', v)}
              placeholder="Optional"
              suffix="৳"
            />
          </div>
        </Card>

        <Card title="Requirements">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Minimum Spend"
              type="number"
              value={form.minSpend}
              onChange={(v) => update('minSpend', v)}
              suffix="৳"
            />
            <Field
              label="Usage Limit"
              type="number"
              value={form.usageLimit}
              onChange={(v) => update('usageLimit', v)}
              placeholder="Unlimited"
            />
            <Field
              label="Per User"
              type="number"
              value={form.perUser}
              onChange={(v) => update('perUser', v)}
            />
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
                Expires At
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => update('expiresAt', e.target.value)}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
              />
            </div>
          </div>
        </Card>

        <Card title="Status">
          <Toggle
            label="Active"
            checked={form.active}
            onChange={(v) => update('active', v)}
          />
        </Card>

        {/* Actions — mobile stack */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-4">
          <Link
            href="/admin/coupons"
            className="px-5 py-3 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] bg-white hover:bg-[#F1F3F6] text-center min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="max-w-2xl mt-6">
        <div className="rounded-lg bg-white shadow-sm border border-red-100 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-red-600 text-sm sm:text-base">
                Danger Zone
              </h3>
              <p className="text-xs text-[#8A8F98] mt-0.5">
                Delete this coupon permanently
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 min-h-[44px]"
            >
              Delete Coupon
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowDelete(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-2">
              Delete "{coupon.code}"?
            </h2>
            <p className="text-sm text-[#8A8F98] mb-5">
              This action cannot be undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// UI Components
// ============================================
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-4 sm:p-5">
      <h3 className="font-semibold text-[#0F2A5C] mb-3 sm:mb-4 text-sm sm:text-base">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8F98]">
            {suffix}
          </span>
        )}
      </div>
      {hint && <div className="text-[10px] text-[#8A8F98] mt-1">{hint}</div>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${
          checked ? 'bg-[#0F2A5C]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${
            checked ? 'left-[24px]' : 'left-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-[#0F2A5C]">{label}</span>
    </label>
  );
}