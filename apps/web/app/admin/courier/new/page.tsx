'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ============================================
// Preset courier templates
// ============================================
const PRESETS = [
  {
    key: 'pathao',
    name: 'Pathao',
    phone: '09678-100100',
    website: 'https://pathao.com',
    codFeePercent: 1,
    paymentCycle: 'weekly',
    logo: '/logos/pathao.png',
  },
  {
    key: 'redx',
    name: 'RedX',
    phone: '09678-200200',
    website: 'https://redx.com.bd',
    codFeePercent: 1,
    paymentCycle: 'weekly',
    logo: '/logos/redx.png',
  },
  {
    key: 'steadfast',
    name: 'Steadfast',
    phone: '09610-300300',
    website: 'https://steadfast.com.bd',
    codFeePercent: 1.5,
    paymentCycle: 'biweekly',
    logo: '/logos/steadfast.png',
  },
  {
    key: 'paperfly',
    name: 'Paperfly',
    phone: '09612-400400',
    website: 'https://paperfly.com.bd',
    codFeePercent: 1,
    paymentCycle: 'weekly',
    logo: '/logos/paperfly.png',
  },
  {
    key: 'custom',
    name: '',
    phone: '',
    website: '',
    codFeePercent: 1,
    paymentCycle: 'weekly',
    logo: '',
  },
];

// ============================================
// Page
// ============================================
export default function NewCourierPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    contactPerson: '',
    paymentCycle: 'weekly',

    // API credentials (optional, can add later)
    apiBaseUrl: '',
    apiKey: '',
    apiSecret: '',

    // COD settings
    codEnabled: true,
    codFeePercent: 1,
    codFeeFixed: 0,

    // Status
    active: true,
    isDefault: false,

    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  function applyPreset(key: string) {
    setSelectedPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    if (key === 'custom') {
      setForm((f) => ({
        ...f,
        name: '',
        phone: '',
        website: '',
        logo: '',
        codFeePercent: 1,
        paymentCycle: 'weekly',
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      name: p.name,
      phone: p.phone,
      website: p.website,
      logo: p.logo,
      codFeePercent: p.codFeePercent,
      paymentCycle: p.paymentCycle,
    }));
  }

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canSave = form.name.trim().length > 0 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError('');

    try {
      const token = getToken() || undefined;
      const res = await api.post<any>('/api/courier', form, { token });
      const created = res.data;

      router.push(`/admin/courier/${created.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to create courier';
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/courier"
          className="w-9 h-9 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6]"
        >
          ←
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#0F2A5C]">
            Add Courier
          </h1>
          <p className="text-sm text-[#8A8F98]">
            Add a shipping partner — you can add API keys later
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
        {/* Preset picker */}
        <Card title="Quick Setup" subtitle="Pick a courier to autofill">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  selectedPreset === p.key
                    ? 'border-[#0F2A5C] bg-[#0F2A5C]/5'
                    : 'border-[#E8EBF0] bg-white hover:border-[#0F2A5C]/40'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#F1F3F6] flex items-center justify-center overflow-hidden mb-1">
                  {p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logo}
                      alt={p.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xl">➕</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[#0F2A5C]">
                  {p.key === 'custom' ? 'Custom' : p.name}
                </div>
                <div className="text-[10px] text-[#8A8F98]">
                  {p.key === 'custom' ? 'Manual entry' : 'Preset'}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Basic info */}
        <Card title="Basic Info">
          <div className="grid md:grid-cols-2 gap-4">
            <Field
              label="Courier Name *"
              value={form.name}
              onChange={(v) => update('name', v)}
              placeholder="Pathao, RedX, Steadfast"
              required
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => update('phone', v)}
              placeholder="09678-100100"
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update('email', v)}
              placeholder="support@pathao.com"
            />
            <Field
              label="Website"
              value={form.website}
              onChange={(v) => update('website', v)}
              placeholder="https://pathao.com"
            />
            <Field
              label="Contact Person"
              value={form.contactPerson}
              onChange={(v) => update('contactPerson', v)}
              placeholder="Account manager name"
            />
            <SelectField
              label="Payment Cycle"
              value={form.paymentCycle}
              onChange={(v) => update('paymentCycle', v)}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'biweekly', label: 'Bi-weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'ondemand', label: 'On-demand' },
              ]}
            />
          </div>
        </Card>

        {/* COD settings */}
        <Card
          title="COD Settings"
          subtitle="Cash on Delivery fee structure"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <Field
              label="COD Fee %"
              type="number"
              value={String(form.codFeePercent)}
              onChange={(v) => update('codFeePercent', Number(v) || 0)}
              placeholder="1"
              suffix="%"
            />
            <Field
              label="COD Fixed Fee"
              type="number"
              value={String(form.codFeeFixed)}
              onChange={(v) => update('codFeeFixed', Number(v) || 0)}
              placeholder="0"
              suffix="৳"
            />
            <div className="flex items-end pb-2">
              <Toggle
                label="COD Enabled"
                checked={form.codEnabled}
                onChange={(v) => update('codEnabled', v)}
              />
            </div>
          </div>
        </Card>

        {/* API credentials */}
        <Card
          title="API Credentials"
          subtitle="Optional — add later when you get them from courier"
        >
          <div className="space-y-4">
            <Field
              label="API Base URL"
              value={form.apiBaseUrl}
              onChange={(v) => update('apiBaseUrl', v)}
              placeholder="https://portal.packzy.com/api/v1"
            />
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label="API Key"
                value={form.apiKey}
                onChange={(v) => update('apiKey', v)}
                placeholder="Leave empty"
              />
              <Field
                label="API Secret"
                value={form.apiSecret}
                onChange={(v) => update('apiSecret', v)}
                placeholder="Leave empty"
                type="password"
              />
            </div>
            <div className="text-xs text-[#8A8F98] bg-[#F1F4F9] rounded-lg px-3 py-2">
              💡 You can leave these empty and add them later from the courier
              detail page.
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card title="Status">
          <div className="flex flex-wrap gap-6">
            <Toggle
              label="Active"
              checked={form.active}
              onChange={(v) => update('active', v)}
            />
            <Toggle
              label="Set as default courier"
              checked={form.isDefault}
              onChange={(v) => update('isDefault', v)}
            />
          </div>
        </Card>

        {/* Notes */}
        <Card title="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Internal notes about this courier..."
            rows={3}
            className="w-full rounded-lg px-3.5 py-2 text-sm border border-[#E8EBF0] focus:outline-none focus:border-[#0F2A5C] resize-none"
          />
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pb-6">
          <Link
            href="/admin/courier"
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] bg-white hover:bg-[#F1F3F6] transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSave}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Courier'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// UI Components
// ============================================
function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-[#0F2A5C]">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[#8A8F98] mt-0.5">{subtitle}</p>
        )}
      </div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  suffix?: string;
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
          className="w-full rounded-lg px-3.5 py-2 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C]"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8F98]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3.5 py-2 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition ${
          checked ? 'bg-[#0F2A5C]' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-[#0F2A5C]">{label}</span>
    </label>
  );
}