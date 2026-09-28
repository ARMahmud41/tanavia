import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductView } from '@/components/ProductView';

interface Variant {
  id: string;
  size: string;
  color: string;
  qty: number;
  reserved: number;
}

interface Product {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  description?: string | null;
  category: string | null;
  brand?: string | null;
  sku: string;
  price: number | string;
  discount: number;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  tryable: boolean;
  shape: string;
  variants: Variant[];
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await api.get<Product>(`/api/products/slug/${slug}`);
    return res.data || null;
  } catch {
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  return (
    <div className="container-wrap py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-6">
        <Link href="/" className="hover:text-wine">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-wine">
          Products
        </Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/products?category=${product.category.toLowerCase()}`}
              className="hover:text-wine"
            >
              {product.category}
            </Link>
          </>
        )}
      </div>

      {/* Product view (client component — handles gallery, variants, add to cart) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        <ProductView product={product} />
      </div>
    </div>
  );
}