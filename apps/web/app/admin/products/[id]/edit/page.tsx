'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';
import { uploadImages } from '@/lib/upload';
import { SpecialOfferPicker } from '@/components/SpecialOfferPicker';

// ============================================
// Types
// ============================================
interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
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
  freeDelivery?: boolean;
  shape: string;
  tags: string[];
  lowStockAt: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  variants?: Variant[];
  productImages?: Array<{
    id: string;
    url: string;
    alt?: string | null;
    color?: string | null;
    position: number;
    isPrimary: boolean;
  }>;
}

interface ImageItem {
  url: string;
  alt: string;
  color: string | null;
  isPrimary: boolean;
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

const OFFER_SLUGS = [
  'mega-deal',
  'new-arrival',
  'top-selling',
  'free-delivery',
  'merchandise',
  'puja-sale',
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
  const [variantColors, setVariantColors] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');
  const [showAddColor, setShowAddColor] = useState(false);

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
    freeDelivery: false,
    lowStockAt: 5,
    tags: [] as string[],
    metaTitle: '',
    metaDescription: '',
    images: [] as ImageItem[],
  });

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
          const colors = Array.from(
            new Set((p.variants || []).map((v) => v.color).filter(Boolean))
          );
          setVariantColors(colors);

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
            freeDelivery: p.freeDelivery ?? false,
            lowStockAt: p.lowStockAt || 5,
            tags: p.tags || [],
            metaTitle: p.metaTitle || '',
            metaDescription: p.metaDescription || '',
            images:
              p.productImages?.map((img) => ({
                url: img.url,
                alt: img.alt || '',
                color: img.color || null,
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

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
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

  // Custom color handlers
  function handleAddCustomColor() {
    const c = customColorInput.trim();
    if (!c) return;
    if (variantColors.includes(c)) {
      setCustomColorInput('');
      setShowAddColor(false);
      return;
    }
    setVariantColors([...variantColors, c]);
    setCustomColorInput('');
    setShowAddColor(false);
  }

  function handleRemoveVariantColor(color: string) {
    if (!confirm(`Remove "${color}" from color list?`)) return;
    setVariantColors(variantColors.filter((c) => c !== color));
  }

  // ============================================
  // Image management
  // ============================================
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [pendingColor, setPendingColor] = useState<string>('');

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadImages(Array.from(files));
      const urls = result.map((r) => r.url);
      const newImages: ImageItem[] = urls.map((url, i) => ({
        url,
        alt: '',
        color: pendingColor || null,
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
    const newImages: ImageItem[] = [
      ...form.images,
      {
        url,
        alt: '',
        color: pendingColor || null,
        isPrimary: form.images.length === 0,
      },
    ];
    setField('images', newImages);
    setImageUrlInput('');
  }

  function handleRemoveImage(idx: number) {
    const newImages = form.images.filter((_, i) => i !== idx);
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

  function handleImageColor(idx: number, color: string) {
    const newImages = form.images.map((img, i) =>
      i === idx ? { ...img, color: color || null } : img
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
        freeDelivery: form.freeDelivery,
        lowStockAt: Number(form.lowStockAt) || 5,
        tags: form.tags,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        productImages: form.images.map((img, i) => ({
          url: img.url,
          alt: img.alt || null,
          color: img.color || null,
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

  const finalPrice =
    form.price && form.discount >= 0
      ? Math.round(Number(form.price) * (1 - form.discount / 100))
      : 0;
  const margin =
    form.price && form.cost
      ? Math.round(Number(form.price) - Number(form.cost))
      : 0;

  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">
          Loading product...
        </div>
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
                Shape / Type
                <span className="text-[#8A8F98] font-normal text-[10px] ml-1 normal-case">
                  (pick or type new)
                </span>
              </label>
              <input
                type="text"
                list="shape-options-edit"
                value={form.shape}
                onChange={(e) => setField('shape', e.target.value)}
                placeholder="e.g. shirt, panjabi, hoodie"
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
              />
              <datalist id="shape-options-edit">
                {SHAPES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
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
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.freeDelivery}
                  onChange={(e) => setField('freeDelivery', e.target.checked)}
                />
                🚚 Free Delivery
              </label>
            </div>
          </section>

          {/* ============================================ */}
          {/* VARIANT COLORS — with custom add */}
          {/* ============================================ */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-1">
              Variant Colors
            </h2>
            <p className="text-xs text-[#8A8F98] mb-4">
              Colors available for this product. Used for color-specific image
              assignment below.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {variantColors.length === 0 && (
                <span className="text-xs text-[#8A8F98] py-2">
                  No colors yet — add one below
                </span>
              )}
              {variantColors.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F1F3F6] text-[#0F2A5C] border border-[#E8EBF0]"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => handleRemoveVariantColor(c)}
                    className="text-[#8A8F98] hover:text-red-600 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {showAddColor ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={customColorInput}
                  onChange={(e) => setCustomColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomColor();
                    }
                    if (e.key === 'Escape') {
                      setShowAddColor(false);
                      setCustomColorInput('');
                    }
                  }}
                  placeholder="e.g. Maroon, Sky Blue, Olive"
                  autoFocus
                  className="flex-1 bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  disabled={!customColorInput.trim()}
                  className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  ✓ Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddColor(false);
                    setCustomColorInput('');
                  }}
                  className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#5A6270] px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddColor(true)}
                className="inline-flex items-center gap-2 bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2.5 rounded-lg text-sm font-medium transition"
              >
                <span className="text-lg leading-none">+</span>
                Add Custom Color
              </button>
            )}
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

            <div className="mt-4">
              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1 font-medium">
                Special Offers
              </label>
              <SpecialOfferPicker
                value={form.tags.filter((t) => OFFER_SLUGS.includes(t))}
                onChange={(newOfferTags) => {
                  const OTHER_TAGS = form.tags.filter(
                    (t) => !OFFER_SLUGS.includes(t)
                  );
                  setField('tags', [...OTHER_TAGS, ...newOfferTags]);
                }}
              />
            </div>
          </section>

          {/* ============================================ */}
          {/* IMAGES — with color assignment */}
          {/* ============================================ */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-1">
              Product Images
            </h2>
            <p className="text-xs text-[#8A8F98] mb-4">
              Assign each image to a color. Customer will see matching images
              when they pick that color. Leave as <strong>All Colors</strong> for
              fallback.
            </p>

            {variantColors.length === 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
                ⚠️ Add variant colors above to assign color-specific images.
              </div>
            )}

            {/* Existing images with color dropdown */}
            {form.images.length > 0 && (
              <div className="space-y-3 mb-5">
                {form.images.map((img, i) => (
                  <div
                    key={i}
                    className={`flex flex-col sm:flex-row gap-3 p-3 rounded-lg border-2 ${
                      img.isPrimary ? 'border-[#0F2A5C]' : 'border-[#E8EBF0]'
                    }`}
                  >
                    {/* Preview */}
                    <div className="relative w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-[#F1F3F6] flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.alt || ''}
                        className="w-full h-full object-cover"
                      />
                      {img.isPrimary && (
                        <div className="absolute top-1 left-1 bg-[#0F2A5C] text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                          PRIMARY
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-[#8A8F98] mb-1 font-semibold">
                          Color
                        </label>
                        <select
                          value={img.color || ''}
                          onChange={(e) => handleImageColor(i, e.target.value)}
                          className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                        >
                          <option value="">🎨 All Colors (Fallback)</option>
                          {variantColors.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-[#8A8F98] mb-1 font-semibold">
                          Alt text
                        </label>
                        <input
                          type="text"
                          value={img.alt}
                          onChange={(e) => handleImageAlt(i, e.target.value)}
                          placeholder="e.g. Red shirt front view"
                          className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                        />
                      </div>

                      <div className="sm:col-span-2 flex gap-2">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(i)}
                            className="flex-1 bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] text-xs px-3 py-1.5 rounded font-semibold transition"
                          >
                            ★ Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded font-semibold transition"
                        >
                          🗑 Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Color selector for NEW uploads */}
            <div className="mb-3 p-3 bg-[#F7F8FA] rounded-lg">
              <label className="block text-xs uppercase tracking-wide text-[#8A8F98] mb-1.5 font-semibold">
                Add new images as:
              </label>
              <select
                value={pendingColor}
                onChange={(e) => setPendingColor(e.target.value)}
                className="w-full bg-white border border-[#E8EBF0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2A5C]"
              >
                <option value="">🎨 All Colors (Fallback)</option>
                {variantColors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

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
                  <span className="text-[#0F2A5C] font-medium">
                    ⏳ Uploading...
                  </span>
                ) : (
                  <>
                    <div className="text-2xl mb-1">📷</div>
                    <div className="font-medium text-[#0F2A5C]">
                      Click to upload images
                    </div>
                    <div className="text-xs text-[#8A8F98] mt-1">
                      They&apos;ll be assigned to{' '}
                      <strong>
                        {pendingColor || 'All Colors (Fallback)'}
                      </strong>
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