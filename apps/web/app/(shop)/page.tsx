import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard, type Product } from '@/components/ProductCard';

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
      {/* Hero */}
      <section className="bg-gradient-to-b from-sand to-cream py-20 text-center">
        <div className="container-wrap">
          <p className="text-wine text-sm tracking-[0.3em] uppercase mb-4">
            New Season
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold text-wine mb-4">
            TANAVIA
          </h1>
          <p className="text-muted text-lg mb-8 max-w-lg mx-auto">
            Fashion, lifestyle, you. Premium quality, fast delivery across
            Bangladesh.
          </p>
          <Link href="/products" className="btn">
            Shop Now
          </Link>
        </div>
      </section>

      {/* Drops */}
      {drops.length > 0 && (
        <section className="container-wrap py-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-ink">
                New Drops
              </h2>
              <p className="text-muted text-sm mt-1">
                Fresh arrivals, limited stock
              </p>
            </div>
            <Link
              href="/drops"
              className="text-wine text-sm font-medium hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

                  {/* Status badge */}
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
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-ink group-hover:text-wine transition">
                    {drop.name}
                  </h3>
                  {drop.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-2">
                      {drop.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container-wrap py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-ink">
              Featured
            </h2>
            <p className="text-muted text-sm mt-1">Hand-picked for you</p>
          </div>
          <Link
            href="/products"
            className="text-wine text-sm font-medium hover:underline"
          >
            View all →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-line rounded p-12 text-center">
            <p className="text-muted">
              No products yet. Admin panel থেকে product add করুন।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}