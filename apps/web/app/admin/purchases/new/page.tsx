'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { tk } from '@/lib/format';

// ============================================
// Types
// ============================================
interface Supplier {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

interface Variant {
  id: string;
  sku?: string | null;
  size: string;
  color: string;
  onHand: number;
  cost?: number;
  product: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface POLine {
  variantId: string;
  variant: Variant;
  qty: number;
  unitCost: number;
}

// ============================================
// Page
// ============================================
export default function NewPurchasePage() {
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<POLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Variant search
  const [variantSearch, setVariantSearch] = useState('');
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  // Load initial data
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getToken() || undefined;

        const [supRes, varRes] = await Promise.all([
          api.get<Supplier[]>(`/api/suppliers?active=true`, { token }),
          api.get<Variant[]>(`/api/inventory?limit=500&sort=name`, { token }),
        ]);

        setSuppliers(supRes.data || []);
        setAllVariants(varRes.data || []);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to load data';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function addLine(variant: Variant) {
    if (lines.some((l) => l.variantId === variant.id)) {
      setVariantSearch('');
      setShowVariantPicker(false);
      return;
    }
    setLines([
      ...lines,
      {
        variantId: variant.id,
        variant,
        qty: 1,
        unitCost: variant.cost || 0,
      },
    ]);
    setVariantSearch('');
    setShowVariantPicker(false);
  }

  function removeLine(variantId: string) {
    setLines(lines.filter((l) => l.variantId !== variantId));
  }

  function updateLine(
    variantId: string,
    field: 'qty' | 'unitCost',
    value: number
  ) {
    setLines(
      lines.map((l) =>
        l.variantId === variantId ? { ...l, [field]: value } : l
      )
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  const filteredVariants = allVariants.filter((v) => {
    if (!variantSearch.trim()) return true;
    const q = variantSearch.toLowerCase();
    return (
      v.product.name.toLowerCase().includes(q) ||
      (v.sku || '').toLowerCase().includes(q) ||
      v.size.toLowerCase().includes(q) ||
      v.color.toLowerCase().includes(q)
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (lines.length === 0) {
      setError('Please add at least one variant');
      return;
    }
    if (lines.some((l) => l.qty <= 0 || l.unitCost <= 0)) {
      setError('All quantities and unit costs must be greater than zero');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = getToken() || undefined;
      const payload = {
        supplierId,
        note: note.trim() || undefined,
        items: lines.map((l) => ({
          variantId: l.variantId,
          qty: l.qty,
          unitCost: l.unitCost,
        })),
      };

      const res = await api.post<{ id: string; poNumber: string }>(
        `/api/purchases`,
        payload,
        { token }
      );

      if (res.data?.id) {
        router.push(`/admin/purchases/${res.data.id}`);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to create purchase order';
      setError(msg);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-[#F7F8FA] min-h-screen">
        <div className="text-center text-[#8A8F98] py-16">
          Loading form...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      <Link
        href="/admin/purchases"
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to purchases
      </Link>

      <div className="max-w-4xl">
        <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
          New Purchase Order
        </h1>
        <p className="text-[#8A8F98] text-sm mb-6">
          Add items you are ordering from a supplier. Stock changes only when
          you receive the items.
        </p>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Supplier */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Supplier
            </h2>

            {suppliers.length === 0 ? (
              <div className="text-sm text-[#8A8F98]">
                No suppliers yet.{' '}
                <Link
                  href="/admin/suppliers"
                  className="text-[#0F2A5C] font-medium hover:underline"
                >
                  Add a supplier first →
                </Link>
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                required
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.phone}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Items */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-semibold text-[#0F2A5C]">
                Items ({lines.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowVariantPicker(true)}
                className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-3.5 py-1.5 rounded-lg text-sm font-semibold transition"
              >
                + Add variant
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="text-sm text-[#8A8F98] text-center py-8 border-2 border-dashed border-[#E8EBF0] rounded-lg">
                No items yet. Click &ldquo;+ Add variant&rdquo; to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase">
                      <th className="text-left px-3 py-2 font-medium">
                        Variant
                      </th>
                      <th className="text-center px-3 py-2 font-medium">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 font-medium">
                        Unit cost
                      </th>
                      <th className="text-right px-3 py-2 font-medium">
                        Total
                      </th>
                      <th className="text-right px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr
                        key={line.variantId}
                        className="border-t border-[#E8EBF0]"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-10 bg-[#F1F3F6] rounded overflow-hidden flex-shrink-0">
                              {line.variant.product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={line.variant.product.image}
                                  alt={line.variant.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px]">
                                  📷
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-[#0F2A5C] truncate">
                                {line.variant.product.name}
                              </div>
                              <div className="text-xs text-[#8A8F98]">
                                {line.variant.size} · {line.variant.color}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(
                                line.variantId,
                                'qty',
                                Number(e.target.value)
                              )
                            }
                            className="w-20 text-center bg-[#F1F3F6] border border-transparent rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) =>
                              updateLine(
                                line.variantId,
                                'unitCost',
                                Number(e.target.value)
                              )
                            }
                            className="w-24 text-right bg-[#F1F3F6] border border-transparent rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
                          />
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-[#0F2A5C]">
                          {tk(line.qty * line.unitCost)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.variantId)}
                            className="text-[#C81E1E] hover:underline text-xs font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#0F2A5C]">
                      <td colSpan={3} className="px-3 py-3 text-right font-semibold text-[#0F2A5C]">
                        Subtotal
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-[#0F2A5C]">
                        {tk(subtotal)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Note */}
          <section className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(15,42,92,0.06)]">
            <h2 className="font-serif text-lg font-semibold text-[#0F2A5C] mb-4">
              Note (optional)
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Any special instructions..."
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
            />
          </section>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/admin/purchases"
              className="flex-1 text-center bg-white border border-[#E8EBF0] text-[#0F2A5C] px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#F1F3F6] transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || lines.length === 0 || !supplierId}
              className="flex-1 bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-6 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Creating...' : '💾 Create Purchase Order (DRAFT)'}
            </button>
          </div>
        </form>
      </div>

      {/* Variant picker modal */}
      {showVariantPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowVariantPicker(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-5 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl font-semibold text-[#0F2A5C] mb-3">
              Pick a variant
            </h3>

            <input
              type="text"
              value={variantSearch}
              onChange={(e) => setVariantSearch(e.target.value)}
              placeholder="Search product, SKU, size, color..."
              autoFocus
              className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C] mb-3"
            />

            <div className="overflow-y-auto flex-1 -mx-5 px-5">
              {filteredVariants.length === 0 ? (
                <p className="text-sm text-[#8A8F98] text-center py-8">
                  No variants found
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => addLine(v)}
                      className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F1F4F9] transition"
                    >
                      <div className="w-10 h-12 bg-[#F1F3F6] rounded overflow-hidden flex-shrink-0">
                        {v.product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.product.image}
                            alt={v.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px]">
                            📷
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#0F2A5C] truncate">
                          {v.product.name}
                        </div>
                        <div className="text-xs text-[#8A8F98]">
                          {v.size} · {v.color} · Stock: {v.onHand}
                          {v.cost ? ` · Cost: ${tk(v.cost)}` : ''}
                        </div>
                      </div>
                      <span className="text-xs text-[#0F2A5C] font-medium">
                        + Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E8EBF0] mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVariantPicker(false)}
                className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
