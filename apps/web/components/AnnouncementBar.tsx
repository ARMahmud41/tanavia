'use client';

export function AnnouncementBar() {
  const ANNOUNCEMENTS = [
    '🚚 Free delivery over ৳5,000',
    '💵 Cash on Delivery Available',
    '↩️ 7-day easy return',
    '✨ New arrivals every week',
  ];

  return (
    <div className="bg-[#7A293B] text-white py-2 overflow-hidden relative flex items-center">
      <div className="flex whitespace-nowrap animate-marquee-slow">
        {/* প্রথম সেট */}
        <div className="flex items-center gap-16 px-8">
          {ANNOUNCEMENTS.map((msg, i) => (
            <span key={i} className="text-xs sm:text-sm font-medium flex items-center gap-2">
              {msg}
            </span>
          ))}
        </div>
        
        {/* দ্বিতীয় সেট (লুপ হওয়ার জন্য) */}
        <div className="flex items-center gap-16 px-8" aria-hidden="true">
          {ANNOUNCEMENTS.map((msg, i) => (
            <span key={`dup-${i}`} className="text-xs sm:text-sm font-medium flex items-center gap-2">
              {msg}
            </span>
          ))}
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes marqueeSlow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-slow {
          animation: marqueeSlow 35s linear infinite; /* 🟢 35s দেওয়া হয়েছে একদম স্লো হওয়ার জন্য */
        }
        .animate-marquee-slow:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}