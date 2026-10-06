'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Courier {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  apiBaseUrl?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  active: boolean;
  isDefault: boolean;
  codEnabled: boolean;
  codFeePercent: string | number;
  codFeeFixed: string | number;
  contactPerson?: string | null;
  paymentCycle?: string | null;
  notes?: string | null;
  _count?: {
    orders: number;
    rates: number;
    returns: number;
    settlements: number;
  };
}

interface Rate {
  id: string;
  courierId: string;
  district: string;
  weightUpTo: string | number;
  deliveryFee: string | number;
  extraPerKg: string | number;
  codFee: string | number;
  returnFee: string | number;
  active: boolean;
}

type Tab = 'overview' | 'rates' | 'api';

// ============================================
// Bangladesh Districts
// ============================================
const DISTRICTS = [
  'Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi',
  'Barishal', 'Rangpur', 'Mymensingh', 'Cumilla', 'Narayanganj',
  'Gazipur', 'Bogura', 'Jashore', 'Coxs Bazar', 'Noakhali',
  'Feni', 'Brahmanbaria', 'Chandpur', 'Tangail', 'Manikganj',
];

// ============================================
// Page
// ============================================
export default function CourierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courierId = params?.id as string;

  const [courier, setCourier] = useState<Courier | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!courierId) return;
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const [cRes, rRes] = await Promise.all([
        api.get<Courier>(`/api/courier/${courierId}`, { token }),
        api.get<Rate[]>(`/api/courier/${courierId}/rates`, { token }),
      ]);
      setCourier(cRes.data);
      setRates(rRes.data || []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load courier';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierId]);

  async function handleSave(updates: Partial<Courier>) {
    if (!courier) return;
    setSaving(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.patch<Courier>(
        `/api/courier/${courier.id}`,
        updates,
        { token }
      );
      setCourier(res.data);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!courier) return;
    if (
      !confirm(
        `Delete "${courier.name}" permanently? This cannot be undone.`
      )
    )
      return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/courier/${courier.id}`, { token });
      router.push('/admin/courier');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to delete';
      setError(msg);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-sm text-[#8A8F98]">
        Loading courier...
      </div>
    );
  }

  if (error && !courier) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
        <Link
          href="/admin/courier"
          className="inline-block mt-4 text-sm text-[#0F2A5C] underline"
        >
          ← Back to couriers
        </Link>
      </div>
    );
  }

  if (!courier) return null;

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
        <div className="w-12 h-12 rounded-lg bg-[#F1F3F6] border border-[#E8EBF0] flex items-center justify-center overflow-hidden flex-shrink-0">
          {courier.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={courier.logo}
              alt={courier.name}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <div className="w-full h-full bg-[#0F2A5C] flex items-center justify-center text-white font-bold">
              {courier.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-semibold text-[#0F2A5C] flex items-center gap-2">
            {courier.name}
            {courier.isDefault && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">
                Default
              </span>
            )}
          </h1>
          <p className="text-sm text-[#8A8F98]">
            {courier.slug} ·{' '}
            {courier.active ? 'Active' : 'Inactive'} ·{' '}
            {courier._count?.orders ?? 0} orders ·{' '}
            {courier._count?.rates ?? 0} rates
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg p-1.5 mb-5 inline-flex gap-1 bg-white shadow-sm">
        {(['overview', 'rates', 'api'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition capitalize ${
              tab === t ? 'text-white bg-[#0F2A5C]' : 'text-[#8A8F98]'
            }`}
          >
            {t === 'api' ? 'API Credentials' : t}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          courier={courier}
          saving={saving}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {tab === 'rates' && (
        <RatesTab
          courierId={courier.id}
          courierName={courier.name}
          rates={rates}
          onReload={load}
        />
      )}
      {tab === 'api' && (
        <ApiTab courier={courier} saving={saving} onSave={handleSave} />
      )}
    </div>
  );
}

// ============================================
// Overview Tab
// ============================================
function OverviewTab({
  courier,
  saving,
  onSave,
  onDelete,
}: {
  courier: Courier;
  saving: boolean;
  onSave: (updates: Partial<Courier>) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: courier.name,
    phone: courier.phone || '',
    email: courier.email || '',
    website: courier.website || '',
    contactPerson: courier.contactPerson || '',
    paymentCycle: courier.paymentCycle || 'weekly',
    codEnabled: courier.codEnabled,
    codFeePercent: String(courier.codFeePercent),
    codFeeFixed: String(courier.codFeeFixed),
    active: courier.active,
    isDefault: courier.isDefault,
    notes: courier.notes || '',
  });

  function update<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      codFeePercent: Number(form.codFeePercent) || 0,
      codFeeFixed: Number(form.codFeeFixed) || 0,
    } as any);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      <Card title="Basic Info">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Name" value={form.name} onChange={(v) => update('name', v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} />
          <Field label="Email" value={form.email} onChange={(v) => update('email', v)} />
          <Field label="Website" value={form.website} onChange={(v) => update('website', v)} />
          <Field label="Contact Person" value={form.contactPerson} onChange={(v) => update('contactPerson', v)} />
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

      <Card title="COD Settings">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="COD Fee %" type="number" value={form.codFeePercent} onChange={(v) => update('codFeePercent', v)} suffix="%" />
          <Field label="COD Fixed Fee" type="number" value={form.codFeeFixed} onChange={(v) => update('codFeeFixed', v)} suffix="৳" />
          <div className="flex items-end pb-2">
            <Toggle label="COD Enabled" checked={form.codEnabled} onChange={(v) => update('codEnabled', v)} />
          </div>
        </div>
      </Card>

      <Card title="Status">
        <div className="flex flex-wrap gap-6">
          <Toggle label="Active" checked={form.active} onChange={(v) => update('active', v)} />
          <Toggle label="Set as default courier" checked={form.isDefault} onChange={(v) => update('isDefault', v)} />
        </div>
      </Card>

      <Card title="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          className="w-full rounded-lg px-3.5 py-2 text-sm border border-[#E8EBF0] focus:outline-none focus:border-[#0F2A5C] resize-none"
          placeholder="Internal notes..."
        />
      </Card>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <Card title="Danger Zone">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#0F2A5C]">Delete courier</div>
            <div className="text-xs text-[#8A8F98]">
              Only possible if no orders/settlements exist
            </div>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </Card>
    </form>
  );
}

// ============================================
// Rates Tab
// ============================================
function RatesTab({
  courierId,
  courierName,
  rates,
  onReload,
}: {
  courierId: string;
  courierName: string;
  rates: Rate[];
  onReload: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    district: 'Dhaka',
    weightUpTo: '0.5',
    deliveryFee: '',
    extraPerKg: '0',
    codFee: '0',
    returnFee: '',
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const token = getToken() || undefined;
      await api.post(
        `/api/courier/${courierId}/rates`,
        {
          district: form.district,
          weightUpTo: Number(form.weightUpTo) || 0.5,
          deliveryFee: Number(form.deliveryFee) || 0,
          extraPerKg: Number(form.extraPerKg) || 0,
          codFee: Number(form.codFee) || 0,
          returnFee: Number(form.returnFee) || 0,
        },
        { token }
      );
      setShowAdd(false);
      setForm({
        district: 'Dhaka',
        weightUpTo: '0.5',
        deliveryFee: '',
        extraPerKg: '0',
        codFee: '0',
        returnFee: '',
      });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add rate');
    }
  }

  async function handleDelete(rateId: string) {
    if (!confirm('Delete this rate?')) return;
    try {
      const token = getToken() || undefined;
      await api.delete(`/api/courier/${courierId}/rates/${rateId}`, { token });
      onReload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#0F2A5C]">
            {courierName} Rates ({rates.length})
          </h3>
          <p className="text-xs text-[#8A8F98]">
            Delivery charge by district + weight bracket
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45]"
        >
          {showAdd ? 'Cancel' : '+ Add Rate'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-5"
        >
          <h4 className="font-semibold text-[#0F2A5C] mb-4">New Rate</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <SelectField
              label="District"
              value={form.district}
              onChange={(v) => setForm((f) => ({ ...f, district: v }))}
              options={DISTRICTS.map((d) => ({ value: d, label: d }))}
            />
            <Field
              label="Weight up to (kg)"
              type="number"
              value={form.weightUpTo}
              onChange={(v) => setForm((f) => ({ ...f, weightUpTo: v }))}
              suffix="kg"
            />
            <Field
              label="Delivery Fee"
              type="number"
              value={form.deliveryFee}
              onChange={(v) => setForm((f) => ({ ...f, deliveryFee: v }))}
              suffix="৳"
              required
            />
            <Field
              label="Extra per kg"
              type="number"
              value={form.extraPerKg}
              onChange={(v) => setForm((f) => ({ ...f, extraPerKg: v }))}
              suffix="৳"
            />
            <Field
              label="COD Fee"
              type="number"
              value={form.codFee}
              onChange={(v) => setForm((f) => ({ ...f, codFee: v }))}
              suffix="৳"
            />
            <Field
              label="Return Fee"
              type="number"
              value={form.returnFee}
              onChange={(v) => setForm((f) => ({ ...f, returnFee: v }))}
              suffix="৳"
              required
            />
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45]"
            >
              Add Rate
            </button>
          </div>
        </form>
      )}

      <div className="rounded-lg overflow-hidden bg-white shadow-sm">
        {rates.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📍</div>
            <p className="text-[#0F2A5C] font-medium">No rates yet</p>
            <p className="text-sm text-[#8A8F98]">
              Add delivery rates per district
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide bg-[#F1F4F9] text-[#8A8F98]">
                <th className="text-left px-4 py-3 font-medium">District</th>
                <th className="text-center px-4 py-3 font-medium">Weight</th>
                <th className="text-right px-4 py-3 font-medium">Delivery</th>
                <th className="text-right px-4 py-3 font-medium">Extra/kg</th>
                <th className="text-right px-4 py-3 font-medium">COD</th>
                <th className="text-right px-4 py-3 font-medium">Return</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t border-[#E8EBF0]">
                  <td className="px-4 py-3 font-medium text-[#0F2A5C]">
                    {r.district}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-[#8A8F98]">
                    ≤ {Number(r.weightUpTo)} kg
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0F2A5C]">
                    {tk(Number(r.deliveryFee))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {tk(Number(r.extraPerKg))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {tk(Number(r.codFee))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {tk(Number(r.returnFee))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.active ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        ● Active
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                        ○ Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================
// API Credentials Tab
// ============================================
function ApiTab({
  courier,
  saving,
  onSave,
}: {
  courier: Courier;
  saving: boolean;
  onSave: (updates: Partial<Courier>) => void;
}) {
  const [form, setForm] = useState({
    apiBaseUrl: courier.apiBaseUrl || '',
    apiKey: courier.apiKey || '',
    apiSecret: courier.apiSecret || '',
  });

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <Card
        title="API Credentials"
        subtitle="Required for auto-booking. Only visible to admin."
      >
        <div className="space-y-4">
          <Field
            label="API Base URL"
            value={form.apiBaseUrl}
            onChange={(v) => update('apiBaseUrl', v)}
            placeholder="https://portal.packzy.com/api/v1"
          />
          <Field
            label="API Key"
            value={form.apiKey}
            onChange={(v) => update('apiKey', v)}
            placeholder="Paste from courier panel"
          />
          <Field
            label="API Secret"
            type="password"
            value={form.apiSecret}
            onChange={(v) => update('apiSecret', v)}
            placeholder="Paste secret key"
          />
        </div>
      </Card>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
        <div className="font-semibold mb-1">⚠️ Where to get credentials:</div>
        <div className="space-y-0.5">
          <div>• <strong>Steadfast:</strong> steadfast.com.bd/login → API Credentials</div>
          <div>• <strong>Pathao:</strong> merchant.pathao.com/developer</div>
          <div>• <strong>RedX:</strong> redx.com.bd/merchant → API Access Token</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Credentials'}
        </button>
      </div>
    </form>
  );
}

// ============================================
// UI Components (reuse from new page)
// ============================================
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-[#0F2A5C]">{title}</h3>
        {subtitle && <p className="text-xs text-[#8A8F98] mt-0.5">{subtitle}</p>}
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
      <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">{label}</label>
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
      <label className="block text-xs font-medium text-[#0F2A5C] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg px-3.5 py-2 text-sm border border-[#E8EBF0] bg-white focus:outline-none focus:border-[#0F2A5C]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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