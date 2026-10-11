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

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const res = await api.get<Product[]>('/api/products?limit=8');
    return res.data || [];
  } catch {
    return [];
  }
}

async function getActiveDrops(): Promise<Drop[]> {
  try {
    const res = await api.get<Drop[]>('/api/drops?active=true&limit=3');
    return res.data || [];
  } catch {
    return [];
  }
}

export default async function ShopHomePage() {
  const [products, drops] = await Promise.all([
    getFeaturedProducts(),
    getActiveDrops(),
  ]);

  return (
    <div>
      {/* ============================================ */}
      {/* Hero — full-width banner */}
      {/* ============================================ */}
      <section className="relative w-full overflow-hidden">
        <Link href="/products" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/banners/hero-banner.jpg"
            alt="TANAVIA — Style in Every Step"
            className="w-full h-auto block"
          />
        </Link>
      </section>

      {/* ============================================ */}
      {/* Category circles */}
      {/* ============================================ */}
      <CategoryCircles />

      {/* ============================================ */}
      {/* New Drops */}
      {/* ============================================ */}
      {drops.length > 0 && (
        <section className="container-wrap px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-end justify-between mb-5 sm:mb-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-ink">
                New Drops
              </h2>
              <p className="text-muted text-xs sm:text-sm mt-1">
                Fresh arrivals, limited stock
              </p>
            </div>
            <Link
              href="/drops"
              className="text-wine text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {drops.map((drop) => (
              <Link
                key={drop.id}
                href={`/drops/${drop.slug}`}
                className="group block bg-white rounded border border-line overflow-hidden hover:shadow-card transition"
              >
                <div className="aspect-video bg-sand overflow-hidden relative">
                  {drop.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={drop.bannerUrl}
                      alt={drop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-serif text-3xl text-wine/40">
                        {drop.name}
                      </span>
                    </div>
                  )}

                  {drop.status === 'LIVE' && (
                    <span className="absolute top-3 right-3 bg-leaf text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {drop.status === 'SCHEDULED' && (
                    <span className="absolute top-3 right-3 bg-gold text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      SOON
                    </span>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-semibold text-base sm:text-lg text-ink group-hover:text-wine transition">
                    {drop.name}
                  </h3>
                  {drop.description && (
                    <p className="text-xs sm:text-sm text-muted mt-1 line-clamp-2">
                      {drop.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* Featured Products — reference style */}
      {/* ============================================ */}
      <section className="container-wrap px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-20">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-wine text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 font-semibold">
            Hand-picked
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-ink mb-3">
            Featured
          </h2>
          <div className="w-16 h-0.5 bg-wine mx-auto mb-3" />
          <p className="text-muted text-sm sm:text-base max-w-md mx-auto">
            Our most-loved pieces, curated for you
          </p>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-line rounded p-10 sm:p-12 text-center">
            <p className="text-muted text-sm">
              No products yet. Add products from the admin panel.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <div className="text-center mt-8 sm:mt-10">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 border border-wine text-wine px-6 py-3 rounded text-sm font-semibold hover:bg-wine hover:text-white transition"
              >
                View All Products
                <svg
                  width="16"
                  height="16"
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
          </>
        )}
      </section>

      {/* Spacer — gap between Featured and CTA */}
      <div className="h-12 sm:h-16 lg:h-20" aria-hidden="true" />

      {/* ============================================ */}
      {/* CTA band */}
      {/* ============================================ */}
      <section className="bg-wine text-white">
        <div className="container-wrap px-4 sm:px-6 py-10 sm:py-14 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-3">
            Ready to shop?
          </h2>
          <p className="text-sm sm:text-base text-white/80 mb-6 max-w-md mx-auto">
            Explore our full collection — fashion, lifestyle, you.
          </p>
          <Link
            href="/products"
            className="inline-block bg-white text-wine font-semibold text-sm px-6 py-3 rounded hover:bg-sand transition"
          >
            Browse all products
          </Link>
        </div>
      </section>
    </div>
  );
}