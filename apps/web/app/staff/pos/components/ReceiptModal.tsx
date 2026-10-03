'use client';

import { useEffect, useRef } from 'react';

export interface ReceiptItem {
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  staffName: string;
  note?: string;
  senderNumber?: string;
  paymentTxId?: string;
}

interface Props {
  data: ReceiptData;
  onClose: () => void;
}

export function ReceiptModal({ data, onClose }: Props) {
  const printedRef = useRef(false);

  // Auto print on mount
  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const date = new Date(data.createdAt);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:p-0 print:bg-white">
      {/* Screen-only wrapper */}
      <div className="bg-white rounded-lg shadow-2xl max-h-[95vh] overflow-auto print:shadow-none print:rounded-none print:max-h-none print:overflow-visible">
        {/* Receipt content — this is what prints */}
        <div
          id="receipt-print-area"
          className="w-[80mm] p-4 text-black font-mono text-[12px] leading-tight print:w-[80mm] print:p-2"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <div className="text-[18px] font-bold tracking-widest">TANAVIA</div>
            <div className="text-[10px]">Premium Clothing Store</div>
            <div className="text-[10px]">Dhaka, Bangladesh</div>
            <div className="text-[10px]">Phone: 01700-000000</div>
          </div>

          {/* Order info */}
          <div className="flex justify-between text-[11px] mb-1">
            <span>Order:</span>
            <span className="font-bold">{data.orderNumber}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Date:</span>
            <span>
              {dateStr} {timeStr}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span>Staff:</span>
            <span>{data.staffName || '—'}</span>
          </div>
          {data.customerPhone && (
            <div className="flex justify-between text-[11px]">
              <span>Customer:</span>
              <span>{data.customerPhone}</span>
            </div>
          )}

          {/* Items */}
          <div className="border-t border-dashed border-black mt-2 pt-2">
            <div className="text-[10px] font-bold mb-1">ITEMS</div>
            {data.items.map((it, idx) => (
              <div key={idx} className="mb-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold truncate pr-2">{it.name}</span>
                  <span>৳{(it.price * it.qty).toFixed(0)}</span>
                </div>
                <div className="text-[10px] text-gray-700">
                  {it.size}/{it.color} × {it.qty} @ ৳{it.price}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-black mt-2 pt-2 space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span>Subtotal:</span>
              <span>৳{data.subtotal.toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-[11px]">
                <span>Discount:</span>
                <span>-৳{data.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-bold border-t border-black pt-1 mt-1">
              <span>TOTAL:</span>
              <span>৳{data.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="border-t border-dashed border-black mt-2 pt-2 space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span>Payment:</span>
              <span>{data.paymentMethod}</span>
            </div>
            {data.amountReceived > 0 && (
              <>
                <div className="flex justify-between text-[11px]">
                  <span>Received:</span>
                  <span>৳{data.amountReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Change:</span>
                  <span>৳{data.change.toFixed(2)}</span>
                </div>
              </>
            )}
            {data.senderNumber && (
              <div className="flex justify-between text-[10px]">
                <span>Sender:</span>
                <span>{data.senderNumber}</span>
              </div>
            )}
            {data.paymentTxId && (
              <div className="flex justify-between text-[10px]">
                <span>TxID:</span>
                <span>{data.paymentTxId}</span>
              </div>
            )}
          </div>

          {/* Note */}
          {data.note && (
            <div className="border-t border-dashed border-black mt-2 pt-2 text-[10px]">
              <span className="font-bold">Note:</span> {data.note}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-dashed border-black mt-3 pt-2 text-center text-[10px]">
            <div className="font-bold mb-1">Thank you for shopping!</div>
            <div>Visit again — tanavia.com</div>
            <div className="mt-2 text-[9px]">*** No return without receipt ***</div>
          </div>
        </div>

        {/* Screen-only buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 py-2.5 rounded-lg bg-[var(--staff-primary,#1e4d3a)] text-white font-medium hover:opacity-90"
          >
            🖨️ Print Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}