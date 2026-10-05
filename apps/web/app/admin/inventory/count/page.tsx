'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ============================================
// Types
// ============================================
interface InventoryItem {
  id: string;
  sku?: string | null;
  size: string;
  color: string;
  onHand: number;
  held: number;
  available: number;
  status: string;
  product: {
    id: string;
    name: string;
    category?: { id: string; name: string; slug: string } | null;
    image: string | null;
  };
}

interface CountEntry {
  variantId: string;
  counted: string; // input value as string
  note: string;
}

// ============================================
// Page
// ============================================
export default function CountPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [entries, setEntries] = useState<Record<string, CountEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken() || undefined;
      const res = await api.get<InventoryItem[]>(
        `/api/inventory?limit=500&sort=name`,
        { token }
      );
      setItems(res.data || []);

      // Initialize entries
      const initial: Record<string, CountEntry> = {};
      for (const it of res.data || []) {
        initial[it.id] = {
          variantId: it.id,
          counted: String(it.onHand),
          note: '',
        };
      }
      setEntries(initial);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to load inventory';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateCounted(variantId: string, value: string) {
    setEntries((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        variantId,
        counted: value,
      },
    }));
  }

  function updateNote(variantId: string, value: string) {
    setEntries((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        variantId,
        note: value,
      },
    }));
  }

  function resetAll() {
    const initial: Record<string, CountEntry> = {};
    for (const it of items) {
      initial[it.id] = {
        variantId: it.id,
        counted: String(it.onHand),
        note: '',
      };
    }
    setEntries(initial);
  }

  async function handleSave() {
    // Filter only changed rows
    const changed = Object.values(entries).filter((e) => {
      const it = items.find((x) => x.id === e.variantId);
      if (!it) return false;
      const countedNum = Number(e.counted);
      return !isNaN(countedNum) && countedNum !== it.onHand;
    });

    if (changed.length === 0) {
      alert('No changes to save');
      return;
    }

    // Validate — no negative, not below held
    for (const entry of changed) {
      const it = items.find((x) => x.id === entry.variantId);
      if (!it) continue;
      const countedNum = Number(entry.counted);
      if (countedNum < 0) {
        alert(`Cannot have negative qty for ${it.product.name}`);
        return;
      }
      if (countedNum < it.held) {
        alert(
          `${it.product.name} (${it.size}/${it.color}): counted ${countedNum} is less than ${it.held} held for online orders. Recount.`
        );
        return;
      }
    }

    if (
      !confirm(
        `Save count for ${changed.length} variants? This will adjust stock and cannot be undone.`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const token = getToken() || undefined;
      const payload = changed.map((e) => ({
        variantId: e.variantId,
        newQty: Number(e.counted),
        note: e.note.trim() || undefined,
      }));

      const res = await api.post<{ changed: number }>(
        `/api/inventory/bulk-adjust`,
        { entries: payload },
        { token }
      );

      alert(`✓ Count saved. ${res.data?.changed || 0} variants updated.`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = items.filter((it) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !it.product.name.toLowerCase().includes(q) &&
        !(it.sku || '').toLowerCase().includes(q) &&
        !it.size.toLowerCase().includes(q) &&
        !it.color.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (showOnlyChanged) {
      const entry = entries[it.id];
      if (!entry) return false;
      const countedNum = Number(entry.counted);
      if (isNaN(countedNum) || countedNum === it.onHand) return false;
    }
    return true;
  });

  const changedCount = Object.values(entries).filter((e) => {
    const it = items.find((x) => x.id === e.variantId);
    if (!it) return false;
    const n = Number(e.counted);
    return !isNaN(n) && n !== it.onHand;
  }).length;

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-8 bg-[#F7F8FA] min-h-screen">
      {/* Back */}
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1 text-sm text-[#8A8F98] hover:text-[#0F2A5C] mb-5"
      >
        ← Back to Inventory
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F2A5C] mb-1">
            Physical Count
          </h1>
          <p className="text-[#8A8F98] text-sm">
            Enter what you actually counted. Empty rows are not changed.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={resetAll}
            disabled={loading || saving}
            className="bg-[#F1F3F6] hover:bg-[#E3E6EB] text-[#0F2A5C] px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            ↺ Reset all
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || changedCount === 0}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {saving
              ? 'Saving...'
              : `✓ Save count (${changedCount} changed)`}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 flex items-start gap-2 text-sm text-blue-800">
        <span>ℹ️</span>
        <div>
          <strong>How it works:</strong> The input field shows the current
          system quantity. Change it to what you physically counted. Only
          variants with a difference will be adjusted. Every change is logged
          as a Count correction.
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 mb-5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, variant, SKU"
            className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-3.5 py-2 pl-10 text-sm focus:outline-none focus:bg-white focus:border-[#0F2A5C]"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8A8F98]">
            🔍
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showOnlyChanged}
            onChange={(e) => setShowOnlyChanged(e.target.checked)}
          />
          Only changed rows
        </label>
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
            Loading...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-[#5A6270]">
              {showOnlyChanged
                ? 'No changes yet. Adjust some counts to see them here.'
                : 'No items found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F1F4F9] text-[#5A6270] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-center px-4 py-3 font-medium">
                    System
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Held</th>
                  <th className="text-center px-4 py-3 font-medium">
                    Counted
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Diff</th>
                  <th className="text-left px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it) => {
                  const entry = entries[it.id];
                  const counted = Number(entry?.counted);
                  const diff = isNaN(counted) ? 0 : counted - it.onHand;
                  const hasChange = diff !== 0;
                  const isInvalid =
                    !isNaN(counted) && counted < it.held && counted >= 0;

                  return (
                    <tr
                      key={it.id}
                      className={`border-t border-[#E8EBF0] ${
                        hasChange ? 'bg-amber-50' : ''
                      } ${isInvalid ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-10 bg-[#F1F3F6] rounded overflow-hidden flex-shrink-0">
                            {it.product.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.product.image}
                                alt={it.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px]">
                                📷
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[#0F2A5C] line-clamp-1">
                              {it.product.name}
                            </div>
                            <div className="text-xs text-[#8A8F98]">
                              {it.size} · {it.color}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#5A6270]">
                        {it.sku || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#0F2A5C]">
                        {it.onHand}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-600">
                        {it.held}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={entry?.counted ?? ''}
                          onChange={(e) =>
                            updateCounted(it.id, e.target.value)
                          }
                          className={`w-20 text-center bg-[#F1F3F6] border rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:bg-white ${
                            isInvalid
                              ? 'border-red-400 focus:border-red-500'
                              : hasChange
                              ? 'border-amber-400 focus:border-amber-500'
                              : 'border-transparent focus:border-[#0F2A5C]'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {hasChange ? (
                          <span
                            className={
                              diff > 0 ? 'text-emerald-600' : 'text-red-600'
                            }
                          >
                            {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        ) : (
                          <span className="text-[#8A8F98]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={entry?.note ?? ''}
                          onChange={(e) => updateNote(it.id, e.target.value)}
                          placeholder="Optional"
                          disabled={!hasChange}
                          className="w-full bg-[#F1F3F6] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-[#0F2A5C] disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer summary */}
      {changedCount > 0 && (
        <div className="mt-5 bg-white rounded-lg shadow-[0_2px_10px_rgba(15,42,92,0.06)] p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-[#5A6270]">
            <strong className="text-[#0F2A5C]">{changedCount}</strong> variant
            {changedCount !== 1 ? 's' : ''} changed. Save to apply count
            corrections.
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0F2A5C] hover:bg-[#0A1F45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : `✓ Save count (${changedCount})`}
          </button>
        </div>
      )}
    </div>
  );
}