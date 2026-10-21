'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  position: number;
  featured: boolean;
  active: boolean;
  bannerTitle?: string | null;
  bannerSubtitle?: string | null;
  bannerImage?: string | null;
  bannerColor?: string | null;
}

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    position: 0,
    featured: false,
    active: true,
    bannerTitle: '',
    bannerSubtitle: '',
    bannerImage: '',
    bannerColor: '#D2B48C',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const token = getToken() || undefined;
        const res = await api.get<Category>(`/api/categories/${id}`, { token });
        const c = res.data;
        if (c) {
          setForm({
            name: c.name || '',
            slug: c.slug || '',
            description: c.description || '',
            image: c.image || '',
            position: c.position || 0,
            featured: c.featured || false,
            active: c.active ?? true,
            bannerTitle: c.bannerTitle || '',
            bannerSubtitle: c.bannerSubtitle || '',
            bannerImage: c.bannerImage || '',
            bannerColor: c.bannerColor || '#D2B48C',
          });
        }
      } catch (err) {
        setError('Failed to load category');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleUpload(file: File, field: 'bannerImage' | 'image') {
    const setUploading = field === 'bannerImage' ? setUploadingBanner : setUploadingMain;
    setUploading(true);
    setError('');

    try {
      const token = getToken() || undefined;
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post<{ url: string }>('/api/upload', formData, { token });
      
      if (res.data?.url) {
        update(field, res.data.url);
      } else {
        setError('Upload failed: No URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = getToken() || undefined;
      await api.patch(`/api/categories/${id}`, form, { token });
      router.push('/admin/categories');
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
      setSaving(false);
    }
  }

  const inputClass =
    'w-full bg-[#F1F3F6] border border-transparent rounded-lg px-4 py-2.5 text-sm text-[#0F2A5C] placeholder:text-[#8A8F98] focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition';

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/categories" className="text-sm text-gray-500 hover:text-[#0F2A5C] mb-2 inline-block">
            ← Back to Categories
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-[#0F2A5C]">Edit Category</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-[#E8EBF0] p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Name *</label>
              <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Slug *</label>
              <input type="text" required value={form.slug} onChange={(e) => update('slug', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)} className={inputClass + ' resize-none'} placeholder="Short description" />
          </div>

          {/* Main Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Category Image (Circle)</label>
            <div className="flex gap-2">
              <input type="text" value={form.image} onChange={(e) => update('image', e.target.value)} className={inputClass} placeholder="/categories/men.jpg or https://..." />
              <label className={`cursor-pointer px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition whitespace-nowrap ${uploadingMain ? 'bg-gray-400' : 'bg-[#0F2A5C] hover:bg-[#0A1F45]'}`}>
                {uploadingMain ? 'Uploading...' : '📤 Upload'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingMain} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'image'); }} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Position</label>
              <input type="number" value={form.position} onChange={(e) => update('position', Number(e.target.value))} className={inputClass} />
            </div>
            <label className="flex items-center gap-2 mt-6 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} className="w-4 h-4 accent-[#0F2A5C]" />
              <span className="text-sm text-[#0F2A5C] font-medium">Featured</span>
            </label>
            <label className="flex items-center gap-2 mt-6 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} className="w-4 h-4 accent-[#0F2A5C]" />
              <span className="text-sm text-[#0F2A5C] font-medium">Active</span>
            </label>
          </div>

          {/* Banner Section */}
          <div className="border-t border-[#E8EBF0] pt-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#0F2A5C]" />
              <h2 className="text-sm font-bold text-[#0F2A5C] uppercase tracking-wide">Homepage Banner</h2>
              <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Banner Title</label>
                  <input type="text" value={form.bannerTitle} onChange={(e) => update('bannerTitle', e.target.value)} className={inputClass} placeholder="e.g. Women's collection" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Banner Subtitle</label>
                  <input type="text" value={form.bannerSubtitle} onChange={(e) => update('bannerSubtitle', e.target.value)} className={inputClass} placeholder="e.g. Festive kurti" />
                </div>
              </div>

              {/* Banner Image Upload (with preview) */}
              <div>
                <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Banner Image URL</label>
                <div className="flex gap-2">
                  <input type="text" value={form.bannerImage} onChange={(e) => update('bannerImage', e.target.value)} className={inputClass} placeholder="https://..." />
                  <label className={`cursor-pointer px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition whitespace-nowrap ${uploadingBanner ? 'bg-gray-400' : 'bg-[#0F2A5C] hover:bg-[#0A1F45]'}`}>
                    {uploadingBanner ? 'Uploading...' : '📤 Upload'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'bannerImage'); }} />
                  </label>
                </div>
                {form.bannerImage && (
                  <div className="mt-2">
                    <img src={form.bannerImage} alt="Banner preview" className="w-32 h-20 object-cover rounded-lg border border-[#E8EBF0]" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8A8F98] mb-1.5">Banner Background Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.bannerColor} onChange={(e) => update('bannerColor', e.target.value)} className="w-12 h-10 rounded border border-[#E8EBF0] cursor-pointer" />
                  <input type="text" value={form.bannerColor} onChange={(e) => update('bannerColor', e.target.value)} className={inputClass} placeholder="#D2B48C" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E8EBF0]">
            <Link href="/admin/categories" className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#8A8F98] bg-white border border-[#E8EBF0] hover:bg-gray-50">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F2A5C] hover:bg-[#0A1F45] disabled:opacity-50">
              {saving ? 'Saving...' : 'Update Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
