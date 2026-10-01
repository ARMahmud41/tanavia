'use client';

import Barcode from 'react-barcode';
import { tk } from '@/lib/format';

interface OrderItem {
  name: string;
  size: string;
  color: string;
  qty: number;
  price: string | number;
}

interface Props {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  district: string;
  total: string | number;
  paymentMethod: string;
  items: OrderItem[];
  note?: string | null;
}

export function ShippingLabel({
  orderNumber,
  customerName,
  customerPhone,
  address,
  district,
  total,
  paymentMethod,
  items,
  note,
}: Props) {
  const isCOD = paymentMethod === 'COD';

  return (
    <div className="shipping-label bg-white">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-3">
        <div className="font-serif text-2xl font-bold tracking-widest text-black">
          TANAVIA
        </div>
        <div className="text-[10px] text-gray-700 tracking-widest">
          FASHION · LIFESTYLE · YOU
        </div>
      </div>

      {/* Order Barcode */}
      <div className="text-center py-3 border-b border-gray-300">
        <div className="flex justify-center bg-white">
          <Barcode
            value={orderNumber}
            format="CODE128"
            width={1.5}
            height={45}
            fontSize={0}
            margin={0}
            displayValue={false}
          />
        </div>
        <div className="font-mono text-sm text-black mt-1">{orderNumber}</div>
      </div>

      {/* Deliver To */}
      <div className="py-3 border-b border-gray-300">
        <div className="text-[10px] font-bold tracking-wider text-gray-600 mb-1">
          DELIVER TO:
        </div>
        <div className="text-black">
          <div className="text-lg font-bold">{customerName}</div>
          <div className="text-sm font-semibold mt-0.5">
            📞 {customerPhone}
          </div>
          <div className="text-sm mt-1.5 leading-tight">{address}</div>
          <div className="text-sm font-semibold mt-0.5">{district}</div>
        </div>
      </div>

      {/* Items */}
      <div className="py-3 border-b border-gray-300">
        <div className="text-[10px] font-bold tracking-wider text-gray-600 mb-1">
          ITEMS ({items.length}):
        </div>
        <div className="space-y-0.5">
          {items.map((item, i) => (
            <div key={i} className="text-xs text-black flex justify-between">
              <span className="truncate">
                • {item.name} ({item.size}/{item.color})
              </span>
              <span className="font-semibold ml-2 flex-shrink-0">
                × {item.qty}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="py-3 text-center">
        <div className="inline-block border-2 border-black rounded px-4 py-1.5">
          <div className="text-[10px] font-bold tracking-wider text-gray-600">
            {isCOD ? 'CASH ON DELIVERY' : 'PREPAID'}
          </div>
          <div className="text-2xl font-bold text-black">{tk(total)}</div>
        </div>
      </div>

      {/* Note */}
      {note && (
        <div className="border-t border-gray-300 pt-2 text-[10px] text-gray-700 italic">
          Note: {note}
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-black pt-2 mt-auto">
        <div className="flex justify-between text-[9px] text-gray-700">
          <span>TANAVIA</span>
          <span>01577548241</span>
        </div>
        <div className="text-center text-[9px] text-gray-500 mt-0.5">
          Thank you for shopping with us!
        </div>
      </div>
    </div>
  );
}