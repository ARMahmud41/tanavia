'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface PaymentSettings {
  cod: boolean;
  bkash: { number: string; type: 'Merchant' | 'Personal'; on: boolean };
  nagad: { number: string; type: 'Merchant' | 'Personal'; on: boolean };
  rocket: { number: string; type: 'Merchant' | 'Personal'; on: boolean };
  card: {
    on: boolean;
    provider: 'SSLCommerz' | 'Stripe' | 'Manual';
    storeId: string;
    storePassword: string;
    sandbox: boolean;
  };
}

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const token = getToken() || undefined;
      const res = await api.get<PaymentSettings>('/api/payments/settings', { token });
      setSettings(res.data || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const token = getToken() || undefined;
      await api.post('/api/payments/settings', settings, { token });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="p-6 text-center text-sm text-[#8A8F98]">Loading settings...</div>
    );
  }

  const s = settings;

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen" style={{ background: '#F7F8FA' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0F2A5C]">
          <span className="text-white font-bold text-lg sm:text-xl">⚙️</span>
        </div>
        <div>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold text-[#0F2A5C]">
            Payment Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8F98]">
            Where customers send money — bKash, Nagad, Rocket, Card
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-3">
          ✅ Settings saved successfully
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* COD */}
        <Section
          title="Cash on Delivery"
          subtitle="Customer pays when the courier delivers"
          enabled={s.cod}
          onToggle={(v) => setSettings({ ...s, cod: v })}
        >
          <p className="text-xs text-[#8A8F98]">No number needed — courier collects the cash.</p>
        </Section>

        {/* bKash */}
        <Section
          title="bKash"
          subtitle="Mobile wallet — mostly Personal or Merchant"
          enabled={s.bkash.on}
          onToggle={(v) => setSettings({ ...s, bkash: { ...s.bkash, on: v } })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                bKash number
              </label>
              <input
                type="text"
                value={s.bkash.number}
                onChange={(e) =>
                  setSettings({ ...s, bkash: { ...s.bkash, number: e.target.value } })
                }
                placeholder="01XXXXXXXXX"
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Type
              </label>
              <select
                value={s.bkash.type}
                onChange={(e) =>
                  setSettings({
                    ...s,
                    bkash: { ...s.bkash, type: e.target.value as any },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              >
                <option value="Personal">Personal</option>
                <option value="Merchant">Merchant</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Nagad */}
        <Section
          title="Nagad"
          subtitle="Mobile wallet — mostly Personal or Merchant"
          enabled={s.nagad.on}
          onToggle={(v) => setSettings({ ...s, nagad: { ...s.nagad, on: v } })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Nagad number
              </label>
              <input
                type="text"
                value={s.nagad.number}
                onChange={(e) =>
                  setSettings({ ...s, nagad: { ...s.nagad, number: e.target.value } })
                }
                placeholder="01XXXXXXXXX"
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Type
              </label>
              <select
                value={s.nagad.type}
                onChange={(e) =>
                  setSettings({
                    ...s,
                    nagad: { ...s.nagad, type: e.target.value as any },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              >
                <option value="Personal">Personal</option>
                <option value="Merchant">Merchant</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Rocket */}
        <Section
          title="Rocket"
          subtitle="DBBL mobile wallet"
          enabled={s.rocket.on}
          onToggle={(v) => setSettings({ ...s, rocket: { ...s.rocket, on: v } })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Rocket number
              </label>
              <input
                type="text"
                value={s.rocket.number}
                onChange={(e) =>
                  setSettings({ ...s, rocket: { ...s.rocket, number: e.target.value } })
                }
                placeholder="01XXXXXXXXXX"
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Type
              </label>
              <select
                value={s.rocket.type}
                onChange={(e) =>
                  setSettings({
                    ...s,
                    rocket: { ...s.rocket, type: e.target.value as any },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              >
                <option value="Personal">Personal</option>
                <option value="Merchant">Merchant</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Card */}
        <Section
          title="Card Payments"
          subtitle="Online card gateway (SSLCommerz, Stripe)"
          enabled={s.card.on}
          onToggle={(v) => setSettings({ ...s, card: { ...s.card, on: v } })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Provider
              </label>
              <select
                value={s.card.provider}
                onChange={(e) =>
                  setSettings({
                    ...s,
                    card: { ...s.card, provider: e.target.value as any },
                  })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px]"
              >
                <option value="SSLCommerz">SSLCommerz</option>
                <option value="Stripe">Stripe</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Store ID
              </label>
              <input
                type="text"
                value={s.card.storeId}
                onChange={(e) =>
                  setSettings({ ...s, card: { ...s.card, storeId: e.target.value } })
                }
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px] font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#0F2A5C] mb-1.5">
                Store Password
              </label>
              <input
                type="password"
                value={s.card.storePassword}
                onChange={(e) =>
                  setSettings({
                    ...s,
                    card: { ...s.card, storePassword: e.target.value },
                  })
                }
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm border border-[#E8EBF0] min-h-[44px] font-mono"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="sandbox"
                checked={s.card.sandbox}
                onChange={(e) =>
                  setSettings({ ...s, card: { ...s.card, sandbox: e.target.checked } })
                }
                className="rounded"
              />
              <label htmlFor="sandbox" className="text-sm text-[#5A6270]">
                Sandbox mode (testing)
              </label>
            </div>
          </div>
        </Section>

        {/* Save button */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={load}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E8EBF0] bg-white text-[#0F2A5C] hover:bg-[#F1F3F6] min-h-[44px]"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// Section wrapper with toggle
// ============================================
function Section({
  title,
  subtitle,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white shadow-sm border border-[#E8EBF0] overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[#E8EBF0]">
        <div>
          <h2 className="font-serif text-base sm:text-lg font-semibold text-[#0F2A5C]">
            {title}
          </h2>
          <p className="text-xs text-[#8A8F98] mt-0.5">{subtitle}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-xs font-semibold text-[#0F2A5C]">
            {enabled ? 'On' : 'Off'}
          </span>
        </label>
      </div>
      <div className={`p-4 sm:p-5 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        {children}
      </div>
    </div>
  );
}