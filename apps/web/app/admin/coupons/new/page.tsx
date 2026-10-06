'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function NewCouponPage() {
  const router = useRouter();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = form.code.trim().length >= 3 && Number(form.value) > 0 && !saving;

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
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
      const res = await api.post<any>('/api/coupons', body, { token });
      router.push(`/admin/coupons/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/admin/coupons"
          className="w-10 h-10 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6] min-h-[44px] min-w-[44px]"
        >
          ←
        </Link>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F2A5C]">
            New Coupon
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            Create a discount code
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 sm:space-y-5">
        {/* Code + Type */}
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

        {/* Discount value */}
        <Card title="Discount">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={form.type === 'PERCENT' ? 'Discount %' : 'Discount Amount'}
              type="number"
              value={form.value}
              onChange={(v) => update('value', v)}
              placeholder={form.type === 'PERCENT' ? '10' : '100'}
              suffix={form.type === 'PERCENT' ? '%' : '৳'}
              required
            />
            <Field
              label="Max Discount (optional)"
              type="number"
              value={form.maxDiscount}
              onChange={(v) => update('maxDiscount', v)}
              placeholder="200"
              suffix="৳"
            />
          </div>
        </Card>

        {/* Requirements */}
        <Card title="Requirements">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Minimum Spend"
              type="number"
              value={form.minSpend}
              onChange={(v) => update('minSpend', v)}
              placeholder="500"
              suffix="৳"
            />
            <Field
              label="Usage Limit (optional)"
              type="number"
              value={form.usageLimit}
              onChange={(v) => update('usageLimit', v)}
              placeholder="100"
              hint="Leave empty for unlimited"
            />
            <Field
              label="Per User Limit"
              type="number"
              value={form.perUser}
              onChange={(v) => update('perUser', v)}
              placeholder="1"
            />
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
                Expires At (optional)
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

        {/* Status */}
        <Card title="Status">
          <Toggle
            label="Active"
            checked={form.active}
            onChange={(v) => update('active', v)}
          />
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Actions — mobile stack */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-6">
          <Link
            href="/admin/coupons"
            className="px-5 py-3 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] bg-white hover:bg-[#F1F3F6] text-center min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSave}
            className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      </form>
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