'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewCourierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    contactPerson: '',
    paymentCycle: '',
    codEnabled: true,
    codFeePercent: 1,
    codFeeFixed: 0,
    active: true,
    isDefault: false,
    notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/courier', form);
      router.push('/admin/couriers');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create courier');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Add Courier</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Contact Person</label>
            <input
              value={form.contactPerson}
              onChange={(e) =>
                setForm({ ...form, contactPerson: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Payment Cycle</label>
            <input
              placeholder="e.g. Weekly, Bi-weekly"
              value={form.paymentCycle}
              onChange={(e) =>
                setForm({ ...form, paymentCycle: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">COD Fee (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.codFeePercent}
              onChange={(e) =>
                setForm({ ...form, codFeePercent: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">COD Fee (Fixed)</label>
            <input
              type="number"
              step="0.01"
              value={form.codFeeFixed}
              onChange={(e) =>
                setForm({ ...form, codFeeFixed: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span>Active</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
            />
            <span>Set as default</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.codEnabled}
              onChange={(e) =>
                setForm({ ...form, codEnabled: e.target.checked })
              }
            />
            <span>COD enabled</span>
          </label>
        </div>

        <div>
          <label className="block mb-1 font-medium">Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Courier'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}