'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { uploadImages } from '@/lib/upload';

interface Variant {
  size: string;
  color: string;
  qty: number | '';
}

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories'];
const SHAPES = ['shirt', 'pant', 'panjabi', 'saree', 'kurti', 'dress', 'shoe', 'bag', 'other'];

// ============================================
// Size presets by shape
// ============================================
const SIZE_PRESETS: Record<string, string[]> = {
  shirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  pant: ['28', '30', '32', '34', '36', '38', '40'],
  shoe: ['38', '39', '40', '41', '42', '43', '44'],
  bag: ['Small', 'Medium', 'Large'],
  saree: ['Free Size'],
  panjabi: ['S', 'M', 'L', 'XL', 'XXL'],
  kurti: ['S', 'M', 'L', 'XL', 'XXL'],
  dress: ['S', 'M', 'L', 'XL'],
  other: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'],
};

// ============================================
// Color presets
// ============================================
const DEFAULT_COLORS = [
  'Black',
  'White',
  'Navy',
  'Red',
  'Blue',
  'Green',
  'Grey',
  'Beige',
  'Maroon',
  'Yellow',
];

const COLOR_MAP: Record<string, string> = {
  Black: '#000000',
  White: '#FFFFFF',
  Navy: '#1E2A4A',
  Red: '#DC2626',
  Blue: '#2563EB',
  Green: '#16A34A',
  Grey: '#6B7280',
  Beige: '#D4C5A9',
  Maroon: '#7B1C32',
  Yellow: '#EAB308',
};

export default function AddProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Basic info
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [category, setCategory] = useState('Men');
  const [brand, setBrand] = useState('TANAVIA');
  const [shape, setShape] = useState('shirt');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');

  // Pricing
  const [buyingPrice, setBuyingPrice] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');

  // Flags
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [tryable, setTryable] = useState(false);

  // Variant selection
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>(['Black', 'White']);
  const [stock, setStock] = useState<Record<string, number | ''>>({});

  // Custom color add
  const [customColorInput, setCustomColorInput] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#000000');
  const [showAddColor, setShowAddColor] = useState(false);

  // Custom size add
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [showAddSize, setShowAddSize] = useState(false);

  // ── Profit calculations ──
  const priceNum = Number(price) || 0;
  const buyingNum = Number(buyingPrice) || 0;
  const discountNum = Number(discount) || 0;
  const customerPays = Math.round(priceNum * (1 - discountNum / 100));
  const profitPerUnit = customerPays - buyingNum;
  const marginPct = customerPays > 0 ? Math.round((profitPerUnit / customerPays) * 100) : 0;

  // Auto-reset sizes when shape changes
  useEffect(() => {
    const preset = SIZE_PRESETS[shape] || SIZE_PRESETS.other;
    const mid = Math.floor(preset.length / 2);
    const defaults = preset.slice(Math.max(0, mid - 1), mid + 2);
    setSelectedSizes(defaults);
    setStock({});
  }, [shape]);

  function toggleSize(s: string) {
    setSelectedSizes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function toggleColor(c: string) {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function handleAddCustomSize() {
    const input = customSizeInput.trim();
    if (!input) return;

    const newSizes = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (newSizes.length === 0) return;

    setSelectedSizes((prev) => {
      const merged = [...prev];
      for (const sz of newSizes) {
        if (!merged.includes(sz)) merged.push(sz);
      }
      return merged;
    });

    setCustomSizeInput('');
    setShowAddSize(false);
  }

  function handleAddCustomColor() {
    const colorName = customColorInput.trim();
    if (!colorName) return;

    // Persist color in local COLOR_MAP
    COLOR_MAP[colorName] = customColorHex;

    if (!selectedColors.includes(colorName)) {
      setSelectedColors((prev) => [...prev, colorName]);
    }

    setCustomColorInput('');
    setCustomColorHex('#000000');
    setShowAddColor(false);
  }

  function getStockKey(size: string, color: string) {
    return `${size}__${color}`;
  }

  function getStockValue(size: string, color: string): number | '' {
    const v = stock[getStockKey(size, color)];
    return v === undefined ? '' : v;
  }

  function setStockValue(size: string, color: string, value: number | '') {
    setStock((prev) => ({
      ...prev,
      [getStockKey(size, color)]: value,
    }));
  }

  const finalVariants = useMemo(() => {
    const result: Variant[] = [];
    for (const size of selectedSizes) {
      for (const color of selectedColors) {
        const key = getStockKey(size, color);
        const qty = stock[key];
        if (qty !== undefined && qty !== '' && Number(qty) > 0) {
          result.push({ size, color, qty: Number(qty) });
        }
      }
    }
    return result;
  }, [selectedSizes, selectedColors, stock]);

  function addImage() {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((prev) => [...prev, url]);
    setImageUrl('');
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const result = await uploadImages(Array.from(files));
      const urls = result.map((r) => r.url);
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (name.trim().length < 3) {
      setError('Product name must be at least 3 characters');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Selling price must be greater than 0');
      return;
    }
    if (!buyingPrice || Number(buyingPrice) < 0) {
      setError('Buying price is required');
      return;
    }
    if (selectedSizes.length === 0) {
      setError('Select at least one size');
      return;
    }
    if (selectedColors.length === 0) {
      setError('Select at least one color');
      return;
    }
    if (finalVariants.length === 0) {
      setError('Add stock quantity for at least one size/color combination');
      return;
    }

    setSaving(true);

    try {
      const token = getToken() || undefined;

      const payload = {
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        category,
        brand: brand.trim() || undefined,
        shape,
        description: description.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images,
        price: Number(price),
        cost: Number(buyingPrice),
        buyingPrice: Number(buyingPrice),
        discount: Number(discount) || 0,
        active,
        featured,
        tryable,
        variants: finalVariants,
      };

      const res = await api.post<{ id: string; sku: string; barcode: string }>(
        '/api/products',
        payload,
        { token }
      );

      if (res.data) {
        setSuccess(`Product created! SKU: ${res.data.sku}`);
        setTimeout(() => router.push('/admin/products'), 1200);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          const firstField = Object.keys(err.details)[0];
          setError(`${firstField}: ${err.details[firstField].join(', ')}`);
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save product');
      }
      setSaving(false);
    }
  }

  // Compute all visible sizes (preset + custom selected)
  const visibleSizes = useMemo(() => {
    const preset = SIZE_PRESETS[shape] || SIZE_PRESETS.other;
    const custom = selectedSizes.filter((s) => !preset.includes(s));
    return [...preset, ...custom];
  }, [shape, selectedSizes]);

  // Compute all visible colors (default + custom selected)
  const visibleColors = useMemo(() => {
    const custom = selectedColors.filter((c) => !DEFAULT_COLORS.includes(c));
    return [...DEFAULT_COLORS, ...custom];
  }, [selectedColors]);

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/admin/products"
            className="text-sm text-[#8A8F98] hover:text-[#0F2A5C] inline-flex items-center gap-1 mb-2"
          >
            ← Back to Products
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C]">
            Add New Product
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-5">
            {/* Basic info */}
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Basic Information
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                      Product Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Premium Cotton Chino Pant"
                      className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                      Product Name (বাংলা)
                    </label>
                    <input
                      type="text"
                      value={nameBn}
                      onChange={(e) => setNameBn(e.target.value)}
                      placeholder="বাংলা নাম"
                      className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">Brand</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="TANAVIA"
                      className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">Shape / Type</label>
                    <select
                      value={shape}
                      onChange={(e) => setShape(e.target.value)}
                      className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition cursor-pointer"
                    >
                      {SHAPES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the product..."
                    className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                    Tags <span className="text-[#8A8F98] font-normal text-xs">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="chino, men, pant, cotton"
                    className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                  />
                </div>
              </div>
            </section>

            {/* Images */}
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Product Images
              </h2>

              <label
                className={`block border-2 border-dashed rounded-lg p-6 text-center transition mb-4 ${
                  uploading
                    ? 'border-[#0F2A5C] bg-[#F7F8FA] cursor-wait'
                    : 'border-[#CBD2DC] hover:border-[#0F2A5C] hover:bg-[#F7F8FA] cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <>
                    <div className="text-3xl mb-2 animate-pulse">⏳</div>
                    <div className="text-sm font-medium text-[#0F2A5C]">
                      Uploading...
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-2">📁</div>
                    <div className="text-sm font-medium text-[#0F2A5C]">
                      Click to upload images
                    </div>
                    <div className="text-xs text-[#8A8F98] mt-1">
                      PNG, JPG up to 5MB each — multiple files allowed
                    </div>
                  </>
                )}
              </label>

              <div className="flex gap-2 mb-4">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste image URL..."
                  className="flex-1 bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
                >
                  + Add URL
                </button>
              </div>

              {images.length === 0 ? (
                <div className="bg-[#F1F3F6] rounded-lg p-6 text-center text-[#8A8F98] text-sm">
                  No images yet. Upload files or paste a URL above.
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {images.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square bg-[#F1F3F6] rounded-lg overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-[#0F2A5C] text-white text-[10px] px-1.5 py-0.5 rounded">
                          MAIN
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Variants — MATRIX UI */}
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-1">
                Stock per size and colour
              </h2>
              <p className="text-xs text-[#8A8F98] mb-5">
                Select sizes and colors, then enter stock quantity for each combination.
              </p>

              {/* Sizes */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-[#8A8F98] uppercase tracking-wide">
                    Sizes
                    <span className="ml-2 text-[#0F2A5C] normal-case">
                      ({shape} preset)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSize((v) => !v)}
                    className="text-xs font-medium text-[#0F2A5C] hover:underline"
                  >
                    {showAddSize ? '✕ Cancel' : '+ Custom Size'}
                  </button>
                </div>

                {showAddSize && (
                  <div className="flex gap-2 mb-3 p-3 bg-[#F1F3F6] rounded-lg">
                    <input
                      type="text"
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSize();
                        }
                      }}
                      placeholder="e.g. 32, 34, 42 or XXL"
                      className="flex-1 bg-white border border-[#E3E6EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2A5C] transition"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSize}
                      className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {visibleSizes.map((s) => {
                    const preset = SIZE_PRESETS[shape] || SIZE_PRESETS.other;
                    const selected = selectedSizes.includes(s);
                    const isCustom = !preset.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition border ${
                          selected
                            ? 'bg-[#0F2A5C] text-white border-[#0F2A5C]'
                            : 'bg-white text-[#5A6270] border-[#E3E6EB] hover:border-[#0F2A5C]'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {s}
                        {isCustom && <span className="ml-1 opacity-70">★</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-[#8A8F98] uppercase tracking-wide">
                    Colors
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddColor((v) => !v)}
                    className="text-xs font-medium text-[#0F2A5C] hover:underline"
                  >
                    {showAddColor ? '✕ Cancel' : '+ Custom Color'}
                  </button>
                </div>

                {showAddColor && (
                  <div className="flex gap-2 mb-3 p-3 bg-[#F1F3F6] rounded-lg">
                    <input
                      type="text"
                      value={customColorInput}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomColor();
                        }
                      }}
                      placeholder="Color name (e.g. Olive Green)"
                      className="flex-1 bg-white border border-[#E3E6EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2A5C] transition"
                    />
                    <input
                      type="color"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-[#E3E6EB]"
                      title="Pick color"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomColor}
                      className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {visibleColors.map((c) => {
                    const selected = selectedColors.includes(c);
                    const isCustom = !DEFAULT_COLORS.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleColor(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition border flex items-center gap-1.5 ${
                          selected
                            ? 'bg-[#0F2A5C] text-white border-[#0F2A5C]'
                            : 'bg-white text-[#5A6270] border-[#E3E6EB] hover:border-[#0F2A5C]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/30"
                          style={{ backgroundColor: COLOR_MAP[c] || '#000' }}
                        />
                        {selected ? '✓ ' : ''}
                        {c}
                        {isCustom && <span className="ml-1 opacity-70">★</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Matrix */}
              {selectedSizes.length > 0 && selectedColors.length > 0 ? (
                <div className="overflow-x-auto border border-[#E3E6EB] rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F1F3F6]">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-[#5A6270] uppercase tracking-wide sticky left-0 bg-[#F1F3F6]">
                          Size
                        </th>
                        {selectedColors.map((c) => (
                          <th
                            key={c}
                            className="text-center px-3 py-2.5 text-xs font-medium text-[#5A6270] uppercase tracking-wide"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className="w-3 h-3 rounded-full border border-[#CBD2DC]"
                                style={{ backgroundColor: COLOR_MAP[c] || '#000' }}
                              />
                              {c}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSizes.map((s) => (
                        <tr key={s} className="border-t border-[#E3E6EB]">
                          <td className="px-4 py-3 text-sm font-medium text-[#0F2A5C] sticky left-0 bg-white">
                            {s}
                          </td>
                          {selectedColors.map((c) => {
                            const val = getStockValue(s, c);
                            return (
                              <td key={c} className="px-2 py-2 text-center">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={val}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/[^0-9]/g, '');
                                    setStockValue(s, c, v === '' ? '' : Number(v));
                                  }}
                                  placeholder="0"
                                  className="w-20 bg-[#F1F3F6] border border-transparent rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-[#F1F3F6] rounded-lg p-6 text-center text-sm text-[#8A8F98]">
                  Select at least one size and one color to see the stock matrix.
                </div>
              )}

              {finalVariants.length > 0 && (
                <div className="mt-4 bg-[#E7F7EE] border border-[#0B7A47]/20 rounded-lg px-3.5 py-2.5 text-sm text-[#0B7A47] font-medium">
                  ✓ {finalVariants.length} variant
                  {finalVariants.length !== 1 ? 's' : ''} will be created
                </div>
              )}
            </section>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1 space-y-5">
            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Pricing
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                    Buying Price (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                  />
                  <p className="text-xs text-[#8A8F98] mt-1.5">
                    Admin only — customers never see this.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                    Selling Price (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F2A5C] mb-1.5">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] transition"
                  />
                </div>

                {priceNum > 0 && buyingNum > 0 && (
                  <div className="bg-[#E7F7EE] border border-[#0B7A47]/20 rounded-lg px-3.5 py-3 text-sm space-y-1.5">
                    <div>
                      <span className="text-[#5A6270]">Customer pays</span>{' '}
                      <span className="font-semibold text-[#0F2A5C]">
                        ৳{customerPays.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5A6270]">Profit</span>{' '}
                      <span
                        className={`font-semibold ${
                          profitPerUnit >= 0 ? 'text-[#0B7A47]' : 'text-red-600'
                        }`}
                      >
                        ৳{profitPerUnit.toLocaleString()}
                      </span>
                      <span className="text-[#5A6270]"> per unit</span>
                    </div>
                    <div>
                      <span className="text-[#5A6270]">Margin</span>{' '}
                      <span
                        className={`font-semibold ${
                          marginPct >= 30
                            ? 'text-[#0B7A47]'
                            : marginPct >= 15
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {marginPct}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
                Visibility
              </h2>
              <div className="space-y-3">
                <Toggle
                  label="Active (visible to customers)"
                  checked={active}
                  onChange={setActive}
                />
                <Toggle
                  label="Featured (show on homepage)"
                  checked={featured}
                  onChange={setFeatured}
                />
                <Toggle
                  label="Try Room available"
                  checked={tryable}
                  onChange={setTryable}
                />
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-5">
              {error && (
                <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-3 text-sm text-[#0B7A47] bg-[#E7F7EE] border border-[#0B7A47]/20 rounded-lg px-3 py-2">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || uploading}
                className="w-full bg-[#0F2A5C] hover:bg-[#0A1F45] text-white rounded-lg py-3 font-semibold text-sm transition disabled:opacity-50 shadow-[0_2px_8px_rgba(15,42,92,0.15)]"
              >
                {saving
                  ? 'Saving...'
                  : uploading
                  ? 'Uploading images...'
                  : 'Create Product'}
              </button>

              <Link
                href="/admin/products"
                className="block text-center text-xs text-[#8A8F98] hover:text-[#0F2A5C] mt-3"
              >
                Cancel
              </Link>
            </section>
          </div>
        </div>
      </form>
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
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-sm text-[#0F2A5C]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition ${
          checked ? 'bg-[#0F2A5C]' : 'bg-[#CBD2DC]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}