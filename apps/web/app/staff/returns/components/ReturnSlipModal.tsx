'use client';

import { useEffect } from 'react';
import { formatDateTime } from '@/lib/format';

// ============================================
// Types
// ============================================
export interface ReturnSlipItem {
  id: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: string | number;
  condition: string;
}

export interface ReturnSlipData {
  returnNumber: string;
  createdAt: string;
  channel: 'ONLINE' | 'OFFLINE';
  status: string;
  reason: string;
  refundAmount: string | number;
  refundMethod?: string | null;
  refundTxId?: string | null;
  refundedAt?: string | null;
  order: {
    orderNumber: string;
    customerName?: string;
    customerPhone?: string;
  };
  items: ReturnSlipItem[];
}

interface Props {
  data: ReturnSlipData;
  onClose: () => void;
  autoPrint?: boolean;
}

// ============================================
// Labels
// ============================================
const REASON_LABELS: Record<string, string> = {
  SIZE_WRONG: 'Size did not fit',
  COLOR_WRONG: 'Wrong color',
  DAMAGED: 'Arrived damaged',
  DEFECTIVE: 'Manufacturing defect',
  NOT_AS_DESCRIBED: 'Not as described',
  CHANGED_MIND: 'Changed mind',
  LATE_DELIVERY: 'Late delivery',
  WRONG_ITEM: 'Wrong item',
  OTHER: 'Other',
};

const CONDITION_LABELS: Record<string, string> = {
  PENDING: 'Not inspected yet',
  OK: 'Good, back to stock',
  DAMAGED: 'Damaged',
  DEFECTIVE: 'Defective',
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In transit',
  RECEIVED: 'Received',
  INSPECTED: 'Inspected',
  COMPLETED: 'Refunded',
  REFUNDED: 'Refunded',
  REJECTED: 'Rejected',
};

// ============================================
// Component
// ============================================
export function ReturnSlipModal({ data, onClose, autoPrint = false }: Props) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  const totalQty = data.items.reduce((s, it) => s + it.qty, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:bg-white print:p-0 print:items-start"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-h-[95vh] overflow-auto print:shadow-none print:rounded-none print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Print area */}
        <div
          id="return-slip-print"
          className="w-[80mm] p-4 text-black font-mono text-[12px] leading-tight print:w-[80mm] print:p-2"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <div className="text-[18px] font-bold tracking-widest">
              TANAVIA
            </div>
            <div className="text-[10px]">Premium Clothing Store</div>
            <div className="text-[10px]">Dhaka, Bangladesh</div>
            <div className="text-[10px]">Phone: 01700-000000</div>
          </div>

          <div className="text-center text-[14px] font-bold mb-2">
            RETURN SLIP
          </div>

          {/* Return info */}
          <div className="flex justify-between text-[11px]">
            <span>Return #:</span>
            <span className="font-bold">{data.returnNumber}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Date:</span>
            <span>{formatDateTime(data.createdAt)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Order #:</span>
            <span>{data.order.orderNumber}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Channel:</span>
            <span>{data.channel}</span>
          </div>

          {/* Customer */}
          <div className="border-t border-dashed border-black mt-2 pt-2">
            <div className="text-[10px] font-bold mb-1">CUSTOMER</div>
            <div className="text-[11px]">
              {data.order.customerName || 'Walk-in Customer'}
            </div>
            {data.order.customerPhone && (
              <div className="text-[10px]">{data.order.customerPhone}</div>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-dashed border-black mt-2 pt-2">
            <div className="text-[10px] font-bold mb-1">
              ITEMS RETURNED ({totalQty} pcs)
            </div>
            {data.items.map((it) => (
              <div key={it.id} className="mb-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold truncate pr-2">{it.name}</span>
                  <span>
                    ৳{(Number(it.unitPrice) * it.qty).toFixed(0)}
                  </span>
                </div>
                <div className="text-[10px] text-gray-700">
                  {it.size}/{it.color} × {it.qty} @ ৳{it.unitPrice}
                </div>
                <div className="text-[10px]">
                  Reason: {REASON_LABELS[data.reason] || data.reason}
                </div>
                <div className="text-[10px]">
                  Condition:{' '}
                  {CONDITION_LABELS[it.condition] || it.condition}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-black mt-2 pt-2">
            <div className="flex justify-between text-[14px] font-bold">
              <span>TOTAL REFUND:</span>
              <span>৳{Number(data.refundAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* Refund details */}
          {data.refundMethod && (
            <div className="border-t border-dashed border-black mt-2 pt-2">
              <div className="flex justify-between text-[11px]">
                <span>Refund Method:</span>
                <span className="font-bold">
                  {data.refundMethod.replace(/_/g, ' ')}
                </span>
              </div>
              {data.refundTxId && (
                <div className="flex justify-between text-[10px]">
                  <span>TxID:</span>
                  <span>{data.refundTxId}</span>
                </div>
              )}
              {data.refundedAt && (
                <div className="flex justify-between text-[10px]">
                  <span>Refunded at:</span>
                  <span>{formatDateTime(data.refundedAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          <div className="border-t border-dashed border-black mt-2 pt-2 text-[11px]">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold">
                {STATUS_LABELS[data.status] || data.status}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-black mt-3 pt-2 text-center text-[10px]">
            <div className="font-bold mb-1">Thank you!</div>
            <div>Customer Signature: _______________</div>
            <div className="mt-2 text-[9px]">
              *** Keep this slip for your records ***
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-lg bg-[#0F2A5C] text-white font-medium hover:bg-[#0A1F45] transition"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Print stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #return-slip-print,
          #return-slip-print * {
            visibility: visible;
          }
          #return-slip-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}