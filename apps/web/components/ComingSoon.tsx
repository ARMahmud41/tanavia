import Link from 'next/link';

export function ComingSoon({ title = 'Coming Soon' }: { title?: string }) {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-[#FAFAFA]">
      <div className="w-24 h-24 bg-white shadow-sm rounded-full flex items-center justify-center text-5xl mb-6">
        🛍️
      </div>
      
      <h1 className="font-serif text-4xl md:text-5xl font-semibold text-ink mb-4">
        {title}
      </h1>
      
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
        We are working hard to bring this collection to you. Our team is currently adding new products and updates. Please check back soon!
      </p>
      
      <Link
        href="/products"
        className="inline-flex items-center gap-2 bg-[#7A293B] text-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-[#6A2333] transition duration-300 shadow-md hover:shadow-lg active:scale-95"
      >
        Continue Shopping
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}