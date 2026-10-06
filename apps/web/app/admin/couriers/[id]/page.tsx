'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Courier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  paymentCycle: string | null;
  active: boolean;
  isDefault: boolean;
  codEnabled: boolean;
  codFeePercent: number;
  codFeeFixed: number;
  notes: string | null;
}

interface Rate {
  id: string;
  district: string;
  weightUpTo: number;
  deliveryFee: number;
  extraPerKg: number;
  codFee: number;
  returnFee: number;
  active: boolean;
}

export default function CourierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [courier, setCourier] = useState<Courier | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'info' | 'rates'>('info');

  async function load() {
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        api.get(`/api/courier/${id}`),
        api.get(`/api/courier/${id}/rates`),
      ]);
      setCourier(cRes.data.data);
      setRates(rRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function saveInfo() {
    if (!courier) return;
    setSaving(true);
    try {
      await api.patch(`/api/courier/${id}`, courier);
      alert('Saved successfully');
    } catch (err) {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourier() {
    if (!confirm('Delete this courier?')) return;
    try {
      await api.delete(`/api/courier/${id}`);
      router.push('/admin/couriers');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete');
    }
  }

  if (loading) return <p className="p-6">Loading...</p>;
  if (!courier) return <p className="p-6">Courier not found.</p>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{courier.name}</h1>
        <button
          onClick={deleteCourier}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab('info')}
          className={`px-4 py-2 ${
            tab === 'info'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-gray-600'
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setTab('rates')}
          className={`px-4 py-2 ${
            tab === 'rates'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-gray-600'
          }`}
        >
          Rates ({rates.length})
        </button>
      </div>

      {tab === 'info' && (
        <div className="max-w-2xl space-y-4">
          <div>
            <label className="block mb-1 font-medium">Name</label>
            <input
              value={courier.name}
              onChange={(e) => setCourier({ ...courier, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">Phone</label>
              <input
                value={courier.phone || ''}
                onChange={(e) =>
                  setCourier({ ...courier, phone: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                value={courier.email || ''}
                onChange={(e) =>
                  setCourier({ ...courier, email: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={courier.active}
                onChange={(e) =>
                  setCourier({ ...courier, active: e.target.checked })
                }
              />
              <span>Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={courier.isDefault}
                onChange={(e) =>
                  setCourier({ ...courier, isDefault: e.target.checked })
                }
              />
              <span>Default</span>
            </label>
          </div>
          <button
            onClick={saveInfo}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'rates' && (
        <div>
          {rates.length === 0 ? (
            <p className="text-gray-500">No rates added yet.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">District</th>
                  <th className="text-left p-3">Weight (kg)</th>
                  <th className="text-left p-3">Delivery</th>
                  <th className="text-left p-3">Extra/kg</th>
                  <th className="text-left p-3">Return</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-3">{r.district}</td>
                    <td className="p-3">{r.weightUpTo}</td>
                    <td className="p-3">৳{r.deliveryFee}</td>
                    <td className="p-3">৳{r.extraPerKg}</td>
                    <td className="p-3">৳{r.returnFee}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          r.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}