import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard, type Product } from '@/components/ProductCard';

interface SearchParams {
  category?: string;
  sort?: string;
  q?: string;
  page?: string;
}

async function getProducts(params: SearchParams): Promise<{
  products: Product[];
  total: number;
}> {
  try {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.sort) qs.set('sort', params.sort);
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', params.page);
    qs.set('limit', '24');

    const res = await api.get<Product[]>(`/api/products?${qs.toString()}`);
    return {
      products: res.data || [],
      total: res.pagination?.total || 0,
    };
  } catch {
    return { products: [], total: 0 };
  }
}

const CATEGORIES = ['Men', 'Women', 'Kids', 'Accessories'];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { products, total } = await getProducts(params);
  const activeCategory = params.category || 'All';
  const activeSort = params.sort || 'newest';

  return (
    <div className="container-wrap py-10">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-semibold text-ink mb-2">
          {activeCategory === 'All' ? 'All Products' : activeCategory}
        </h1>
        <p className="text-muted text-sm">
          {total} {total === 1 ? 'product' : 'products'} found
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-line">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products"
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeCategory === 'All'
                ? 'bg-wine text-white'
                : 'bg-white border border-line text-ink hover:border-wine'
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/products?category=${cat.toLowerCase()}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-wine text-white'
                  : 'bg-white border border-line text-ink hover:border-wine'
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Sort:</span>
          <div className="flex flex-wrap gap-1">
            {SORTS.map((s) => (
              <Link
                key={s.value}
                href={`/products?${
                  activeCategory !== 'All'
                    ? `category=${activeCategory.toLowerCase()}&`
                    : ''
                }sort=${s.value}`}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
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
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-line rounded p-16 text-center">
          <p className="text-muted mb-4">No products found.</p>
          <Link href="/products" className="btn">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}