'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import { uploadImages } from '@/lib/upload';

// ============================================
// Types
// ============================================
interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  nameBn?: string | null;
  description: string;
  descriptionBn?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  brand: string;
  sku: string;
  barcode: string;
  cost: string | number;
  price: string | number;
  discount: number;
  status: string;
  active: boolean;
  featured: boolean;
  tryable: boolean;
  shape: string;
  tags: string[];
  lowStockAt: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  productImages?: Array<{
    id: string;
    url: string;
    alt?: string | null;
    position: number;
    isPrimary: boolean;
  }>;
}

// ============================================
// Constants
// ============================================
const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SHAPES = [
  'tee',
  'shirt',
  'pant',
  'dress',
  'jacket',
  'bag',
  'shoe',
  'accessory',
  'other',
];

// ============================================
// Page
// ============================================
export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    nameBn: '',
    description: '',
    descriptionBn: '',
    categoryId: '',
    brand: 'TANAVIA',
    shape: 'tee',
    cost: '',
    price: '',
    discount: 0,
    sku: '',
    barcode: '',
    status: 'DRAFT',
    active: true,
    featured: false,
    tryable: true,
    lowStockAt: 5,
    tags: [] as string[],
    metaTitle: '',
    metaDescription: '',
    images: [] as Array<{ url: string; alt: string; isPrimary: boolean }>,
  });

  // Load product + categories
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getToken() || undefined;
        const [prodRes, catRes] = await Promise.all([
          api.get<Product>(`/api/products/${productId}`, { token }),
          api
            .get<Category[]>(`/api/categories`, { token })
            .catch(() => ({ data: [] })),
        ]);

        const p = prodRes.data;
        if (p) {
          setForm({
            name: p.name,
            nameBn: p.nameBn || '',
            description: p.description || '',
            descriptionBn: p.descriptionBn || '',
            categoryId: p.categoryId || '',
            brand: p.brand || 'TANAVIA',
            shape: p.shape || 'tee',
            cost: String(p.cost || ''),
            price: String(p.price || ''),
            discount: Number(p.discount) || 0,
            sku: p.sku || '',
            barcode: p.barcode || '',
            status: p.status || 'DRAFT',
            active: p.active,
            featured: p.featured,
            tryable: p.tryable,
            lowStockAt: p.lowStockAt || 5,
            tags: p.tags || [],
            metaTitle: p.metaTitle || '',
            metaDescription: p.metaDescription || '',
            images:
              p.productImages?.map((img) => ({
                url: img.url,
                alt: img.alt || '',
                isPrimary: img.isPrimary,
              })) || [],
          });
        }
        setCategories(catRes.data || []);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to load product';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    if (productId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // ============================================
  // Handlers
  // ============================================
  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleAddTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (form.tags.includes(t)) {
      setTagInput('');
      return;
    }
    setField('tags', [...form.tags, t]);
    setTagInput('');
  }

  function handleRemoveTag(t: string) {
    setField(
      'tags',
      form.tags.filter((x) => x !== t)
    );
  }

  // Image management
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadImages(Array.from(files));
      const urls = result.map((r) => r.url);
      const newImages = urls.map((url, i) => ({
        url,
        alt: '',
        isPrimary: form.images.length === 0 && i === 0,
      }));
      setField('images', [...form.images, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleAddImageUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    const newImages = [
      ...form.images,
      {
        url,
        alt: '',
        isPrimary: form.images.length === 0,
      },
    ];
    setField('images', newImages);
    setImageUrlInput('');
  }

  function handleRemoveImage(idx: number) {
    const newImages = form.images.filter((_, i) => i !== idx);
    // If we removed the primary, set first as primary
    if (newImages.length > 0 && !newImages.some((i) => i.isPrimary)) {
      newImages[0].isPrimary = true;
    }
    setField('images', newImages);
  }

  function handleSetPrimary(idx: number) {
    const newImages = form.images.map((img, i) => ({
      ...img,
      isPrimary: i === idx,
    }));
    setField('images', newImages);
  }

  function handleImageAlt(idx: number, alt: string) {
    const newImages = form.images.map((img, i) =>
      i === idx ? { ...img, alt } : img
    );
    setField('images', newImages);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.price) {
      setError('Price is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = getToken() || undefined;

      const payload: any = {
        name: form.name.trim(),
        nameBn: form.nameBn.trim() || null,
        description: form.description.trim() || 'No description',
        descriptionBn: form.descriptionBn.trim() || null,
        categoryId: form.categoryId || null,
        brand: form.brand.trim() || 'TANAVIA',
        shape: form.shape,
        cost: Number(form.cost) || 0,
        price: Number(form.price),
        discount: Number(form.discount) || 0,
        status: form.status,
        active: form.active,
        featured: form.featured,
        tryable: form.tryable,
        lowStockAt: Number(form.lowStockAt) || 5,
        tags: form.tags,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        productImages: form.images.map((img, i) => ({
          url: img.url,
          alt: img.alt || null,
          position: i,
          isPrimary: img.isPrimary,
        })),
      };

      await api.patch(`/api/products/${productId}`, payload, { token });

      router.push(`/admin/products/${productId}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to save';
      setError(msg);
      setSaving(false);
    }
  }

  // ============================================
  // Derived
  // ============================================
  const finalPrice =
    form.price && form.discount >= 0
      ? Math.round(Number(form.price) * (1 - form.discount / 100))
      : 0;
  const margin =
    form.price && form.cost
      ? Math.round(Number(form.price) - Number(form.cost))
      : 0;

  // ============================================
  // Loading
  // ============================================
  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">Loading product...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <Link
        href={`/admin/products/${productId}`}
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to product
      </Link>

      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-6">
          Edit Product
        </h1>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Basic Info
            </h2>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Name (Bangla)
            </label>
            <input
              type="text"
              value={form.nameBn}
              onChange={(e) => setField('nameBn', e.target.value)}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setField('categoryId', e.target.value)}
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Brand
                </label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setField('brand', e.target.value)}
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Shape
              </label>
              <select
                value={form.shape}
                onChange={(e) => setField('shape', e.target.value)}
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
              >
                {SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Pricing */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Pricing
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Cost (৳)
                </label>
                <input
                  type="number"
                  value={form.cost}
                  onChange={(e) => setField('cost', e.target.value)}
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Price (৳) *
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Discount %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount}
                  onChange={(e) => setField('discount', Number(e.target.value))}
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                />
              </div>
            </div>

            {/* Computed */}
            <div className="bg-[#F1F4F9] rounded-lg p-3 flex justify-between text-sm">
              <div>
                <div className="text-[10px] uppercase text-[#8A8F98]">
                  Selling price
                </div>
                <div className="font-bold text-[#0F2A5C]">{tk(finalPrice)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-[#8A8F98]">Margin</div>
                <div className="font-bold text-emerald-700">{tk(margin)}</div>
              </div>
            </div>
          </section>

          {/* Identifiers */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Identifiers
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  SKU
                </label>
                <input
                  type="text"
                  value={form.sku}
                  disabled
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm font-mono text-[#8A8F98] cursor-not-allowed"
                />
                <div className="text-[10px] text-[#8A8F98] mt-1">
                  SKU cannot be changed
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Barcode
                </label>
                <input
                  type="text"
                  value={form.barcode}
                  disabled
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm font-mono text-[#8A8F98] cursor-not-allowed"
                />
                <div className="text-[10px] text-[#8A8F98] mt-1">
                  Barcode cannot be changed
                </div>
              </div>
            </div>
          </section>

          {/* Attributes */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Attributes
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    setField('status', e.target.value);
                    setField('active', e.target.value === 'ACTIVE');
                  }}
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                  Low stock at (qty)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.lowStockAt}
                  onChange={(e) =>
                    setField('lowStockAt', Number(e.target.value))
                  }
                  className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setField('active', e.target.checked)}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField('featured', e.target.checked)}
                />
                ⭐ Featured
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tryable}
                  onChange={(e) => setField('tryable', e.target.checked)}
                />
                Tryable
              </label>
            </div>
          </section>

          {/* Tags */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Tags
            </h2>

            <div className="flex flex-wrap gap-2 mb-3">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F1F3F6] text-[#5A6270]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-[#8A8F98] hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
              {form.tags.length === 0 && (
                <span className="text-xs text-[#8A8F98]">No tags yet</span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag (press Enter)"
                className="flex-1 bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Add
              </button>
            </div>
          </section>

          {/* Images */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Product Images
            </h2>

            {/* Existing images */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {form.images.map((img, i) => (
                  <div
                    key={i}
                    className={`relative rounded-lg overflow-hidden border-2 ${
                      img.isPrimary ? 'border-[#0F2A5C]' : 'border-[#E8EBF0]'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt || ''}
                      className="w-full aspect-square object-cover"
                    />

                    {img.isPrimary && (
                      <div className="absolute top-1 left-1 bg-[#0F2A5C] text-white text-[9px] px-1.5 py-0.5 rounded">
                        PRIMARY
                      </div>
                    )}

                    <div className="absolute top-1 right-1 flex gap-1">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(i)}
                          className="bg-white/90 hover:bg-white text-[#0F2A5C] text-[10px] px-1.5 py-0.5 rounded"
                          title="Set as primary"
                        >
                          ★
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="bg-white/90 hover:bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload */}
            <label
              className={`block border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer mb-3 ${
                uploading
                  ? 'border-[#0F2A5C] bg-[#F7F8FA] cursor-wait'
                  : 'border-[#E8EBF0] hover:border-[#0F2A5C] hover:bg-[#F7F8FA]'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload(e.target.files)}
                disabled={uploading}
                className="hidden"
              />
              <div className="text-sm text-[#5A6270]">
                {uploading ? (
                  <span className="text-[#0F2A5C] font-medium">⏳ Uploading...</span>
                ) : (
                  <>
                    <div className="text-2xl mb-1">📷</div>
                    <div className="font-medium text-[#0F2A5C]">
                      Click to upload or drag images here
                    </div>
                    <div className="text-xs text-[#8A8F98] mt-1">
                      PNG, JPG up to 5MB
                    </div>
                  </>
                )}
              </div>
            </label>

            {/* Or paste URL */}
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste image URL..."
                className="flex-1 bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!imageUrlInput.trim()}
                className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              SEO
            </h2>

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Meta title
            </label>
            <input
              type="text"
              value={form.metaTitle}
              onChange={(e) => setField('metaTitle', e.target.value)}
              placeholder="Browser tab title"
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />

            <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
              Meta description
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) => setField('metaDescription', e.target.value)}
              rows={2}
              placeholder="Google search snippet"
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
            />
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Link
              href={`/admin/products/${productId}`}
              className="flex-1 text-center bg-white border border-[#E8EBF0] text-[#0F2A5C] px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-6 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}