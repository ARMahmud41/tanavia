'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Courier {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  active: boolean;
  isDefault: boolean;
  codEnabled: boolean;
  _count: {
    orders: number;
    rates: number;
  };
}

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/courier', { params: { search } });
      setCouriers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Couriers</h1>
        <Link
          href="/admin/couriers/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Courier
        </Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search couriers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          className="w-full max-w-md px-4 py-2 border rounded-lg"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : couriers.length === 0 ? (
        <p className="text-gray-500">No couriers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Orders</th>
                <th className="text-left p-3">Rates</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {couriers.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {c.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{c.phone || '-'}</td>
                  <td className="p-3">{c._count.orders}</td>
                  <td className="p-3">{c._count.rates}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        c.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/admin/couriers/${c.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}