'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

const POSITIONS = [
  { value: 'HOME_HERO', label: 'Home Hero (large top banner)' },
  { value: 'HOME_STRIP', label: 'Home Strip (narrow strip)' },
  { value: 'CATEGORY_TOP', label: 'Category Top' },
  { value: 'PRODUCT_SIDEBAR', label: 'Product Sidebar' },
  { value: 'POPUP', label: 'Popup' },
  { value: 'CHECKOUT', label: 'Checkout' },
];

export default function NewBannerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    mobileImage: '',
    link: '',
    ctaText: '',
    position: 'HOME_HERO',
    sortOrder: '0',
    active: true,
    startsAt: '',
    endsAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = form.title.trim().length > 0 && form.image.trim().length > 0 && !saving;

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
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        image: form.image.trim(),
        mobileImage: form.mobileImage.trim() || undefined,
        link: form.link.trim() || undefined,
        ctaText: form.ctaText.trim() || undefined,
        position: form.position,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      const res = await api.post<any>('/api/banners', body, { token });
      router.push(`/admin/banners/${res.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/admin/banners"
          className="w-10 h-10 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6] min-h-[44px] min-w-[44px]"
        >
          ←
        </Link>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F2A5C]">
            New Banner
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            Create a promotional banner
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 sm:space-y-5">
        <Card title="Content">
          <div className="space-y-4">
            <Field
              label="Title *"
              value={form.title}
              onChange={(v) => update('title', v)}
              placeholder="Summer Sale 2026"
            />
            <Field
              label="Subtitle"
              value={form.subtitle}
              onChange={(v) => update('subtitle', v)}
              placeholder="Up to 50% off on all items"
            />
            <Field
              label="Image URL *"
              value={form.image}
              onChange={(v) => update('image', v)}
              placeholder="/uploads/banners/summer-2026.jpg"
              hint="Upload via /admin/upload, then paste URL"
            />
            {form.image && (
              <div className="rounded-lg border border-[#E8EBF0] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="Preview" className="w-full h-40 object-cover" />
              </div>
            )}
            <Field
              label="Mobile Image URL"
              value={form.mobileImage}
              onChange={(v) => update('mobileImage', v)}
              placeholder="Optional — for mobile view"
            />
          </div>
        </Card>

        <Card title="Action">
          <div className="space-y-4">
            <Field
              label="Link URL"
              value={form.link}
              onChange={(v) => update('link', v)}
              placeholder="/products?category=summer"
            />
            <Field
              label="CTA Button Text"
              value={form.ctaText}
              onChange={(v) => update('ctaText', v)}
              placeholder="Shop Now"
            />
          </div>
        </Card>

        <Card title="Display">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
                Position *
              </label>
              <select
                value={form.position}
                onChange={(e) => update('position', e.target.value)}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
              >
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Sort Order"
              type="number"
              value={form.sortOrder}
              onChange={(v) => update('sortOrder', v)}
              hint="Lower = shows first"
            />
          </div>
        </Card>

        <Card title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
                Starts At (optional)
              </label>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => update('startsAt', e.target.value)}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
                Ends At (optional)
              </label>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => update('endsAt', e.target.value)}
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-6">
          <Link
            href="/admin/banners"
            className="px-5 py-3 rounded-lg text-sm font-medium border border-[#E8EBF0] text-[#0F2A5C] bg-white hover:bg-[#F1F3F6] text-center min-h-[44px] flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSave}
            className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {saving ? 'Creating...' : 'Create Banner'}
          </button>
        </div>
      </form>
    </div>
  );
}

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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C] min-h-[44px]"
      />
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