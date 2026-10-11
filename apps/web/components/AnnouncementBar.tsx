'use client';

import { useEffect, useState } from 'react';

const ANNOUNCEMENTS = [
  '🚚 Free delivery over ৳5,000',
  '💵 Cash on Delivery Available',
  '↩️ 7-day easy return',
  '✨ New arrivals every week',
];

// Change interval here — 30000 = 30s, 4000 = 4s
const INTERVAL_MS = 30000;

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ANNOUNCEMENTS.length);
        setVisible(true);
      }, 300);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-wine text-white text-xs sm:text-sm py-2 text-center overflow-hidden">
      <div className="container-wrap px-4 h-5 flex items-center justify-center">
        <span
          className={`inline-block transition-opacity duration-300 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {ANNOUNCEMENTS[index]}
        </span>
      </div>
    </div>
  );
}