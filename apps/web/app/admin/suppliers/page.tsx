'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { purchases: number };
}

// ============================================
// Page
// ============================================
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());

      const res = await api.get<Supplier[]>(
        `/api/suppliers?${qs.toString()}`,
        { token }
      );
      setSuppliers(res.data || []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load suppliers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleCreate() {
    setEditing(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNote('');
    setFormActive(true);
    setFormError('');
    setShowModal(true);
  }

  function handleEdit(s: Supplier) {
    setEditing(s);
    setFormName(s.name);
    setFormPhone(s.phone);
    setFormEmail(s.email || '');
    setFormAddress(s.address || '');
    setFormNote(s.note || '');
    setFormActive(s.active);
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('Name and phone are required');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const token = getToken() || undefined;
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        note: formNote.trim() || undefined,
        active: formActive,
      };

      if (editing) {
        await api.patch(`/api/suppliers/${editing.id}`, payload, { token });
        showToast('✓ Supplier updated');
      } else {
        await api.post(`/api/suppliers`, payload, { token });
        showToast('✓ Supplier created');
      }

      setShowModal(false);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(s: Supplier) {
    const count = s._count?.purchases || 0;
    if (count > 0) {
      alert(
        `Cannot delete "${s.name}" — ${count} purchase orders exist. Mark inactive instead.`
      );
      return;
    }
    if (!confirm(`Delete supplier "${s.name}"?`)) return;

    try {
      const token = getToken() || undefined;
      await api.delete(`/api/suppliers/${s.id}`, { token });
      showToast('✓ Supplier deleted');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleToggleActive(s: Supplier) {
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/suppliers/${s.id}`,
        { active: !s.active },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Suppliers
          </h1>
          <p className="text-[#8A8F98] text-sm">
            {suppliers.length} suppliers · who you buy stock from
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2"
        >
          <span>+</span> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name, phone or email"
            className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
            🔍
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[#8A8F98] text-sm">
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">🏭</div>
            <p className="text-[#5A6270] mb-4">No suppliers yet</p>
            <button
              onClick={handleCreate}
              className="text-[#0F2A5C] font-medium text-sm hover:underline"
            >
              + Add your first supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium">Contact</th>
                  <th className="text-left px-4 py-3 font-medium">Address</th>
                  <th className="text-center px-4 py-3 font-medium">
                    Purchase Orders
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0F2A5C] to-[#2E5A9C] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#0F2A5C]">
                            {s.name}
                          </div>
                          {s.note && (
                            <div className="text-xs text-[#8A8F98] truncate">
                              {s.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#5A6270]">{s.phone}</div>
                      {s.email && (
                        <div className="text-xs text-[#8A8F98]">
                          {s.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8A8F98] max-w-xs truncate">
                      {s.address || '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#0F2A5C]">
                      {s._count?.purchases ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(s)}
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          s.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}
                      >
                        {s.active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(s)}
                        className="text-[#0F2A5C] hover:underline text-xs font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={(s._count?.purchases || 0) > 0}
                        className={`text-xs font-medium ${
                          (s._count?.purchases || 0) > 0
                            ? 'text-[#8A8F98] cursor-not-allowed'
                            : 'text-[#C81E1E] hover:underline'
                        }`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-4">
              {editing ? 'Edit supplier' : 'Add supplier'}
            </h3>

            {formError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                placeholder="e.g., Dhaka Fashion Wholesale"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Phone *
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Email
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="supplier@example.com"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Address
              </label>
              <textarea
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                rows={2}
                placeholder="Shop address"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Note (internal)
              </label>
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={2}
                placeholder="Any info about this supplier"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="flex items-center gap-2 text-sm cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                Active
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 bg-white border border-[#E8EBF0] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formName.trim() || !formPhone.trim()}
                  className="flex-1 bg-[#0F2A5C] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0A1F45] transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-emerald-600">
          {toast}
        </div>
      )}
    </div>
  );
}