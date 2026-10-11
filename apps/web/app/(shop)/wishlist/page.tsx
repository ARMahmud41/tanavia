'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'tanavia_wishlist';

interface WishlistItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  addedAt: number;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem('tanavia_wishlist');
        const parsed = raw ? JSON.parse(raw) : [];
        setItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();

    // Listen for changes (when user adds/removes from product pages)
    window.addEventListener('wishlist-change', load);
    window.addEventListener('storage', load);

    return () => {
      window.removeEventListener('wishlist-change', load);
      window.removeEventListener('storage', load);
    };
  }, []);

  function save(next: WishlistItem[]) {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleRemove(id: string) {
    save(items.filter((i) => i.id !== id));
  }

  function handleClear() {
    if (!confirm('Clear your entire wishlist?')) return;
    save([]);
  }

  return (
    <div className="container-wrap px-4 sm:px-6 py-12 sm:py-16 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <p className="text-wine text-xs tracking-[0.3em] uppercase mb-3 font-semibold">
          Saved items
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink mb-4">
          My Wishlist
        </h1>
        <div className="w-16 h-0.5 bg-wine mx-auto" />
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted py-12">Loading...</div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="bg-white border border-line rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🤍</div>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Save your favourite items while browsing and find them here later.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 btn text-sm"
          >
            Browse Products
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
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-muted">
              {items.length} item{items.length !== 1 ? 's' : ''} saved
            </p>
            <button
              onClick={handleClear}
              className="text-xs text-red-600 hover:underline font-medium"
            >
              Clear all
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-white border border-line rounded-lg overflow-hidden hover:border-wine transition"
              >
                <Link href={`/product/${item.slug}`} className="block">
                  <div className="aspect-[3/4] bg-sand overflow-hidden relative">
                    {item.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-ink line-clamp-1 group-hover:text-wine transition">
                      {item.name}
                    </h3>
                    <p className="text-wine font-semibold text-sm mt-1">
                      ৳{item.price.toLocaleString()}
                    </p>
                  </div>
                </Link>

                <div className="px-3 pb-3">
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="w-full text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded py-1.5 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Continue shopping */}
      {items.length > 0 && (
        <div className="text-center mt-10">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 border border-wine text-wine px-6 py-3 rounded text-sm font-semibold hover:bg-wine hover:text-white transition"
          >
            Continue Shopping
          </Link>
        </div>
      )}
    </div>
  );
}