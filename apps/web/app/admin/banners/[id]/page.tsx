'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

const POSITIONS = [
  { value: 'HOME_HERO', label: 'Home Hero' },
  { value: 'HOME_STRIP', label: 'Home Strip' },
  { value: 'CATEGORY_TOP', label: 'Category Top' },
  { value: 'PRODUCT_SIDEBAR', label: 'Product Sidebar' },
  { value: 'POPUP', label: 'Popup' },
  { value: 'CHECKOUT', label: 'Checkout' },
];

interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  mobileImage?: string | null;
  link?: string | null;
  ctaText?: string | null;
  position: string;
  sortOrder: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  impressions: number;
  clicks: number;
}

export default function EditBannerPage() {
  const params = useParams();
  const router = useRouter();
  const bannerId = params?.id as string;

  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDelete, setShowDelete] = useState(false);

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

  async function load() {
    if (!bannerId) return;
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<Banner>(`/api/banners/${bannerId}`, { token });
      const b = res.data;
      setBanner(b);
      setForm({
        title: b.title,
        subtitle: b.subtitle || '',
        image: b.image,
        mobileImage: b.mobileImage || '',
        link: b.link || '',
        ctaText: b.ctaText || '',
        position: b.position,
        sortOrder: String(b.sortOrder),
        active: b.active,
        startsAt: b.startsAt ? b.startsAt.slice(0, 10) : '',
        endsAt: b.endsAt ? b.endsAt.slice(0, 10) : '',
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
  }, [bannerId]);

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
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        image: form.image.trim(),
        mobileImage: form.mobileImage.trim() || null,
        link: form.link.trim() || null,
        ctaText: form.ctaText.trim() || null,
        position: form.position,
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      };
      await api.patch(`/api/banners/${bannerId}`, body, { token });
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
      await api.delete(`/api/banners/${bannerId}`, { token });
      router.push('/admin/banners');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-[#8A8F98]">
        Loading banner...
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error || 'Banner not found'}
        </div>
        <Link href="/admin/banners" className="inline-block text-sm text-[#0F2A5C] underline">
          ← Back to banners
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/admin/banners"
          className="w-10 h-10 rounded-lg border border-[#E8EBF0] bg-white flex items-center justify-center hover:bg-[#F1F3F6] min-h-[44px] min-w-[44px] flex-shrink-0"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F2A5C] truncate">
            {banner.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            {POSITIONS.find((p) => p.value === banner.position)?.label}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5">
        <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            Impressions
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#0F2A5C]">
            {banner.impressions}
          </div>
        </div>
        <div className="rounded-lg p-3 sm:p-4 bg-white shadow-sm border border-[#E8EBF0]">
          <div className="text-[10px] uppercase tracking-wide text-[#8A8F98] font-medium">
            Clicks
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#0F2A5C]">
            {banner.clicks}
          </div>
        </div>
      </div>

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

      <form onSubmit={handleSave} className="max-w-2xl space-y-4 sm:space-y-5">
        <Card title="Content">
          <div className="space-y-4">
            <Field
              label="Title *"
              value={form.title}
              onChange={(v) => update('title', v)}
            />
            <Field
              label="Subtitle"
              value={form.subtitle}
              onChange={(v) => update('subtitle', v)}
            />
            <Field
              label="Image URL *"
              value={form.image}
              onChange={(v) => update('image', v)}
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
            />
          </div>
        </Card>

        <Card title="Action">
          <div className="space-y-4">
            <Field label="Link URL" value={form.link} onChange={(v) => update('link', v)} />
            <Field label="CTA Button Text" value={form.ctaText} onChange={(v) => update('ctaText', v)} />
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
            <Field label="Sort Order" type="number" value={form.sortOrder} onChange={(v) => update('sortOrder', v)} />
          </div>
        </Card>

        <Card title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">
                Starts At
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
                Ends At
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
          <Toggle label="Active" checked={form.active} onChange={(v) => update('active', v)} />
        </Card>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-4">
          <Link
            href="/admin/banners"
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

      <div className="max-w-2xl mt-6">
        <div className="rounded-lg bg-white shadow-sm border border-red-100 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-red-600 text-sm sm:text-base">
                Danger Zone
              </h3>
              <p className="text-xs text-[#8A8F98] mt-0.5">
                Delete this banner permanently
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 min-h-[44px]"
            >
              Delete Banner
            </button>
          </div>
        </div>
      </div>

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
              Delete "{banner.title}"?
            </h2>
            <p className="text-sm text-[#8A8F98] mb-5">This cannot be undone.</p>
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
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