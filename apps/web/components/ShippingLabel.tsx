'use client';

import Image from 'next/image';
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

// ============================================
// Helper: Generate sort code from district
// ============================================
function getSortCode(district: string): string {
  const codes: Record<string, string> = {
    dhaka: 'DHK-01',
    chattogram: 'CTG-02',
    chittagong: 'CTG-02',
    sylhet: 'SYL-03',
    khulna: 'KHL-04',
    rajshahi: 'RAJ-05',
    barishal: 'BAR-06',
    rangpur: 'RNG-07',
    mymensingh: 'MYM-08',
    cumilla: 'CML-09',
    narayanganj: 'NRY-10',
    gazipur: 'GZP-11',
  };
  const key = district.toLowerCase().trim();
  return codes[key] || 'OTH-00';
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
  const sortCode = getSortCode(district);
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const totalItems = items.reduce((sum, it) => sum + it.qty, 0);

  return (
    <div className="shipping-label bg-white text-black">
      {/* ============================================ */}
      {/* HEADER — Logo + Service Type                     */}
      {/* ============================================ */}
      <div className="flex items-start justify-between border-b-2 border-black pb-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src="/logos/tanavia-logo.png"
              alt="TANAVIA"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="font-serif text-xl font-bold tracking-[0.2em] text-black leading-none">
              TANAVIA
            </div>
            <div className="text-[8px] tracking-[0.2em] text-gray-700 mt-0.5">
              FASHION · LIFESTYLE · YOU
            </div>
          </div>
        </div>

        {/* Service Type */}
        <div className="text-right">
          <div className="text-[8px] text-gray-600 tracking-wider">
            Service
          </div>
          <div className="text-sm font-bold tracking-wider">
            STANDARD
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* BARCODE                                          */}
      {/* ============================================ */}
      <div className="text-center py-3 border-b-2 border-black">
        <div className="flex justify-center">
          <Barcode
            value={orderNumber}
            format="CODE128"
            width={2}
            height={55}
            fontSize={0}
            margin={0}
            displayValue={false}
          />
        </div>
        <div className="font-mono text-base font-bold tracking-[0.2em] mt-1">
          {orderNumber}
        </div>
      </div>

      {/* ============================================ */}
      {/* DESTINATION + SORT CODE                          */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 border-b-2 border-black">
        <div className="p-2.5 border-r border-black">
          <div className="text-[8px] text-gray-600 tracking-wider mb-1">
            Destination
          </div>
          <div className="text-2xl font-black tracking-tight uppercase">
            {district}
          </div>
        </div>

        <div className="p-2.5">
          <div className="text-[8px] text-gray-600 tracking-wider mb-1">
            Sort code
          </div>
          <div className="text-xl font-black tracking-tight">
            {sortCode}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SHIP TO                                          */}
      {/* ============================================ */}
      <div className="p-2.5 border-b-2 border-black">
        <div className="text-[8px] text-gray-600 tracking-wider mb-1.5">
          SHIP TO
        </div>
        <div className="space-y-0.5 text-sm">
          <div className="font-bold text-base">{customerName}</div>
          <div className="font-semibold">{customerPhone}</div>
          <div className="leading-tight">{address}</div>
          <div className="font-semibold">{district}</div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FROM                                             */}
      {/* ============================================ */}
      <div className="px-2.5 py-1.5 border-b border-black bg-gray-50">
        <div className="text-[10px] flex flex-wrap gap-x-3 gap-y-0.5">
          <span>
            <span className="font-bold">FROM :</span> TANAVIA
          </span>
          <span>
            <span className="font-bold">Hotline :</span> 01813-330371
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* ITEMS                                            */}
      {/* ============================================ */}
      <div className="border-b-2 border-black">
        <div className="grid grid-cols-[1fr_auto] text-[10px] font-bold border-b border-gray-400 px-2.5 py-1 bg-gray-100">
          <div>ITEM ({items.length})</div>
          <div>QTY</div>
        </div>
        <div>
          {items.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] text-xs px-2.5 py-1 border-b border-gray-200 last:border-b-0"
            >
              <div className="truncate">
                {item.name} ({item.size} / {item.color})
              </div>
              <div className="font-bold">{item.qty}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================ */}
      {/* METADATA + PAYMENT                               */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 border-b-2 border-black">
        <div className="p-2 text-[10px] space-y-0.5 border-r border-black">
          <div>
            <span className="text-gray-600">Weight :</span>{' '}
            <span className="font-semibold">0.5 kg</span>
          </div>
          <div>
            <span className="text-gray-600">Pieces :</span>{' '}
            <span className="font-semibold">{totalItems}</span>
          </div>
          <div>
            <span className="text-gray-600">Date :</span>{' '}
            <span className="font-semibold">{currentDate}</span>
          </div>
        </div>

        <div className="bg-black text-white p-2 text-center flex flex-col justify-center">
          <div className="text-[9px] tracking-[0.15em] text-gray-300 mb-0.5">
            {isCOD ? 'CASH ON DELIVERY' : 'PREPAID'}
          </div>
          <div className="text-2xl font-black tracking-tight">
            {tk(total)}
          </div>
          <div className="text-[8px] text-gray-400 mt-0.5">
            {isCOD ? 'Collect from customer' : 'Paid online'}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* NOTE (optional)                                  */}
      {/* ============================================ */}
      {note && (
        <div className="px-2.5 py-1 text-[9px] text-gray-700 italic border-b border-black">
          Note: {note}
        </div>
      )}

      {/* ============================================ */}
      {/* FOOTER                                           */}
      {/* ============================================ */}
      <div className="px-2.5 py-1.5 flex justify-between items-center text-[9px]">
        <div className="text-gray-700">
          Handle with care · Open before payment not allowed
        </div>
        <div className="font-bold">1 / 1</div>
      </div>
    </div>
  );
}