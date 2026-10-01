'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';

interface StockMovement {
  id: string;
  productId: string;
  variantId: string | null;
  type: string;
  qty: number;
  before: number;
  after: number;
  reason: string | null;
  refId: string | null;
  actorId: string | null;
  createdAt: string;
  product?: { id: string; name: string; sku: string };
  variant?: { id: string; size: string; color: string };
}

interface Props {
  productId: string;
  variantSize: string;
  variantColor: string;
  productName: string;
  variantSku: string;
  onClose: () => void;
}

// ============================================
// Movement type config
// ============================================
const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: string; flow: 'in' | 'out' | 'neutral' }
> = {
  PURCHASE: { label: 'Purchase', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📥', flow: 'in' },
  SALE_ONLINE: { label: 'Online Sale', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🌐', flow: 'out' },
  SALE_OFFLINE: { label: 'Offline Sale', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🏪', flow: 'out' },
  RETURN: { label: 'Return', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '↩️', flow: 'in' },
  DAMAGE: { label: 'Damage', color: 'bg-red-50 text-red-700 border-red-200', icon: '💔', flow: 'out' },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: '⚙️', flow: 'neutral' },
  TRANSFER: { label: 'Transfer', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '🔄', flow: 'neutral' },
  RESERVE: { label: 'Reserved', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '🔒', flow: 'neutral' },
  RESERVE_RELEASE: { label: 'Reserve Released', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: '🔓', flow: 'neutral' },
};

export function MovementHistoryModal({
  productId,
  variantSize,
  variantColor,
  productName,
  variantSku,
  onClose,
}: Props) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = getToken() || undefined;
        // Fetch per-product movements (backend returns product-level)
        const res = await api.get<StockMovement[]>(
          `/api/stock/movements/${productId}?limit=100`,
          { token }
        );

        // Filter to this specific variant
        const filtered = (res.data || []).filter(
          (m) =>
            m.variant?.size === variantSize &&
            m.variant?.color === variantColor
        );
        setMovements(filtered);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to load history';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, variantSize, variantColor]);

  // Compute summary
  const summary = movements.reduce(
    (acc, m) => {
      if (m.type === 'SALE_ONLINE') acc.onlineSales += Math.abs(m.qty);
      else if (m.type === 'SALE_OFFLINE') acc.offlineSales += Math.abs(m.qty);
      else if (m.type === 'PURCHASE') acc.purchases += Math.abs(m.qty);
      else if (m.type === 'RETURN') acc.returns += Math.abs(m.qty);
      else if (m.type === 'DAMAGE') acc.damages += Math.abs(m.qty);
      else if (m.type === 'ADJUSTMENT') {
        if (m.qty > 0) acc.adjustments += m.qty;
        else acc.adjustments += m.qty;
      }
      return acc;
    },
    {
      onlineSales: 0,
      offlineSales: 0,
      purchases: 0,
      returns: 0,
      damages: 0,
      adjustments: 0,
    }
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F2A5C] text-white px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold">
              Stock History
            </h2>
            <p className="text-xs text-white/70 mt-0.5">
              {productName} — {variantSize}/{variantColor}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 font-mono">
              {variantSku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Summary bar */}
        <div className="bg-[#F1F4F9] px-5 py-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs border-b border-[#E8EBF0]">
          <div>
            <div className="text-[#8A8F98] mb-0.5">Online Sales</div>
            <div className="font-semibold text-emerald-700">
              🌐 {summary.onlineSales}
            </div>
          </div>
          <div>
            <div className="text-[#8A8F98] mb-0.5">Offline Sales</div>
            <div className="font-semibold text-purple-700">
              🏪 {summary.offlineSales}
            </div>
          </div>
          <div>
            <div className="text-[#8A8F98] mb-0.5">Purchases</div>
            <div className="font-semibold text-blue-700">
              📥 {summary.purchases}
            </div>
          </div>
          <div>
            <div className="text-[#8A8F98] mb-0.5">Returns</div>
            <div className="font-semibold text-amber-700">
              ↩️ {summary.returns}
            </div>
          </div>
          <div>
            <div className="text-[#8A8F98] mb-0.5">Adjustments</div>
            <div className="font-semibold text-gray-700">
              ⚙️ {summary.adjustments > 0 ? '+' : ''}
              {summary.adjustments}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-[#8A8F98] text-sm">
              Loading history...
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            </div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-[#5A6270] mb-1">No movements yet</p>
              <p className="text-sm text-[#8A8F98]">
                Stock changes will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F4F9]">
              {movements.map((m) => (
                <MovementRow key={m.id} movement={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Movement Row
// ============================================
function MovementRow({ movement }: { movement: StockMovement }) {
  const cfg = TYPE_CONFIG[movement.type] || {
    label: movement.type,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: '📦',
    flow: 'neutral' as const,
  };

  const qtyText =
    movement.qty > 0 ? `+${movement.qty}` : movement.qty.toString();
  const qtyColor =
    movement.qty > 0
      ? 'text-emerald-700'
      : movement.qty < 0
      ? 'text-red-700'
      : 'text-[#8A8F98]';

  return (
    <div className="px-5 py-3 hover:bg-[#FAFBFC] transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon + Type badge */}
        <div className="flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cfg.color}`}
          >
            <span>{cfg.icon}</span>
            {cfg.label}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div className={`font-semibold text-sm ${qtyColor}`}>
              {qtyText} units
            </div>
            <div className="text-xs text-[#8A8F98] font-mono">
              {movement.before} → {movement.after}
            </div>
          </div>

          {movement.reason && (
            <div className="text-xs text-[#5A6270] line-clamp-2 mb-1">
              {movement.reason}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-[#8A8F98]">
            <span>{formatDateTime(movement.createdAt)}</span>
            <span>•</span>
            <span>{movement.actorId ? 'admin/staff' : 'system'}</span>
            {movement.refId && (
              <>
                <span>•</span>
                <span className="font-mono">{movement.refId.slice(-8)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}