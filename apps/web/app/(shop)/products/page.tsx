'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductCard, type Product } from '@/components/ProductCard';

// ============================================
// Constants — only TOP categories (no fake sub data)
// ============================================
const TOP_CATEGORIES = [
  { name: 'Men', slug: 'men', color: 'bg-blue-500', textColor: 'text-white' },
  { name: 'Women', slug: 'women', color: 'bg-pink-500', textColor: 'text-white' },
  { name: 'Kids', slug: 'kids', color: 'bg-emerald-500', textColor: 'text-white' },
  { name: 'Accessories', slug: 'accessories', color: 'bg-purple-500', textColor: 'text-white' },
];

const SORTS = [
  { value: 'new', label: 'Newest' },
  { value: 'lh', label: 'Price ↑' },
  { value: 'hl', label: 'Price ↓' },
  { value: 'disc', label: 'Discount' },
];

// ============================================
// Page
// ============================================
export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get('category') || 'All';
  const activeSub = searchParams.get('q') || '';
  const activeOffer = searchParams.get('offer') || '';
  const activeSort = searchParams.get('sort') || 'new';
  const searchQuery = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string>('men');
  const [specialOffers, setSpecialOffers] = useState<
    Array<{ id: string; label: string; slug: string }>
  >([]);

  const activeTopCat = TOP_CATEGORIES.find(
    (c) => c.slug.toLowerCase() === activeCategory.toLowerCase()
  );

  // ============================================
  // Fetch products
  // ============================================
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', '24');
      if (activeCategory !== 'All') qs.set('category', activeCategory);
      if (activeSort) qs.set('sort', activeSort);
      if (searchQuery) qs.set('search', searchQuery);
      if (activeOffer) qs.set('offer', activeOffer);

      const res = await api.get<Product[]>(
        `/api/products?${qs.toString()}`
      );
      setProducts(res.data || []);
      setPagination(res.pagination || null);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeSort, searchQuery, activeOffer, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Load special offers from site content
  useEffect(() => {
    async function loadOffers() {
      try {
        const res = await api.get<any>('/api/site/content');
        if (res.data?.specialOffers?.length) {
          setSpecialOffers(res.data.specialOffers);
        }
      } catch {
        // keep empty
      }
    }
    loadOffers();
  }, []);

  // Auto-expand active category
  useEffect(() => {
    if (activeTopCat) setExpandedCat(activeTopCat.slug);
  }, [activeTopCat]);

  // ============================================
  // REAL subcategories derived from loaded products' tags
  // ============================================
  const realSubCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p: any) => {
      (p.tags || []).forEach((tag: string) => {
        const clean = tag.trim().toLowerCase();
        if (!clean) return;
        counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([label, count]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        slug: label,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // ============================================
  // Navigate helpers
  // ============================================
  function categoryHref(slug: string) {
    return slug === 'All' ? '/products' : `/products?category=${slug}`;
  }

  function subHref(catSlug: string, sub: string) {
    return `/products?category=${catSlug}&q=${sub}`;
  }

  function sortHref(value: string) {
    const qs = new URLSearchParams();
    if (activeCategory !== 'All') qs.set('category', activeCategory);
    if (searchQuery) qs.set('q', searchQuery);
    if (activeOffer) qs.set('offer', activeOffer);
    qs.set('sort', value);
    return `/products?${qs.toString()}`;
  }

  // ============================================
  // Clear — remove ALL filters + reset
  // ============================================
  function clearAll() {
    setPage(1);
    router.push('/products');
  }

  // Clear only the subcategory (q) but keep category
  function clearSub() {
    setPage(1);
    const qs = new URLSearchParams();
    if (activeCategory !== 'All') qs.set('category', activeCategory);
    if (activeOffer) qs.set('offer', activeOffer);
    const q = qs.toString();
    router.push(q ? `/products?${q}` : '/products');
  }

  // Clear only the offer but keep category/q
  function clearOffer() {
    setPage(1);
    const qs = new URLSearchParams();
    if (activeCategory !== 'All') qs.set('category', activeCategory);
    if (searchQuery) qs.set('q', searchQuery);
    const q = qs.toString();
    router.push(q ? `/products?${q}` : '/products');
  }

  // ============================================
  // Sidebar content
  // ============================================
  const SidebarContent = (
    <>
      {/* Special Offers */}
      <div className="mb-5">
        <h3 className="text-sm font-bold text-red-600 mb-3">
          Special Offers
        </h3>
        <ul className="space-y-0.5">
          {specialOffers.map((offer) => {
            const isOfferActive =
              activeOffer.toLowerCase() === offer.slug.toLowerCase();
            return (
              <li key={offer.slug}>
                <Link
                  href={`/products?offer=${offer.slug}`}
                  onClick={() => setMobileFiltersOpen(false)}
                  className={`flex items-center gap-2 py-1.5 px-2 text-sm transition rounded ${
                    isOfferActive
                      ? 'text-wine font-semibold bg-wine/5'
                      : 'text-ink hover:text-wine'
                  }`}
                >
                  <span className="text-amber-500 text-xs">⚡</span>
                  <span>{offer.label}</span>
                </Link>
              </li>
            );
          })}
          {specialOffers.length === 0 && (
            <li className="text-xs text-muted px-2 py-1.5">
              No offers yet
            </li>
          )}
        </ul>
      </div>

      {/* Categories */}
      <div className="border-t border-line pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink">Categories</h3>
          <button
            onClick={clearAll}
            className="text-xs text-red-600 hover:underline font-medium"
          >
            Clear
          </button>
        </div>

        <ul className="space-y-0.5">
          {TOP_CATEGORIES.map((cat) => {
            const isActive =
              activeCategory.toLowerCase() === cat.slug.toLowerCase();
            const isExpanded = expandedCat === cat.slug;

            return (
              <li key={cat.slug}>
                <div className="flex items-center">
                  <Link
                    href={categoryHref(cat.slug)}
                    onClick={() => setMobileFiltersOpen(false)}
                    className={`flex-1 flex items-center py-2 px-3 text-sm rounded transition ${
                      isActive
                        ? 'bg-wine/10 text-wine font-semibold'
                        : 'text-ink hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isExpanded ? '' : cat.slug)}
                    className="w-7 h-7 flex items-center justify-center text-muted hover:text-wine"
                    aria-label="Toggle"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>

                {/* Real subcategories from products (only when this category is active + expanded) */}
                {isExpanded && isActive && realSubCategories.length > 0 && (
                  <ul className="mt-1 mb-2 space-y-0.5">
                    {realSubCategories.map((sub) => {
                      const isSubActive =
                        activeSub.toLowerCase() === sub.slug.toLowerCase();
                      return (
                        <li key={sub.slug}>
                          <Link
                            href={subHref(cat.slug, sub.slug)}
                            onClick={() => setMobileFiltersOpen(false)}
                            className={`flex items-center justify-between py-1.5 px-3 pl-6 text-xs rounded transition ${
                              isSubActive
                                ? 'text-wine font-semibold bg-wine/5'
                                : 'text-muted hover:text-wine hover:bg-[#F7F8FA]'
                            }`}
                          >
                            <span>{sub.label}</span>
                            <span className="text-[10px] text-muted">
                              {sub.count}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );

  return (
    <div className="w-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-6">
              {SidebarContent}
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0">
            {/* Search */}
            <div className="mb-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.querySelector(
                    'input'
                  ) as HTMLInputElement;
                  const q = input?.value.trim();
                  if (q) router.push(`/products?q=${encodeURIComponent(q)}`);
                }}
                className="relative"
              >
                <input
                  type="text"
                  defaultValue={searchQuery}
                  placeholder="Search a product"
                  className="w-full rounded-full border border-line bg-white px-12 py-3 text-sm outline-none focus:border-wine transition"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </form>
            </div>

            {/* Mobile filter toggle */}
            <div className="lg:hidden mb-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-line rounded-lg text-sm font-medium"
              >
                <span className="flex items-center gap-2">
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
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                  </svg>
                  Filters & Categories
                </span>
                <span className="text-wine font-semibold">
                  {activeCategory !== 'All' ? activeCategory : 'Show'}
                </span>
              </button>

              {mobileFiltersOpen && (
                <div className="mt-3 p-4 bg-white border border-line rounded-lg">
                  {SidebarContent}
                </div>
              )}
            </div>

            {/* Category pills — NO emoji */}
            <div className="flex flex-wrap gap-2 mb-3">
              {TOP_CATEGORIES.map((cat) => {
                const isActive =
                  activeCategory.toLowerCase() === cat.slug.toLowerCase();
                return (
                  <Link
                    key={cat.slug}
                    href={categoryHref(cat.slug)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                      isActive
                        ? `${cat.color} ${cat.textColor} border-transparent shadow-sm`
                        : 'bg-white border-line text-ink hover:border-wine'
                    }`}
                  >
                    {cat.name}
                  </Link>
                );
              })}
            </div>

            {/* Subcategory chips — real from products */}
            {activeTopCat && realSubCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-line">
                {realSubCategories.map((sub) => {
                  const isSubActive =
                    activeSub.toLowerCase() === sub.slug.toLowerCase();
                  return (
                    <Link
                      key={sub.slug}
                      href={subHref(activeTopCat.slug, sub.slug)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap border ${
                        isSubActive
                          ? 'bg-wine/10 text-wine border-wine/30'
                          : 'bg-white border-line text-ink hover:border-wine'
                      }`}
                    >
                      {sub.label}{' '}
                      <span
                        className={`ml-0.5 text-[10px] ${
                          isSubActive ? 'text-wine/70' : 'text-muted'
                        }`}
                      >
                        {sub.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Breadcrumb + sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {/* Offer badge */}
                {activeOffer && (
                  <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                    <span className="text-amber-500 text-xs">⚡</span>
                    <span className="text-amber-900 font-semibold capitalize">
                      {activeOffer.replace(/-/g, ' ')}
                    </span>
                    <button
                      onClick={clearOffer}
                      className="ml-1 w-3.5 h-3.5 flex items-center justify-center text-amber-700 hover:text-red-600"
                      aria-label="Clear offer"
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                )}

                {activeCategory !== 'All' ? (
                  <div className="inline-flex items-center gap-1.5 bg-[#F1F3F6] rounded px-2.5 py-1.5">
                    <span className="text-ink font-medium capitalize">
                      {activeCategory}
                    </span>
                    {activeSub && (
                      <>
                        <span className="text-muted">›</span>
                        <span className="text-wine font-semibold">
                          {activeSub}
                        </span>
                      </>
                    )}
                    <button
                      onClick={activeSub ? clearSub : clearAll}
                      className="ml-1 w-3.5 h-3.5 flex items-center justify-center text-muted hover:text-red-600"
                      aria-label="Clear filter"
                    >
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  !activeOffer && (
                    <span className="text-muted text-xs">
                      {pagination?.total || 0} products
                    </span>
                  )
                )}

                {(activeCategory !== 'All' || searchQuery || activeOffer) && (
                  <button
                    onClick={clearAll}
                    className="text-muted hover:text-red-600 underline text-xs"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted mr-1">Sort:</span>
                {SORTS.map((s) => (
                  <Link
                    key={s.value}
                    href={sortHref(s.value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      activeSort === s.value
                        ? 'bg-wine text-white'
                        : 'bg-white border border-line text-muted hover:border-wine'
                    }`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Products grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] bg-[#F1F3F6] rounded animate-pulse"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-sand rounded-lg border border-line">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-serif text-xl font-semibold text-ink mb-2">
                  No products found
                </p>
                <p className="text-sm text-muted mb-5">
                  {activeOffer
                    ? `No products match this offer.`
                    : activeSub
                    ? `No products match "${activeSub}"`
                    : 'Try a different filter or browse all products.'}
                </p>
                <button onClick={clearAll} className="btn text-sm">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-line bg-white text-ink hover:border-wine disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <span className="text-sm text-muted px-3">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-line bg-white text-ink hover:border-wine disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}