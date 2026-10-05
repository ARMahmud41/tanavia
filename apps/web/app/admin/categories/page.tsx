'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ============================================
// Types
// ============================================
interface Category {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  description?: string | null;
  image?: string | null;
  position: number;
  featured: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

// ============================================
// Page
// ============================================
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formNameBn, setFormNameBn] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPosition, setFormPosition] = useState(0);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<Category[]>(`/api/categories`, { token });
      setCategories(res.data || []);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load categories';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // Open create modal
  function handleCreate() {
    setEditing(null);
    setFormName('');
    setFormNameBn('');
    setFormDescription('');
    setFormPosition(categories.length);
    setFormFeatured(false);
    setFormActive(true);
    setFormError('');
    setShowModal(true);
  }

  // Open edit modal
  function handleEdit(c: Category) {
    setEditing(c);
    setFormName(c.name);
    setFormNameBn(c.nameBn || '');
    setFormDescription(c.description || '');
    setFormPosition(c.position);
    setFormFeatured(c.featured);
    setFormActive(c.active);
    setFormError('');
    setShowModal(true);
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const token = getToken() || undefined;
      const payload = {
        name: formName.trim(),
        nameBn: formNameBn.trim() || undefined,
        description: formDescription.trim() || undefined,
        position: formPosition,
        featured: formFeatured,
        active: formActive,
      };

      if (editing) {
        await api.patch(`/api/categories/${editing.id}`, payload, { token });
        showToast('✓ Category updated');
      } else {
        await api.post(`/api/categories`, payload, { token });
        showToast('✓ Category created');
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

  // Delete
  async function handleDelete(c: Category) {
    const count = c._count?.products || 0;
    if (count > 0) {
      alert(
        `Cannot delete "${c.name}" — ${count} product(s) still use it. Reassign them first.`
      );
      return;
    }
    if (!confirm(`Delete category "${c.name}"?`)) return;

    try {
      const token = getToken() || undefined;
      await api.delete(`/api/categories/${c.id}`, { token });
      showToast('✓ Category deleted');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // Toggle active
  async function handleToggleActive(c: Category) {
    try {
      const token = getToken() || undefined;
      await api.patch(
        `/api/categories/${c.id}`,
        { active: !c.active },
        { token }
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Categories
          </h1>
          <p className="text-[#8A8F98] text-sm">
            {categories.length} categories total
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2"
        >
          <span>+</span> Add Category
        </button>
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
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-[#5A6270] mb-4">No categories yet</p>
            <button
              onClick={handleCreate}
              className="text-[#0F2A5C] font-medium text-sm hover:underline"
            >
              + Add your first category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Slug</th>
                  <th className="text-center px-4 py-3 font-medium">Products</th>
                  <th className="text-center px-4 py-3 font-medium">Featured</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.image ? (
                          <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.image}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-[#F1F3F6] flex items-center justify-center text-sm flex-shrink-0">
                            📁
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-[#0F2A5C]">
                            {c.name}
                          </div>
                          {c.nameBn && (
                            <div className="text-xs text-[#8A8F98]">
                              {c.nameBn}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#5A6270]">
                      {c.slug}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#0F2A5C]">
                      {c._count?.products ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.featured ? (
                        <span className="text-amber-600 font-semibold">⭐</span>
                      ) : (
                        <span className="text-[#8A8F98]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          c.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-300'
                        }`}
                      >
                        {c.active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-[#0F2A5C] hover:underline text-xs font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={(c._count?.products || 0) > 0}
                        className={`text-xs font-medium ${
                          (c._count?.products || 0) > 0
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
              {editing ? 'Edit category' : 'Add category'}
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
                placeholder="e.g., Men, Women, Kids"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Name (Bangla) — optional
              </label>
              <input
                type="text"
                value={formNameBn}
                onChange={(e) => setFormNameBn(e.target.value)}
                placeholder="বাংলা নাম"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Description — optional
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Short description"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Position (lower = first)
              </label>
              <input
                type="number"
                value={formPosition}
                onChange={(e) => setFormPosition(Number(e.target.value))}
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
              />

              <div className="flex items-center gap-4 mb-5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                  />
                  Active
                </label>
              </div>

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
                  disabled={submitting || !formName.trim()}
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