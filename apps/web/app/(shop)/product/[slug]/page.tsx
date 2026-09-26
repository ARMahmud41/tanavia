import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { tk, sellPrice } from '@/lib/format';

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

  const finalPrice = sellPrice(product.price, product.discount);
  const hasDiscount = product.discount > 0;
  const totalStock = product.variants.reduce((s, v) => s + v.qty, 0);

  const colors = [...new Set(product.variants.map((v) => v.color))];
  const sizes = [...new Set(product.variants.map((v) => v.size))];

  return (
    <div className="container-wrap py-10">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-[3/4] bg-sand rounded overflow-hidden mb-3">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                No image
              </div>
            )}
          </div>
        </div>

        <div>
          {product.category && (
            <div className="text-xs text-muted uppercase tracking-wide mb-2">
              {product.category}
            </div>
          )}
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-ink mb-3">
            {product.name}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted mb-5">
            <span>
              ⭐ {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
            <span>•</span>
            <span>{product.soldCount} sold</span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-wine font-semibold text-3xl">
              {tk(finalPrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-muted text-lg line-through">
                  {tk(product.price)}
                </span>
                <span className="bg-wine/10 text-wine text-sm font-semibold px-2 py-1 rounded">
                  -{product.discount}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="text-muted mb-6 leading-relaxed">
              {product.description}
            </p>
          )}

          {colors.length > 0 && (
            <div className="mb-5">
              <div className="text-sm font-medium mb-2">
                Color: <span className="text-muted">{colors[0]}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="px-3 py-1.5 border border-line rounded text-sm hover:border-wine transition"
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium mb-2">Size</div>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((size) => (
                  <button
                    key={size}
                    className="px-4 py-2 border border-line rounded text-sm hover:border-wine transition"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm mb-6">
            {totalStock > 0 ? (
              <span className="text-leaf">
                ✓ In stock ({totalStock} available)
              </span>
            ) : (
              <span className="text-wine">✗ Stock out</span>
            )}
            {product.tryable && (
              <span className="ml-4 text-muted">• Try Room available</span>
            )}
          </div>

          <div className="flex gap-3 mb-6">
            <button
              className="btn flex-1 justify-center"
              disabled={totalStock === 0}
            >
              Add to Cart
            </button>
            <button className="btn btn-ghost">♡</button>
          </div>

          <div className="text-xs text-muted border-t border-line pt-4">
            SKU: {product.sku}
          </div>
        </div>
      </div>
    </div>
  );
}