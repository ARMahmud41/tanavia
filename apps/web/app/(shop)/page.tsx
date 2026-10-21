export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard, type Product } from '@/components/ProductCard';
import { CategoryCircles } from '@/components/CategoryCircles';

interface Drop {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerUrl?: string | null;
  status: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  bannerTitle?: string | null;
  bannerSubtitle?: string | null;
  bannerImage?: string | null;
  bannerColor?: string | null;
}

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await api.get<Product[]>('/api/products?limit=12');
    return res.data || [];
  } catch { return []; }
}

async function getActiveDrops(): Promise<Drop[]> {
  try {
    const res = await api.get<Drop[]>('/api/drops?active=true&limit=3');
    return res.data || [];
  } catch { return []; }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await api.get<Category[]>('/api/categories');
    return res.data || [];
  } catch { return []; }
}

async function getCategoryProducts(slug: string): Promise<Product[]> {
  try {
    const res = await api.get<Product[]>(`/api/products?category=${slug}&limit=7`);
    return res.data || [];
  } catch { return []; }
}

const GRADIENTS = [
  'from-[#2C1A1D] to-[#5B2C36]',
  'from-[#1F2A44] to-[#344A6B]',
  'from-[#29342E] to-[#4A5E53]',
  'from-[#4A3A32] to-[#70594C]',
  'from-[#322B3D] to-[#5A4D6D]',
];

export default async function ShopHomePage() {
  const [products, drops, categories] = await Promise.all([
    getFeaturedProducts(),
    getActiveDrops(),
    getCategories(),
  ]);

  const showcaseData = await Promise.all(
    categories.map(async (cat) => {
      const catProducts = await getCategoryProducts(cat.slug);
      return { category: cat, products: catProducts };
    })
  );

  const activeShowcases = showcaseData
    .filter((data) => data.products.length > 0)
    .slice(0, 6);

  return (
    <div className="bg-white">
      {/* 1. Hero Banner */}
      <section className="relative w-full overflow-hidden">
        <Link href="/products" className="block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/banners/hero-banner.jpg"
            alt="TANAVIA"
            className="w-full h-auto object-cover min-h-[350px] md:min-h-[500px]"
          />
        </Link>
      </section>

      {/* 2. Category Circles */}
      <section className="py-8 md:py-10 bg-white">
        <div className="container-wrap px-4 sm:px-6 max-w-7xl mx-auto">
          <CategoryCircles />
        </div>
      </section>

      {/* 3. New Arrival Section */}
      <section className="bg-[#FAF3EA] py-12 md:py-16">
        <div className="container-wrap px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-wine mb-2 uppercase tracking-wide">
              New Arrival
            </h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-5">
            {products.slice(0, 12).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. New Drops */}
      {drops.length > 0 && (
        <section className="bg-[#1A1A1A] py-16 text-white">
          <div className="container-wrap px-4 sm:px-6 max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-serif text-2xl sm:text-4xl font-semibold text-white">Limited Drops</h2>
                <p className="text-gray-400 text-sm mt-2">Exclusive collections, limited stock</p>
              </div>
              <Link href="/drops" className="text-white text-sm font-bold hover:text-[#E8EBF0] underline pb-1">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {drops.map((drop) => (
                <Link
                  key={drop.id}
                  href={`/drops/${drop.slug}`}
                  className="group block bg-[#222222] rounded-2xl border border-white/10 overflow-hidden hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"
                >
                  <div className="aspect-[4/3] bg-[#111111] overflow-hidden relative">
                    {drop.bannerUrl ? (
                      <img
                        src={drop.bannerUrl}
                        alt={drop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-serif text-3xl text-white/20">{drop.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl font-semibold text-white group-hover:text-[#E8EBF0] transition">
                      {drop.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Dynamic Category Showcases */}
      <div className="bg-[#FAFAFA]">
        {activeShowcases.map(({ category, products: catProducts }, index) => (
          <section
            key={category.id}
            className="container-wrap px-4 sm:px-6 max-w-7xl mx-auto py-16 border-b border-gray-200/60 last:border-0"
          >
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ink capitalize">
                  {category.bannerTitle || `${category.name}'s Collection`}
                </h2>
                <p className="text-sm text-gray-500 mt-2">Handpicked styles for you</p>
              </div>
              <Link
                href={`/products?category=${category.slug}`}
                className="hidden sm:inline-block text-wine text-sm font-bold hover:underline"
              >
                View Collection →
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Banner */}
              <div
                className={`lg:col-span-1 rounded-3xl overflow-hidden relative flex flex-col justify-end p-8 min-h-[400px] bg-gradient-to-br ${
                  GRADIENTS[index % GRADIENTS.length]
                } shadow-lg`}
              >
                {category.bannerImage && (
                  <>
                    <img
                      src={category.bannerImage}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                  </>
                )}
                
                <div className="relative z-20">
                  <h3 className="font-serif text-3xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
                    {category.bannerSubtitle || `Elevate your ${category.name} wardrobe.`}
                  </h3>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="inline-flex items-center gap-2 mt-6 bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-white hover:text-ink transition duration-300 shadow-lg"
                  >
                    Shop Now
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Right Products */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {catProducts.slice(0, 7).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
                <Link
                  href={`/products?category=${category.slug}`}
                  className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-ink hover:text-wine hover:border-wine transition-all duration-300 group min-h-[250px] shadow-sm hover:shadow-md"
                >
                  <span className="text-sm font-bold mb-4 tracking-widest uppercase">View All</span>
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-wine/5 transition">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="group-hover:translate-x-1 transition-transform"
                    >
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* 6. Trust Badges */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="container-wrap px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center gap-4 group">
              <div className="w-16 h-16 rounded-full bg-[#FAF3EA] flex items-center justify-center text-3xl group-hover:scale-110 transition duration-300">🚚</div>
              <div>
                <div className="text-base font-bold text-ink mb-1">Fast Delivery</div>
                <div className="text-sm text-gray-500">All over Bangladesh</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-4 group">
              <div className="w-16 h-16 rounded-full bg-[#FAF3EA] flex items-center justify-center text-3xl group-hover:scale-110 transition duration-300">↩️</div>
              <div>
                <div className="text-base font-bold text-ink mb-1">7 Days Return</div>
                <div className="text-sm text-gray-500">Hassle-free exchange</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-4 group">
              <div className="w-16 h-16 rounded-full bg-[#FAF3EA] flex items-center justify-center text-3xl group-hover:scale-110 transition duration-300">🔒</div>
              <div>
                <div className="text-base font-bold text-ink mb-1">Secure Payment</div>
                <div className="text-sm text-gray-500">100% protected</div>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-4 group">
              <div className="w-16 h-16 rounded-full bg-[#FAF3EA] flex items-center justify-center text-3xl group-hover:scale-110 transition duration-300">💬</div>
              <div>
                <div className="text-base font-bold text-ink mb-1">24/7 Support</div>
                <div className="text-sm text-gray-500">We are here to help</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Premium CTA Band */}
      <section className="relative bg-[#7A293B] text-white overflow-hidden mt-8 border-t border-white/10">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        
        <div className="container-wrap px-4 sm:px-6 max-w-7xl mx-auto py-20 md:py-24 text-center relative z-10">
          <h2 className="font-serif text-3xl sm:text-5xl font-semibold mb-6">
            Ready to upgrade your style?
          </h2>
          <p className="text-base sm:text-lg text-white/80 mb-10 max-w-lg mx-auto font-light">
            Explore our full collection and find your new favorites today.
          </p>
          <Link
            href="/products"
            className="inline-block bg-white text-[#7A293B] font-bold text-sm tracking-wide uppercase px-10 py-4 rounded-full hover:bg-[#FAF3EA] transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95"
          >
            Browse All Products
          </Link>
        </div>
      </section>
    </div>
  );
}