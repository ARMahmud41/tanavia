'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CountdownBanner() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) return clearInterval(timer);

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container-wrap px-4 sm:px-6 my-8">
      <div className="bg-[#1A1A1A] rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-white font-semibold text-lg sm:text-xl mb-1">Weekend deal, up to 25% off</h3>
          <p className="text-gray-400 text-xs sm:text-sm">Ends soon, prices go back up after</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {Object.entries(timeLeft).map(([unit, value]) => (
              <div key={unit} className="bg-[#333] rounded-lg w-12 h-14 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-lg">{String(value).padStart(2, '0')}</span>
                <span className="text-gray-400 text-[9px] uppercase">{unit}</span>
              </div>
            ))}
          </div>
          <Link href="/products?offers=true" className="bg-[#F5C12A] hover:bg-yellow-400 text-black font-semibold px-5 py-3 rounded-lg text-sm transition">
            Shop the deal
          </Link>
        </div>
      </div>
    </div>
  );
}