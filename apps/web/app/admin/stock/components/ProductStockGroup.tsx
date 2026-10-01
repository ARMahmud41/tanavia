'use client';

import { useState } from 'react';

export interface VariantData {
  id: string;
  sku: string | null;
  size: string;
  color: string;
  qty: number;
  reserved: number;
  reorderLevel: number;
}

export interface ProductGroup {
  productId: string;
  productName: string;
  sku: string;
  category: string | null;
  images: string[];
  variants: VariantData[];
}

interface Props {
  group: ProductGroup;
  onVariantClick: (variant: VariantData) => void;
}

// ============================================
// Status calculator — based on AVAILABLE (qty - reserved)
// ============================================
export function getStatus(
  qty: number,
  reserved: number,
  reorderLevel: number
): 'OUT' | 'LOW' | 'OK' {
  const available = qty - reserved;
  if (available <= 0) return 'OUT';
  if (available <= reorderLevel) return 'LOW';
  return 'OK';
}

export function ProductStockGroup({ group, onVariantClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // Compute product-level totals
  const totalQty = group.variants.reduce((s, v) => s + v.qty, 0);
  const totalReserved = group.variants.reduce((s, v) => s + v.reserved, 0);
  const totalAvailable = totalQty - totalReserved;

  // Count statuses
  const outCount = group.variants.filter(
    (v) => getStatus(v.qty, v.reserved, v.reorderLevel) === 'OUT'
  ).length;
  const lowCount = group.variants.filter(
    (v) => getStatus(v.qty, v.reserved, v.reorderLevel) === 'LOW'
  ).length;

  return (
    <>
      {/* Parent row */}
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="border-t border-[#E8EBF0] hover:bg-[#F1F4F9] transition-colors cursor-pointer"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Expand arrow */}
            <span
              className={`text-[#5A6270] transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
            >
              ▶
            </span>
            {/* Image */}
            <div className="w-10 h-12 bg-[#F1F3F6] rounded overflow-hidden flex-shrink-0">
              {group.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={group.images[0]}
                  alt={group.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8A8F98] text-xs">
                  📷
                </div>
              )}
            </div>
            {/* Name + meta */}
            <div>
              <div className="font-medium text-ink">{group.productName}</div>
              <div className="text-xs text-[#8A8F98]">
                {group.category || '—'} · {group.sku} ·{' '}
                {group.variants.length} variants
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-[#8A8F98] font-mono">
          {/* Parent SKU column — leave blank, shown in row */}
          —
        </td>
        <td className="px-4 py-3">
          {/* Variant column */}
          <span className="text-xs text-[#8A8F98]">
            {group.variants.length} variant{group.variants.length !== 1 ? 's' : ''}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-medium text-[#0F2A5C]">
          {totalQty}
        </td>
        <td className="px-4 py-3 text-right">
          {totalReserved > 0 ? (
            <span className="text-amber-600 font-medium">{totalReserved}</span>
          ) : (
            <span className="text-[#8A8F98]">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-semibold">
          <span
            className={
              totalAvailable === 0
                ? 'text-[#C81E1E]'
                : totalAvailable <= 10
                ? 'text-[#B45309]'
                : 'text-[#0B7A47]'
            }
          >
            {totalAvailable}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {outCount > 0 || lowCount > 0 ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-semibold text-amber-700">
              {lowCount > 0 && <span>{lowCount} low</span>}
              {lowCount > 0 && outCount > 0 && <span>·</span>}
              {outCount > 0 && <span>{outCount} out</span>}
            </div>
          ) : (
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
              OK
            </span>
          )}
        </td>
      </tr>

      {/* Variant rows (when expanded) */}
      {expanded &&
        group.variants.map((v) => {
          const available = v.qty - v.reserved;
          const status = getStatus(v.qty, v.reserved, v.reorderLevel);
          const isSelected = selectedVariant === v.id;

          return (
            <tr key={v.id} className="bg-[#F1F4F9]">
              <td colSpan={7} className="p-0">
                <div className="pl-14 pr-4 py-1.5">
                  <div
                    onClick={() => {
                      setSelectedVariant(isSelected ? null : v.id);
                      onVariantClick(v);
                    }}
                    className={`grid grid-cols-7 gap-3 items-center rounded-lg px-4 py-3 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'border-[#0F2A5C] bg-white shadow-[0_4px_12px_rgba(15,42,92,0.12)]'
                        : 'border-transparent bg-white hover:border-[#0F2A5C]/30 hover:shadow-[0_2px_8px_rgba(15,42,92,0.06)]'
                    }`}
                  >
                    {/* Variant SKU - spans first 2 columns */}
                    <div className="col-span-2 text-sm font-mono font-semibold text-[#0F2A5C] truncate">
                      {v.sku || '—'}
                    </div>

                    {/* Variant (size / color) */}
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium ${
                          isSelected
                            ? 'bg-[#0F2A5C] text-white'
                            : 'bg-[#F1F3F6] text-[#0F2A5C]'
                        }`}
                      >
                        {v.size} / {v.color}
                      </span>
                    </div>

                    {/* Stock */}
                    <div className="text-right text-sm text-[#0F2A5C] font-medium">
                      {v.qty}
                    </div>

                    {/* Reserved */}
                    <div className="text-right text-sm">
                      {v.reserved > 0 ? (
                        <span className="text-amber-600 font-medium">
                          {v.reserved}
                        </span>
                      ) : (
                        <span className="text-[#8A8F98]">—</span>
                      )}
                    </div>

                    {/* Available */}
                    <div className="text-right text-sm font-semibold">
                      <span
                        className={
                          available === 0
                            ? 'text-[#C81E1E]'
                            : available <= v.reorderLevel
                            ? 'text-[#B45309]'
                            : 'text-[#0B7A47]'
                        }
                      >
                        {available}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
    </>
  );
}

function StatusBadge({ status }: { status: 'OUT' | 'LOW' | 'OK' }) {
  const styles: Record<string, string> = {
    OUT: 'bg-red-50 text-red-700 border-red-200',
    LOW: 'bg-amber-50 text-amber-700 border-amber-200',
    OK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${styles[status]}`}
    >
      {status}
    </span>
  );
}